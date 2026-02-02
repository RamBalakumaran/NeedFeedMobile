import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

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

  const logout = () => {
    setUserToken(null);
    setUserInfo(null);
    AsyncStorage.removeItem('userToken');
    AsyncStorage.removeItem('userInfo');
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