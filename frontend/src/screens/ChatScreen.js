import React from 'react';
import { View, Text } from 'react-native';

const ChatScreen = ({ route }) => (
  <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
    <Text>Chatting with {route.params.name}</Text>
  </View>
);
export default ChatScreen;