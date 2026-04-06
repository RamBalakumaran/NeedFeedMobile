import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

export const AuthContext = createContext();

const PUSH_TOKEN_STORAGE_KEY = 'devicePushToken';
const LEGACY_PUSH_TOKEN_STORAGE_KEY = 'expoPushToken';

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check login status on app start
  useEffect(() => {
    isLoggedIn();
  }, []);

  const isLoggedIn = async () => {
    try {
      let token = await AsyncStorage.getItem('userToken');
      let user = await AsyncStorage.getItem('userInfo');
      if (token) {
        setUserToken(token);
        setUserInfo(JSON.parse(user));
      }
    } catch (e) {
      console.log(`Login Error: ${e}`);
    }
    setLoading(false);
  };

  const login = (token, user) => {
    setUserToken(token);
    setUserInfo(user);
    AsyncStorage.setItem('userToken', token);
    AsyncStorage.setItem('userInfo', JSON.stringify(user));
  };

  const logout = async () => {
    const activeToken = userToken;

    try {
      const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
      if (activeToken && pushToken) {
        await client.delete('/notifications/push-token', {
          headers: { Authorization: `Bearer ${activeToken}` },
          data: { token: pushToken },
        });
      }
    } catch (error) {
      console.log(`Logout push token cleanup failed: ${error.message}`);
    } finally {
      setUserToken(null);
      setUserInfo(null);
      await AsyncStorage.multiRemove(['userToken', 'userInfo', PUSH_TOKEN_STORAGE_KEY, LEGACY_PUSH_TOKEN_STORAGE_KEY]);
    }
  };

  // ✅ NEW: Helper to update user data locally
  const updateUser = (updatedUser) => {
    // Keep the existing token, just update user details
    const newUser = { ...userInfo, ...updatedUser };
    setUserInfo(newUser);
    AsyncStorage.setItem('userInfo', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{ login, logout, updateUser, userToken, userInfo, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
