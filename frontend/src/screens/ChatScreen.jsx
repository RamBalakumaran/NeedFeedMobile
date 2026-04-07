import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import client from '../api/client';

const SOCKET_URL = (client.defaults.baseURL || '').replace(/\/api\/?$/, '');
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const COLORS = {
  background: '#E8DDD2',
  mine: '#D9FDD3',
  theirs: '#FFFFFF',
  text: '#1F2937',
  subtle: '#667085',
  accent: '#1F8F43',
  panel: '#F7F7FA',
  border: '#E5E7EB',
  composer: '#FFFFFF',
};
const PLACEHOLDER_COLOR = '#8B97A8';

const EMOJIS = [
  '\u{1F600}',
  '\u{1F602}',
  '\u{1F60D}',
  '\u{1F973}',
  '\u{1F64F}',
  '\u{1F44D}',
  '\u{1F525}',
  '\u{1F49A}',
  '\u{1F44F}',
  '\u{1F60E}',
  '\u{1F91D}',
  '\u{1F372}',
  '\u{1F4CD}',
  '\u{2705}',
];

const GIF_OPTIONS = [
  { id: 'gif-1', url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif' },
  { id: 'gif-2', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
  { id: 'gif-3', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif' },
  { id: 'gif-4', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { id: 'gif-5', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: 'gif-6', url: 'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif' },
];

const getSenderId = (message) => {
  if (!message) return '';
  if (typeof message.senderId === 'object' && message.senderId !== null) {
    return String(message.senderId._id || message.senderId.id || '');
  }
  return String(message.senderId || '');
};

const getSenderMeta = (message) => {
  if (!message) return null;
  if (typeof message.senderId === 'object' && message.senderId !== null) {
    return message.senderId;
  }
  return message.sender || null;
};

const normalizeAttachment = (attachment) => {
  if (!attachment?.url) return null;

  return {
    url: attachment.url,
    publicId: attachment.publicId || '',
    fileName: attachment.fileName || '',
    mimeType: attachment.mimeType || '',
    fileSize: Number(attachment.fileSize || 0),
    resourceType: attachment.resourceType || '',
    width: Number(attachment.width || 0),
    height: Number(attachment.height || 0),
  };
};

const normalizeLocation = (location) => {
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    address: location?.address || '',
    label: location?.label || '',
  };
};

const normalizeMessage = (message) => {
  const attachment = normalizeAttachment(message.attachment);
  const location = normalizeLocation(message.location);

  return {
    ...message,
    _id: String(message._id),
    senderId: getSenderId(message),
    sender: getSenderMeta(message),
    text: message.text || '',
    messageType: message.messageType
      || (attachment ? 'image' : location ? 'location' : message.gifUrl ? 'gif' : 'text'),
    gifUrl: message.gifUrl || '',
    attachment,
    location,
    timestamp: message.timestamp || new Date().toISOString(),
    replyTo: message.replyTo
      ? {
          ...message.replyTo,
          messageId: message.replyTo.messageId ? String(message.replyTo.messageId) : null,
        }
      : null,
    clientMessageId: message.clientMessageId || null,
    isDeleted: Boolean(message.isDeleted),
    editedAt: message.editedAt || null,
    deletedAt: message.deletedAt || null,
  };
};

const upsertMessage = (messages, incomingMessage) => {
  let found = false;

  const nextMessages = messages.map((message) => {
    const matchesByTempId = incomingMessage.clientMessageId && message._id === incomingMessage.clientMessageId;
    const matchesById = message._id === incomingMessage._id;

    if (matchesByTempId || matchesById) {
      found = true;
      return incomingMessage;
    }

    return message;
  });

  return found ? nextMessages : [...nextMessages, incomingMessage];
};

const previewReplyText = (replyTo) => {
  if (!replyTo) return '';
  if (replyTo.messageType === 'gif') return 'GIF';
  if (replyTo.messageType === 'image') return 'Photo';
  if (replyTo.messageType === 'file') return 'File';
  if (replyTo.messageType === 'location') return 'Location';
  return replyTo.text || 'Message';
};

const previewSenderName = (message, currentUserId) => {
  const senderId = getSenderId(message);
  if (senderId && senderId === currentUserId) {
    return 'You';
  }
  const sender = getSenderMeta(message);
  return sender?.name || message.replyTo?.senderName || 'Contact';
};

const getDisplayName = (user) => (
  user?.organizationName || user?.name || 'Contact'
);

const formatMessageTime = (timestamp) => (
  new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
);

const formatBytes = (size) => {
  const value = Number(size || 0);
  if (!value) return '';

  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let nextValue = value;

  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }

  return `${nextValue >= 10 || unitIndex === 0 ? nextValue.toFixed(0) : nextValue.toFixed(1)} ${units[unitIndex]}`;
};

const deriveFileName = (uri, fallbackName) => {
  if (fallbackName) return fallbackName;
  if (!uri) return `attachment-${Date.now()}`;
  const segments = uri.split('/');
  return segments[segments.length - 1]?.split('?')[0] || `attachment-${Date.now()}`;
};

const guessMimeType = (fileName, providedType) => {
  if (providedType) return providedType;

  const extension = String(fileName || '').split('.').pop()?.toLowerCase();
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip',
  };

  return mimeTypes[extension] || 'application/octet-stream';
};

const buildLocationLabel = (location) => (
  location?.label
  || location?.address
  || `${Number(location?.latitude || 0).toFixed(5)}, ${Number(location?.longitude || 0).toFixed(5)}`
);

const buildLocationUrl = (location) => {
  if (!location) return '';
  return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
};

const isEditableMessage = (message) => (
  Boolean(message)
  && !message.isDeleted
  && message.messageType !== 'gif'
);

const SwipeReplyMessage = ({
  item,
  isMine,
  currentUserId,
  onReply,
  onLongPress,
  onOpenAttachment,
  onOpenLocation,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;

  const canOpenAttachment = !item.isDeleted && (item.messageType === 'image' || item.messageType === 'file');
  const canOpenLocation = !item.isDeleted && item.messageType === 'location';
  const hasCaption = !item.isDeleted && item.text;
  const replyEnabled = !item.isDeleted;

  const handlePress = () => {
    if (canOpenAttachment) {
      onOpenAttachment(item);
      return;
    }

    if (canOpenLocation) {
      onOpenLocation(item.location);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => (
        replyEnabled
        && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        && gestureState.dx > 8
      ),
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(Math.min(gestureState.dx, 70));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 55) {
          onReply(item);
        }

        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isMine ? styles.myWrapper : styles.theirWrapper,
        { transform: [{ translateX }] },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable
        onPress={canOpenAttachment || canOpenLocation ? handlePress : undefined}
        onLongPress={() => onLongPress(item)}
        delayLongPress={280}
      >
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          {item.replyTo?.messageId && (
            <View style={[styles.replySnippet, isMine ? styles.replySnippetMine : styles.replySnippetTheirs]}>
              <Text style={styles.replySenderText}>{item.replyTo.senderName || 'Reply'}</Text>
              <Text numberOfLines={1} style={styles.replySnippetText}>
                {previewReplyText(item.replyTo)}
              </Text>
            </View>
          )}

          {item.isDeleted ? (
            <Text style={styles.deletedMessageText}>This message was deleted.</Text>
          ) : item.messageType === 'gif' ? (
            <View>
              <Image source={{ uri: item.gifUrl, cache: 'reload' }} style={styles.gifBubble} resizeMode="cover" />
              {hasCaption ? <Text style={styles.mediaCaption}>{item.text}</Text> : null}
            </View>
          ) : item.messageType === 'image' ? (
            <View>
              <Image source={{ uri: item.attachment?.url, cache: 'reload' }} style={styles.imageBubble} resizeMode="cover" />
              {hasCaption ? <Text style={styles.mediaCaption}>{item.text}</Text> : null}
            </View>
          ) : item.messageType === 'file' ? (
            <View>
              <View style={styles.fileCard}>
                <View style={styles.fileIconCircle}>
                  <Ionicons name="document-text-outline" size={20} color="#2563EB" />
                </View>
                <View style={styles.fileCopy}>
                  <Text numberOfLines={1} style={styles.fileNameText}>
                    {item.attachment?.fileName || 'Attachment'}
                  </Text>
                  <Text style={styles.fileMetaText}>
                    {formatBytes(item.attachment?.fileSize) || 'Tap to open'}
                  </Text>
                </View>
                <Ionicons name="arrow-down-circle-outline" size={20} color="#2563EB" />
              </View>
              {hasCaption ? <Text style={styles.mediaCaption}>{item.text}</Text> : null}
            </View>
          ) : item.messageType === 'location' && item.location ? (
            <View>
              <View style={styles.locationCard}>
                <View style={styles.locationPreviewShell}>
                  <View style={styles.locationIconBadge}>
                    <Ionicons name="location" size={24} color={COLORS.accent} />
                  </View>
                  <View style={styles.locationPreviewCopy}>
                    <Text style={styles.locationPreviewTitle}>Live Location</Text>
                    <Text style={styles.locationPreviewHint}>Tap to open in Google Maps</Text>
                  </View>
                </View>
                <View style={styles.locationCopyRow}>
                  <Ionicons name="location" size={16} color={COLORS.accent} />
                  <Text numberOfLines={3} style={styles.locationLabelText}>
                    {buildLocationLabel(item.location)}
                  </Text>
                </View>
                <Text style={styles.locationCoordsText}>
                  {`${Number(item.location.latitude).toFixed(5)}, ${Number(item.location.longitude).toFixed(5)}`}
                </Text>
              </View>
              {hasCaption ? <Text style={styles.mediaCaption}>{item.text}</Text> : null}
            </View>
          ) : (
            <Text style={styles.messageText}>{item.text}</Text>
          )}

          <View style={styles.messageMetaRow}>
            {!isMine && (
              <Text style={styles.senderMetaText}>
                {previewSenderName(item, currentUserId)}
              </Text>
            )}
            {item.editedAt && !item.isDeleted ? (
              <Text style={styles.editedMetaText}>Edited</Text>
            ) : null}
            <Text style={styles.timeText}>{formatMessageTime(item.timestamp)}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const ChatScreen = ({ route }) => {
  const { requestId, name, status, chatStatus: initialChatStatus } = route.params || {};
  const { userInfo, userToken } = useContext(AuthContext);
  const { markNotificationsForRequestAsRead, setActiveChatId } = useContext(NotificationContext);
  const currentUserId = String(userInfo?._id || userInfo?.id || '');
  const currentRole = userInfo?.role || '';

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [showGifTray, setShowGifTray] = useState(false);
  const [showAttachmentTray, setShowAttachmentTray] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [chatMeta, setChatMeta] = useState({
    foodStatus: status || 'Active',
    chatStatus: initialChatStatus || 'active',
    donor: null,
    requestedBy: null,
    assignedVolunteer: null,
    chatTerminatedAt: null,
    chatTerminatedBy: null,
  });

  const socket = useRef(null);
  const flatListRef = useRef(null);
  const replyTargetRef = useRef(null);
  const editingMessageRef = useRef(null);

  const counterpart = currentRole === 'donor'
    ? chatMeta?.requestedBy
    : currentRole === 'ngo'
      ? chatMeta?.donor
      : chatMeta?.requestedBy || chatMeta?.donor;
  const counterpartName = counterpart ? getDisplayName(counterpart) : (name || 'Chat');
  const volunteerName = chatMeta?.assignedVolunteer ? getDisplayName(chatMeta.assignedVolunteer) : '';
  const isChatTerminated = chatMeta?.chatStatus === 'terminated';
  const resolvedStatus = chatMeta?.foodStatus || status || 'Active';
  const canTerminateChat = (currentRole === 'donor' || currentRole === 'ngo') && !isChatTerminated;
  const canSubmitEdit = editingMessage
    ? (editingMessage.messageType !== 'text' || Boolean(text.trim()))
    : Boolean(text.trim());

  useEffect(() => {
    replyTargetRef.current = replyTarget;
  }, [replyTarget]);

  useEffect(() => {
    editingMessageRef.current = editingMessage;
  }, [editingMessage]);

  useEffect(() => {
    if (!requestId || !currentUserId || !SOCKET_URL) return undefined;

    socket.current = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    const handleIncomingMessage = (incomingMessage) => {
      const normalized = normalizeMessage(incomingMessage);

      setMessages((prev) => upsertMessage(prev, normalized));

      if (replyTargetRef.current?.messageId === normalized._id && normalized.isDeleted) {
        setReplyTarget(null);
      }

      if (editingMessageRef.current?._id === normalized._id && normalized.isDeleted) {
        setEditingMessage(null);
        setText('');
      }
    };

    socket.current.on('connect', () => {
      socket.current.emit('joinChat', { requestId });
    });

    socket.current.on('newMessage', handleIncomingMessage);
    socket.current.on('message:updated', handleIncomingMessage);
    socket.current.on('message:deleted', handleIncomingMessage);

    socket.current.on('chat:terminated', (payload) => {
      setChatMeta((prev) => ({
        ...prev,
        chatStatus: 'terminated',
        chatTerminatedAt: payload?.terminatedAt || prev.chatTerminatedAt,
        chatTerminatedBy: payload?.terminatedBy || prev.chatTerminatedBy,
      }));
    });

    socket.current.on('error_message', (message) => {
      Alert.alert('Chat', message);
    });

    const loadHistory = async () => {
      try {
        const res = await client.get(`/chat/history/${requestId}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        const payload = Array.isArray(res.data)
          ? { messages: res.data, request: null }
          : res.data;

        setMessages((payload.messages || []).map(normalizeMessage));
        if (payload.request) {
          setChatMeta((prev) => ({
            ...prev,
            ...payload.request,
          }));
        }
      } catch (error) {
        console.log('History Error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [currentUserId, requestId, userToken]);

  useEffect(() => {
    if (!requestId) return undefined;
    setActiveChatId(String(requestId));
    markNotificationsForRequestAsRead(String(requestId));
    return () => {
      setActiveChatId(null);
    };
  }, [markNotificationsForRequestAsRead, requestId, setActiveChatId]);

  useEffect(() => {
    if (!messages.length) return;

    const timeoutId = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeoutId);
  }, [messages]);

  useEffect(() => {
    if (!isChatTerminated) return;

    setReplyTarget(null);
    setEditingMessage(null);
    setShowEmojiTray(false);
    setShowGifTray(false);
    setShowAttachmentTray(false);
  }, [isChatTerminated]);

  const closePanels = () => {
    setShowEmojiTray(false);
    setShowGifTray(false);
    setShowAttachmentTray(false);
  };

  const clearComposer = ({ preserveText = false } = {}) => {
    if (!preserveText) {
      setText('');
    }
    setReplyTarget(null);
    setEditingMessage(null);
    closePanels();
  };

  const appendEmoji = (emoji) => {
    setText((prev) => `${prev}${emoji}`);
  };

  const buildReplyPayload = (message) => ({
    messageId: message._id.startsWith('temp-') ? undefined : message._id,
    senderId: message.senderId,
    senderName: previewSenderName(message, currentUserId),
    text: message.text || '',
    messageType: message.messageType || 'text',
    gifUrl: message.gifUrl || '',
  });

  const handleReply = (message) => {
    const replyPayload = buildReplyPayload(message);
    if (!replyPayload.messageId) return;
    setEditingMessage(null);
    setReplyTarget(replyPayload);
    setShowAttachmentTray(false);
    setShowGifTray(false);
  };

  const beginEditing = (message) => {
    if (!isEditableMessage(message)) {
      return;
    }

    setReplyTarget(null);
    setEditingMessage({
      _id: message._id,
      messageType: message.messageType,
    });
    setText(message.text || '');
    closePanels();
  };

  const ensureReadyForAttachmentAction = () => {
    if (editingMessage) {
      Alert.alert('Finish editing first', 'Save or cancel your current edit before sending a new attachment.');
      return false;
    }

    if (isChatTerminated) {
      Alert.alert('Chat', 'This chat was terminated. New messages are disabled.');
      return false;
    }

    return true;
  };

  const openExternalUrl = async (url) => {
    if (!url) return;

    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Open failed', 'Could not open this attachment.');
    }
  };

  const handleOpenAttachment = (message) => {
    openExternalUrl(message?.attachment?.url);
  };

  const handleOpenLocation = (location) => {
    openExternalUrl(buildLocationUrl(location));
  };

  const confirmDeleteMessage = (message) => {
    Alert.alert('Delete message', 'This will delete the message for everyone in this chat.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/chat/messages/${message._id}`, {
              headers: { Authorization: `Bearer ${userToken}` },
            });
          } catch (error) {
            Alert.alert('Error', error?.response?.data?.message || 'Could not delete this message.');
          }
        },
      },
    ]);
  };

  const handleMessageLongPress = (message) => {
    if (message.senderId !== currentUserId || isChatTerminated || message.isDeleted) {
      return;
    }

    const actions = [{ text: 'Cancel', style: 'cancel' }];

    if (isEditableMessage(message)) {
      actions.push({
        text: 'Edit',
        onPress: () => beginEditing(message),
      });
    }

    actions.push({
      text: 'Delete',
      style: 'destructive',
      onPress: () => confirmDeleteMessage(message),
    });

    Alert.alert('Message options', 'Choose an action for this message.', actions);
  };

  const emitMessage = ({ messageType = 'text', gifUrl = '', location = null } = {}) => {
    const trimmedText = text.trim();

    if (editingMessage) {
      return;
    }

    if (isChatTerminated) {
      Alert.alert('Chat', 'This chat was terminated. New messages are disabled.');
      return;
    }

    if (messageType === 'text' && !trimmedText) return;
    if (messageType === 'gif' && !gifUrl) return;
    if (messageType === 'location' && !location) return;
    if (!socket.current) return;

    const tempId = `temp-${Date.now()}`;
    const messageData = {
      requestId,
      senderId: currentUserId,
      text: trimmedText,
      messageType,
      gifUrl,
      location,
      replyTo: replyTarget?.messageId ? replyTarget : undefined,
      clientMessageId: tempId,
    };

    const optimisticMessage = normalizeMessage({
      ...messageData,
      _id: tempId,
      sender: {
        _id: currentUserId,
        name: userInfo?.name,
        role: userInfo?.role,
        profileImage: userInfo?.profileImage,
      },
      timestamp: new Date().toISOString(),
    });

    setMessages((prev) => [...prev, optimisticMessage]);

    socket.current.emit('sendMessage', messageData, (response) => {
      if (!response?.ok || !response?.message) {
        setMessages((prev) => prev.filter((message) => message._id !== tempId));
        Alert.alert('Chat', response?.message || 'Message failed to send.');
        return;
      }

      const confirmed = normalizeMessage(response.message);
      setMessages((prev) => prev.map((message) => (
        message._id === tempId ? confirmed : message
      )));
    });

    clearComposer();
  };

  const saveEditedMessage = async () => {
    if (!editingMessage) return;

    try {
      await client.put(`/chat/messages/${editingMessage._id}`, {
        text: text.trim(),
      }, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      clearComposer();
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not update this message.');
    }
  };

  const validateAttachmentSize = (size) => {
    if (size && size > MAX_ATTACHMENT_SIZE) {
      Alert.alert('File too large', 'Please choose a file smaller than 10 MB.');
      return false;
    }

    return true;
  };

  const uploadAttachmentMessage = async ({ uri, name, mimeType, size, messageType }) => {
    if (!ensureReadyForAttachmentAction()) return;
    if (!validateAttachmentSize(size)) return;

    setUploading(true);
    Keyboard.dismiss();

    try {
      const formData = new FormData();
      formData.append('text', text.trim());
      formData.append('messageType', messageType);

      if (replyTarget?.messageId) {
        formData.append('replyTo', JSON.stringify(replyTarget));
      }

      formData.append('attachment', {
        uri,
        name,
        type: mimeType,
      });

      const res = await client.post(`/chat/upload/${requestId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (res.data?.message) {
        const normalized = normalizeMessage(res.data.message);
        setMessages((prev) => upsertMessage(prev, normalized));
      }

      clearComposer();
    } catch (error) {
      Alert.alert('Upload failed', error?.response?.data?.message || 'Could not send this attachment.');
    } finally {
      setUploading(false);
    }
  };

  const handlePickFromGallery = async () => {
    if (!ensureReadyForAttachmentAction()) return;

    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaStatus !== 'granted') {
      Alert.alert('Permission needed', 'Gallery access is required to send photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    await uploadAttachmentMessage({
      uri: asset.uri,
      name: deriveFileName(asset.uri, asset.fileName || `gallery-${Date.now()}.jpg`),
      mimeType: guessMimeType(asset.fileName || asset.uri, asset.mimeType || 'image/jpeg'),
      size: asset.fileSize,
      messageType: 'image',
    });
  };

  const handleOpenCamera = async () => {
    if (!ensureReadyForAttachmentAction()) return;

    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.75,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    await uploadAttachmentMessage({
      uri: asset.uri,
      name: deriveFileName(asset.uri, asset.fileName || `camera-${Date.now()}.jpg`),
      mimeType: guessMimeType(asset.fileName || asset.uri, asset.mimeType || 'image/jpeg'),
      size: asset.fileSize,
      messageType: 'image',
    });
  };

  const handlePickDocument = async () => {
    if (!ensureReadyForAttachmentAction()) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const fileName = deriveFileName(asset.uri, asset.name || `file-${Date.now()}`);

      await uploadAttachmentMessage({
        uri: asset.uri,
        name: fileName,
        mimeType: guessMimeType(fileName, asset.mimeType),
        size: asset.size,
        messageType: 'file',
      });
    } catch (error) {
      Alert.alert('File picker', 'Could not open the file picker.');
    }
  };

  const handleShareLocation = async () => {
    if (!ensureReadyForAttachmentAction()) return;

    try {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required to share your location.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        address: '',
        label: '',
      };

      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });

        if (place) {
          const addressParts = [
            place.name,
            place.street,
            place.city,
            place.region,
          ].filter(Boolean);

          location.address = addressParts.join(', ');
          location.label = place.city || place.district || place.region || '';
        }
      } catch (error) {
        console.log('Reverse geocode failed:', error.message);
      }

      emitMessage({ messageType: 'location', location });
    } catch (error) {
      Alert.alert('Location', 'Could not fetch your current location.');
    }
  };

  const terminateChat = async () => {
    if (!requestId || terminating) return;

    setTerminating(true);
    try {
      const res = await client.put(`/chat/terminate/${requestId}`, {}, {
        headers: { Authorization: `Bearer ${userToken}` },
      });

      if (res.data?.request) {
        setChatMeta((prev) => ({
          ...prev,
          ...res.data.request,
        }));
      }

      Alert.alert('Chat ended', 'This conversation is now read-only.');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not terminate this chat.');
    } finally {
      setTerminating(false);
    }
  };

  const handleTerminateChat = () => {
    Alert.alert('Terminate Chat', 'This keeps the chat history but stops any new messages. Continue?', [
      { text: 'No' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: terminateChat,
      },
    ]);
  };

  const attachmentActions = [
    {
      key: 'gallery',
      label: 'Gallery',
      icon: 'images-outline',
      tintColor: '#2563EB',
      bgColor: '#EEF4FF',
      onPress: handlePickFromGallery,
    },
    {
      key: 'camera',
      label: 'Camera',
      icon: 'camera-outline',
      tintColor: '#E11D48',
      bgColor: '#FFF1F2',
      onPress: handleOpenCamera,
    },
    {
      key: 'location',
      label: 'Location',
      icon: 'location-outline',
      tintColor: '#059669',
      bgColor: '#ECFDF5',
      onPress: handleShareLocation,
    },
    {
      key: 'files',
      label: 'Files',
      icon: 'document-attach-outline',
      tintColor: '#7C3AED',
      bgColor: '#F5F3FF',
      onPress: handlePickDocument,
    },
    {
      key: 'gifs',
      label: 'GIFs',
      icon: 'sparkles-outline',
      tintColor: '#EA580C',
      bgColor: '#FFF7ED',
      onPress: () => {
        Keyboard.dismiss();
        setShowGifTray(true);
        setShowEmojiTray(false);
        setShowAttachmentTray(false);
      },
    },
  ];

  const renderItem = ({ item }) => {
    const isMine = item.senderId === currentUserId;

    return (
      <SwipeReplyMessage
        item={item}
        isMine={isMine}
        currentUserId={currentUserId}
        onReply={handleReply}
        onLongPress={handleMessageLongPress}
        onOpenAttachment={handleOpenAttachment}
        onOpenLocation={handleOpenLocation}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.keyboard}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 92 : 100}
      >
        <View style={styles.chatMetaBar}>
          <View style={styles.chatMetaTopRow}>
            <View style={styles.chatMetaCopy}>
              <Text style={styles.chatMetaTitle}>{counterpartName}</Text>
              <Text style={styles.chatMetaSubtitle}>Status: {resolvedStatus}</Text>
              {volunteerName ? (
                <Text style={styles.chatMetaHelper}>Volunteer: {volunteerName}</Text>
              ) : null}
            </View>

            {canTerminateChat && (
              <TouchableOpacity
                style={styles.terminateChip}
                onPress={handleTerminateChat}
                disabled={terminating}
              >
                {terminating ? (
                  <ActivityIndicator size="small" color="#B42318" />
                ) : (
                  <Text style={styles.terminateChipText}>Terminate</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {isChatTerminated && (
            <View style={styles.chatEndedBanner}>
              <Ionicons name="stop-circle-outline" size={16} color="#B42318" />
              <Text style={styles.chatEndedText}>
                Ended by {chatMeta?.chatTerminatedBy?.name || 'a participant'}
                {chatMeta?.chatTerminatedAt ? ` on ${new Date(chatMeta.chatTerminatedAt).toLocaleString()}` : ''}.
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.accent} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={(
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No messages yet</Text>
                <Text style={styles.emptyStateCopy}>Start the donor and NGO conversation here.</Text>
              </View>
            )}
          />
        )}

        {isChatTerminated ? (
          <View style={styles.readOnlyBar}>
            <Ionicons name="lock-closed-outline" size={18} color="#B42318" />
            <Text style={styles.readOnlyText}>Read-only chat. New messages are disabled.</Text>
          </View>
        ) : (
          <>
            {editingMessage ? (
              <View style={styles.replyPreviewBar}>
                <View style={[styles.replyAccent, styles.editAccent]} />
                <View style={styles.replyPreviewCopy}>
                  <Text style={styles.replyPreviewName}>Editing message</Text>
                  <Text style={styles.replyPreviewText}>
                    {editingMessage.messageType === 'text'
                      ? 'Update your message text.'
                      : 'Add or update the caption for this message.'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => clearComposer()}>
                  <Ionicons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ) : replyTarget?.messageId ? (
              <View style={styles.replyPreviewBar}>
                <View style={styles.replyAccent} />
                <View style={styles.replyPreviewCopy}>
                  <Text style={styles.replyPreviewName}>{replyTarget.senderName}</Text>
                  <Text style={styles.replyPreviewText}>{previewReplyText(replyTarget)}</Text>
                </View>
                <TouchableOpacity onPress={() => setReplyTarget(null)}>
                  <Ionicons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ) : null}

            {uploading && (
              <View style={styles.uploadingBar}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.uploadingText}>Uploading attachment...</Text>
              </View>
            )}

            {showEmojiTray && (
              <View style={styles.trayPanel}>
                <FlatList
                  data={EMOJIS}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.emojiTray}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.emojiPill} onPress={() => appendEmoji(item)}>
                      <Text style={styles.emojiText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {showGifTray && (
              <View style={styles.trayPanel}>
                <FlatList
                  data={GIF_OPTIONS}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.gifTray}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.gifOption}
                      onPress={() => emitMessage({ messageType: 'gif', gifUrl: item.url })}
                    >
                      <Image source={{ uri: item.url, cache: 'reload' }} style={styles.gifPreview} resizeMode="cover" />
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {showAttachmentTray && (
              <View style={styles.attachmentTray}>
                <Text style={styles.attachmentTrayTitle}>Share Something</Text>
                <View style={styles.attachmentGrid}>
                  {attachmentActions.map((action) => (
                    <TouchableOpacity
                      key={action.key}
                      style={styles.attachmentTile}
                      onPress={action.onPress}
                      disabled={uploading}
                    >
                      <View style={[styles.attachmentIconShell, { backgroundColor: action.bgColor }]}>
                        <Ionicons name={action.icon} size={22} color={action.tintColor} />
                      </View>
                      <Text style={styles.attachmentLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.inputArea}>
              <TouchableOpacity
                style={styles.toolButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setShowEmojiTray((prev) => !prev);
                  setShowGifTray(false);
                  setShowAttachmentTray(false);
                }}
              >
                <Ionicons name="happy-outline" size={22} color="#58667A" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolButton}
                onPress={() => {
                  if (!ensureReadyForAttachmentAction()) return;
                  Keyboard.dismiss();
                  setShowAttachmentTray((prev) => !prev);
                  setShowEmojiTray(false);
                  setShowGifTray(false);
                }}
              >
                <Ionicons name="add-circle-outline" size={24} color="#58667A" />
              </TouchableOpacity>

              <View style={styles.inputBox}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={editingMessage ? 'Edit your message' : 'Type a message'}
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  style={styles.textInput}
                  multiline
                  blurOnSubmit={false}
                />
              </View>

              <TouchableOpacity
                onPress={editingMessage ? saveEditedMessage : () => emitMessage({ messageType: 'text' })}
                style={[
                  styles.sendBtn,
                  !canSubmitEdit && styles.sendBtnDisabled,
                ]}
                disabled={!canSubmitEdit}
              >
                <Ionicons
                  name={editingMessage ? 'checkmark' : 'send'}
                  size={18}
                  color="#FFF"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboard: {
    flex: 1,
  },
  chatMetaBar: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  chatMetaTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  chatMetaCopy: {
    flex: 1,
  },
  chatMetaTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  chatMetaSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.subtle,
    fontWeight: '600',
  },
  chatMetaHelper: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.subtle,
    fontWeight: '700',
  },
  terminateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F5B5B1',
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminateChipText: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '900',
  },
  chatEndedBanner: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FFF1F0',
  },
  chatEndedText: {
    flex: 1,
    color: '#B42318',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  loader: {
    marginTop: 26,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  emptyStateCopy: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.subtle,
  },
  messageRow: {
    marginVertical: 4,
    width: '100%',
  },
  myWrapper: {
    alignItems: 'flex-end',
  },
  theirWrapper: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: COLORS.mine,
    borderBottomRightRadius: 6,
  },
  theirBubble: {
    backgroundColor: COLORS.theirs,
    borderBottomLeftRadius: 6,
  },
  replySnippet: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  replySnippetMine: {
    backgroundColor: 'rgba(31, 143, 67, 0.12)',
  },
  replySnippetTheirs: {
    backgroundColor: '#F3F4F6',
  },
  replySenderText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
    marginBottom: 2,
  },
  replySnippetText: {
    fontSize: 12,
    color: '#4B5563',
  },
  deletedMessageText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  messageText: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 21,
  },
  mediaCaption: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 20,
  },
  gifBubble: {
    width: 190,
    height: 190,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  imageBubble: {
    width: 220,
    height: 220,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.48)',
    padding: 12,
    minWidth: 220,
  },
  fileIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCopy: {
    flex: 1,
  },
  fileNameText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  fileMetaText: {
    marginTop: 3,
    color: COLORS.subtle,
    fontSize: 12,
    fontWeight: '600',
  },
  locationCard: {
    width: 230,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.48)',
  },
  locationPreviewShell: {
    width: '100%',
    minHeight: 104,
    backgroundColor: '#E8F7EE',
    paddingHorizontal: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(31, 143, 67, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPreviewCopy: {
    flex: 1,
  },
  locationPreviewTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  locationPreviewHint: {
    marginTop: 4,
    color: COLORS.subtle,
    fontSize: 12,
    fontWeight: '700',
  },
  locationCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  locationLabelText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  locationCoordsText: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    color: COLORS.subtle,
    fontSize: 11,
    fontWeight: '700',
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 6,
  },
  senderMetaText: {
    color: COLORS.subtle,
    fontSize: 11,
    fontWeight: '700',
  },
  editedMetaText: {
    color: COLORS.subtle,
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    color: COLORS.subtle,
    fontSize: 11,
    fontWeight: '600',
  },
  replyPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.composer,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  replyAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  editAccent: {
    backgroundColor: '#2563EB',
  },
  replyPreviewCopy: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accent,
  },
  replyPreviewText: {
    marginTop: 2,
    fontSize: 13,
    color: '#4B5563',
  },
  readOnlyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFF1F0',
    borderTopWidth: 1,
    borderColor: '#F5D2CF',
  },
  readOnlyText: {
    flex: 1,
    color: '#B42318',
    fontSize: 13,
    fontWeight: '700',
  },
  uploadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.composer,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  uploadingText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  trayPanel: {
    backgroundColor: COLORS.composer,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  emojiTray: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 8,
  },
  emojiPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  gifTray: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  gifOption: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gifPreview: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  attachmentTray: {
    backgroundColor: COLORS.composer,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  attachmentTrayTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
  },
  attachmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  attachmentTile: {
    width: '33.33%',
    paddingHorizontal: 6,
    marginBottom: 12,
    alignItems: 'center',
  },
  attachmentIconShell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: COLORS.composer,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  toolButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  inputBox: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderRadius: 24,
    backgroundColor: COLORS.panel,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  textInput: {
    color: COLORS.text,
    fontSize: 16,
    maxHeight: 90,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  sendBtnDisabled: {
    backgroundColor: '#A7D6B4',
  },
});

export default ChatScreen;
