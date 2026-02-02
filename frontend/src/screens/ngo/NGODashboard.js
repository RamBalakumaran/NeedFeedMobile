import React, { useState, useContext, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const NGODashboard = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const [myRequests, setMyRequests] = useState([]);

  const fetchRequests = async () => {
    const res = await client.get('/food/requests/ngo', { headers: { Authorization: `Bearer ${userToken}` }});
    setMyRequests(res.data);
  };

  useFocusEffect(useCallback(() => { fetchRequests(); }, []));

  const handleCancel = async (id) => {
    await client.put(`/food/cancel/${id}`, {}, { headers: { Authorization: `Bearer ${userToken}` }});
    fetchRequests();
    Alert.alert("Cancelled", "Item returned to Available list.");
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={myRequests}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.status}>Status: {item.status}</Text>
            
            <View style={styles.actionRow}>
              {item.status === 'Accepted' && (
                <>
                  <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('OrderDetails', { item })}>
                    <Text style={styles.btnText}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.chat]} onPress={() => navigation.navigate('Chat', { name: item.donor?.name })}>
                    <Text style={styles.whiteText}>Chat</Text>
                  </TouchableOpacity>
                </>
              )}
              
              {(item.status === 'Pending' || item.status === 'Accepted') && (
                <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={() => handleCancel(item._id)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 3 },
  title: { fontSize: 18, fontWeight: 'bold' },
  status: { color: '#666', marginVertical: 5 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { padding: 10, backgroundColor: '#EEE', borderRadius: 8 },
  chat: { backgroundColor: '#2196F3' },
  cancel: { backgroundColor: '#FFEBEE' },
  btnText: { fontWeight: 'bold', color: '#333' },
  whiteText: { fontWeight: 'bold', color: '#FFF' },
  cancelText: { fontWeight: 'bold', color: '#D32F2F' }
});

export default NGODashboard;