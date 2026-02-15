import React, { useState, useEffect, useContext, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, 
  ActivityIndicator, Keyboard
} from 'react-native';
import io from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';

// !!! UPDATE THIS TO YOUR LAPTOP IP !!!
const SOCKET_URL = "http://192.168.0.100:5000"; 

const ChatScreen = ({ route }) => {
  const { requestId, name, status } = route.params || {};
  const { userInfo, userToken } = useContext(AuthContext);
  const currentUserId = userInfo?._id || userInfo?.id;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const socket = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!requestId || !currentUserId) return;

    socket.current = io(SOCKET_URL, { 
        transports: ['websocket'],
        reconnection: true
    });

    socket.current.on('connect', () => {
      socket.current.emit('joinChat', { requestId });
    });

    const loadHistory = async () => {
       try {
         const res = await client.get(`/chat/history/${requestId}`, {
            headers: { Authorization: `Bearer ${userToken}` }
         });
         setMessages(res.data);
       } catch (e) { 
           console.log("History Error:", e.message); 
       } finally { 
           setLoading(false); 
       }
    };
    loadHistory();

    // --- FIX FOR DOUBLE PRINTING ---
    socket.current.on('newMessage', (msg) => {
      setMessages((prev) => {
        // Only add if message ID doesn't exist
        const exists = prev.find(m => m._id === msg._id);
        if (exists) return prev;
        
        // Remove the temporary optimistic message if it matches this real one
        const filtered = prev.filter(m => m.text !== msg.text || m.senderId !== msg.senderId || m._id.length > 15);
        
        return [...filtered, msg];
      });
    });

    return () => { if(socket.current) socket.current.disconnect(); };
  }, [requestId, currentUserId]);

  const sendMessage = () => {
    if (text.trim().length > 0 && socket.current) {
      const tempId = "temp-" + Date.now().toString(); 
      const messageData = { 
        requestId, 
        senderId: currentUserId, 
        text: text.trim() 
      };

      // Emit to server
      socket.current.emit('sendMessage', messageData);

      // Optimistic UI Update (Add locally immediately)
      const uiMessage = { 
          ...messageData, 
          _id: tempId, 
          timestamp: new Date() 
      };
      setMessages((prev) => [...prev, uiMessage]);
      
      setText('');
      // Optional: Auto-scroll to bottom after sending
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderItem = ({ item }) => {
    const isMine = item.senderId === currentUserId;
    return (
      <View style={[styles.msgWrapper, isMine ? styles.myWrapper : styles.theirWrapper]}>
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          <Text style={{ color: isMine ? '#FFF' : '#333', fontSize: 16 }}>{item.text}</Text>
          <Text style={[styles.timeText, { color: isMine ? '#FFE0B2' : '#999' }]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 
          KEYBOARD FIX: 
          On Android, 'padding' usually works better than 'height'.
          The offset 100 accounts for the header height.
      */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} 
        style={{ flex: 1 }} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 100}
      >
        <View style={{ flex: 1 }}>
          {loading ? (
            <ActivityIndicator style={{marginTop: 20}} color="#F25F4C" />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          )}

          <View style={styles.inputArea}>
            <View style={styles.inputBox}>
              <TextInput 
                value={text} 
                onChangeText={setText} 
                placeholder="Type a message..." 
                style={styles.textInput} 
                multiline={true}
                blurOnSubmit={false}
              />
              <TouchableOpacity 
                onPress={sendMessage} 
                style={styles.sendBtn} 
                disabled={!text.trim()}
              >
                <Ionicons name="send" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  msgWrapper: { marginVertical: 5, width: '100%' },
  myWrapper: { alignItems: 'flex-end' },
  theirWrapper: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 15, elevation: 1 },
  myBubble: { backgroundColor: '#F25F4C', borderBottomRightRadius: 2 },
  theirBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 2 },
  timeText: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  inputArea: { 
    paddingHorizontal: 10, 
    paddingVertical: 12, // Increased padding
    backgroundColor: '#FFF', 
    borderTopWidth: 1, 
    borderColor: '#EEE'
  },
  inputBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F1F3F5', 
    borderRadius: 25, 
    paddingHorizontal: 15,
    minHeight: 45 // Ensure it has a minimum height
  },
  textInput: { 
    flex: 1, 
    fontSize: 16, 
    paddingVertical: 10, 
    color: '#000',
    maxHeight: 100 
  },
  sendBtn: { 
    backgroundColor: '#F25F4C', 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 10 
  }
});

export default ChatScreen;