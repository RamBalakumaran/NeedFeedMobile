import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';
import client from '../api/client';
import { queueNavigation } from '../navigation/navigationRef';
import { resolveNotificationTarget } from '../utils/notificationNavigation';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

const createNoopSubscription = () => ({
  remove: () => {},
});

const Notifications = IS_EXPO_GO
  ? {
      IosAuthorizationStatus: {
        AUTHORIZED: 'AUTHORIZED',
        PROVISIONAL: 'PROVISIONAL',
        EPHEMERAL: 'EPHEMERAL',
      },
      AndroidImportance: {
        MAX: 5,
      },
      setNotificationHandler: () => {},
      setNotificationChannelAsync: async () => {},
      getPermissionsAsync: async () => ({ granted: false, status: 'denied', ios: { status: null } }),
      requestPermissionsAsync: async () => ({ granted: false, status: 'denied', ios: { status: null } }),
      getDevicePushTokenAsync: async () => null,
      scheduleNotificationAsync: async () => null,
      addPushTokenListener: () => createNoopSubscription(),
      addNotificationReceivedListener: () => createNoopSubscription(),
      addNotificationResponseReceivedListener: () => createNoopSubscription(),
      clearLastNotificationResponseAsync: async () => {},
      getLastNotificationResponseAsync: async () => null,
    }
  : require('expo-notifications');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const SOCKET_URL = (client.defaults.baseURL || '').replace(/\/api\/?$/, '');
const PUSH_TOKEN_STORAGE_KEY = 'devicePushToken';
const LEGACY_PUSH_TOKEN_STORAGE_KEY = 'expoPushToken';
const IOS_GRANTED_STATUSES = new Set([
  Notifications.IosAuthorizationStatus.AUTHORIZED,
  Notifications.IosAuthorizationStatus.PROVISIONAL,
  Notifications.IosAuthorizationStatus.EPHEMERAL,
]);

const normalizeNotificationId = (notification) => (
  String(
    notification?._id
    || notification?.notificationId
    || notification?.data?.notificationId
    || ''
  ).trim()
);

const hasGrantedNotificationPermissions = (permissions) => {
  if (!permissions) {
    return false;
  }

  if (Platform.OS === 'ios') {
    const iosStatus = permissions?.ios?.status;
    return Boolean(permissions.granted || IOS_GRANTED_STATUSES.has(iosStatus));
  }

  return Boolean(permissions.granted || permissions.status === 'granted');
};

export const NotificationContext = createContext();

const normalizeDevicePushToken = (tokenResponse) => {
  const token = typeof tokenResponse?.data === 'string'
    ? tokenResponse.data.trim()
    : '';

  if (!token) {
    return null;
  }

  return {
    token,
    platform: String(Platform.OS || '').toLowerCase(),
    transport: String(tokenResponse?.type || '').toLowerCase(),
  };
};

const isSupportedAndroidPushToken = (normalizedToken) => {
  if (!normalizedToken?.token || normalizedToken.platform !== 'android') {
    return false;
  }

  return !normalizedToken.transport || ['android', 'fcm'].includes(normalizedToken.transport);
};

const ensureNotificationPermissionsAsync = async () => {
  if (!Device.isDevice) {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F25F4C',
    });
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  if (hasGrantedNotificationPermissions(existingPermissions)) {
    return true;
  }

  const requestedPermissions = await Notifications.requestPermissionsAsync();
  return hasGrantedNotificationPermissions(requestedPermissions);
};

const registerForPushNotificationsAsync = async () => {
  if (IS_EXPO_GO) {
    console.log('Remote push notifications require a development build or production app, not Expo Go.');
    return null;
  }

  const hasPermission = await ensureNotificationPermissionsAsync();
  if (!hasPermission) {
    return null;
  }

  try {
    const tokenResponse = await Notifications.getDevicePushTokenAsync();
    const normalizedToken = normalizeDevicePushToken(tokenResponse);

    if (!normalizedToken) {
      return null;
    }

    if (!isSupportedAndroidPushToken(normalizedToken)) {
      console.log('Direct FCM push is currently configured for Android FCM builds in this project.');
      return null;
    }

    return normalizedToken.token;
  } catch (error) {
    console.log('Remote push registration unavailable:', error.message);
    return null;
  }
};

const showLocalBannerAsync = async (notification) => {
  if (!notification?.title || !notification?.body) {
    return;
  }

  try {
    const hasPermission = await ensureNotificationPermissionsAsync();
    if (!hasPermission) {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: {
          notificationId: notification._id,
          type: notification.type,
          ...(notification.data || {}),
        },
        sound: 'default',
      },
      trigger: null,
    });
  } catch (error) {
    console.log('Local notification display failed:', error.message);
  }
};

export const NotificationProvider = ({ children }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const socketRef = useRef(null);
  const activeChatIdRef = useRef(null);
  const notificationListenerRef = useRef(null);
  const pushTokenListenerRef = useRef(null);
  const responseListenerRef = useRef(null);

  const authHeaders = userToken
    ? { Authorization: `Bearer ${userToken}` }
    : undefined;

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const applyReadState = (ids) => {
    const idSet = new Set((ids || []).map(String));
    if (!idSet.size) return;

    setNotifications((prev) => prev.map((item) => (
      idSet.has(String(item._id))
        ? {
            ...item,
            read: true,
            readAt: item.readAt || new Date().toISOString(),
          }
        : item
    )));
  };

  const upsertNotification = (incomingNotification) => {
    const normalizedId = normalizeNotificationId(incomingNotification);
    if (!normalizedId) return;

    setNotifications((prev) => {
      const existingIndex = prev.findIndex((item) => String(item._id) === normalizedId);
      const nextNotification = {
        read: false,
        createdAt: new Date().toISOString(),
        data: {},
        ...incomingNotification,
        _id: normalizedId,
      };

      if (existingIndex === -1) {
        return [nextNotification, ...prev];
      }

      const existingNotification = prev[existingIndex];
      const mergedNotification = {
        ...existingNotification,
        ...nextNotification,
        data: {
          ...(existingNotification?.data || {}),
          ...(nextNotification?.data || {}),
        },
      };

      return [
        mergedNotification,
        ...prev.filter((item, index) => index !== existingIndex),
      ];
    });
  };

  const refreshNotifications = async () => {
    if (!authHeaders) {
      setNotifications([]);
      return;
    }

    try {
      const res = await client.get('/notifications', {
        headers: authHeaders,
      });
      setNotifications(res.data);
    } catch (error) {
      console.log('Notification fetch error:', error.message);
    }
  };

  const savePushToken = async (token, headers) => {
    if (!token || !headers) return;

    try {
      const previousToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
      const legacyToken = await AsyncStorage.getItem(LEGACY_PUSH_TOKEN_STORAGE_KEY);

      if (legacyToken && legacyToken !== token) {
        await AsyncStorage.removeItem(LEGACY_PUSH_TOKEN_STORAGE_KEY);
      }

      if (previousToken && previousToken !== token) {
        try {
          await client.delete('/notifications/push-token', {
            headers,
            data: { token: previousToken },
          });
        } catch (error) {
          console.log('Previous push token cleanup failed:', error.message);
        }
      }

      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
      await client.put('/notifications/push-token', { token }, {
        headers,
      });
    } catch (error) {
      console.log('Push token save failed:', error.message);
    }
  };

  const markAsRead = async (id) => {
    if (!id || !authHeaders) return;

    try {
      await client.put(`/notifications/${id}/read`, {}, {
        headers: authHeaders,
      });
      applyReadState([id]);
    } catch (error) {
      console.log('Notification read failed:', error.message);
    }
  };

  const markAllAsRead = async () => {
    if (!authHeaders) return;

    try {
      await client.put('/notifications/read-all', {}, {
        headers: authHeaders,
      });
      applyReadState(notifications.map((item) => item._id));
    } catch (error) {
      console.log('Notifications read-all failed:', error.message);
    }
  };

  const markNotificationsForRequestAsRead = async (requestId, type = 'chat_message') => {
    if (!requestId || !authHeaders) return;

    const matchingUnread = notifications.filter((item) => (
      !item.read
      && item.type === type
      && String(item?.data?.requestId || '') === String(requestId)
    ));

    if (!matchingUnread.length) return;

    try {
      await Promise.all(matchingUnread.map((item) => (
        client.put(`/notifications/${item._id}/read`, {}, {
          headers: authHeaders,
        })
      )));
      applyReadState(matchingUnread.map((item) => item._id));
    } catch (error) {
      console.log('Request notification read failed:', error.message);
    }
  };

  useEffect(() => {
    if (!userToken || !userInfo?._id || !SOCKET_URL) {
      setNotifications([]);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    refreshNotifications();

    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('registerUser', { userId: userInfo._id });
    });

    socketRef.current.on('notification:new', async (notification) => {
      const notificationRequestId = notification?.data?.requestId
        ? String(notification.data.requestId)
        : null;
      const isActiveChatMessage = (
        notification.type === 'chat_message'
        && activeChatIdRef.current
        && notificationRequestId === activeChatIdRef.current
      );

      if (isActiveChatMessage) {
        await markAsRead(notification._id);
        return;
      }

      upsertNotification(notification);

      if (IS_EXPO_GO && AppState.currentState === 'active') {
        await showLocalBannerAsync(notification);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userInfo?._id, userToken]);

  useEffect(() => {
    if (!userToken || !userInfo?._id) return undefined;

    let cancelled = false;
    const headers = { Authorization: `Bearer ${userToken}` };

    if (IS_EXPO_GO) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (!token || cancelled) return;
      await savePushToken(token, headers);
    })();

    if (pushTokenListenerRef.current) {
      pushTokenListenerRef.current.remove();
      pushTokenListenerRef.current = null;
    }

    pushTokenListenerRef.current = Notifications.addPushTokenListener((tokenResponse) => {
      const normalizedToken = normalizeDevicePushToken(tokenResponse);
      if (!isSupportedAndroidPushToken(normalizedToken)) {
        return;
      }

      savePushToken(normalizedToken.token, headers);
    });

    return () => {
      cancelled = true;
      if (pushTokenListenerRef.current) {
        pushTokenListenerRef.current.remove();
        pushTokenListenerRef.current = null;
      }
    };
  }, [userInfo?._id, userToken]);

  useEffect(() => {
    if (notificationListenerRef.current) {
      notificationListenerRef.current.remove();
      notificationListenerRef.current = null;
    }

    if (!userToken) {
      return undefined;
    }

    notificationListenerRef.current = Notifications.addNotificationReceivedListener((event) => {
      const payload = event?.request?.content?.data || {};

      if (!payload?.notificationId || !payload?.type) {
        return;
      }

      upsertNotification({
        _id: String(payload.notificationId),
        type: payload.type,
        title: event?.request?.content?.title || 'Notification',
        body: event?.request?.content?.body || '',
        data: payload,
        read: false,
        createdAt: new Date().toISOString(),
      });
    });

    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current.remove();
        notificationListenerRef.current = null;
      }
    };
  }, [userToken]);

  useEffect(() => {
    if (responseListenerRef.current) {
      responseListenerRef.current.remove();
      responseListenerRef.current = null;
    }

    if (!userToken || !userInfo?.role) {
      return undefined;
    }

    const openFromPayload = async (payload) => {
      if (!payload?.type) return;

      if (payload.notificationId) {
        await markAsRead(payload.notificationId);
      }

      const target = resolveNotificationTarget(
        { type: payload.type, data: payload },
        userInfo.role
      );
      queueNavigation(target.screen, target.params);

      if (Notifications.clearLastNotificationResponseAsync) {
        try {
          await Notifications.clearLastNotificationResponseAsync();
        } catch (error) {
          console.log('Notification response clear failed:', error.message);
        }
      }
    };

    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = response?.notification?.request?.content?.data || {};
      openFromPayload(payload);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const payload = response?.notification?.request?.content?.data || {};
        if (payload?.type) {
          openFromPayload(payload);
        }
      })
      .catch((error) => {
        console.log('Notification open error:', error.message);
      });

    return () => {
      if (responseListenerRef.current) {
        responseListenerRef.current.remove();
        responseListenerRef.current = null;
      }
    };
  }, [userInfo?.role, userToken]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const value = {
    notifications,
    unreadCount,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    markNotificationsForRequestAsRead,
    setActiveChatId,
    isExpoGo: IS_EXPO_GO,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
