import React, { useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';

const COLORS = { primary: '#F25F4C', bg: '#FAFAFA', card: '#FFF', text: '#333', green: '#4CAF50', red: '#E53935' };

const DonorRequestsScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await client.get('/food/requests/donor', { headers: { Authorization: `Bearer ${userToken}` }});
      setRequests(res.data);
    } catch(e) { console.log(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchRequests(); }, []));

  const handleResponse = async (id, action) => {
    try {
      await client.put(`/food/respond/${id}`, { action }, { headers: { Authorization: `Bearer ${userToken}` }});
      Alert.alert("Success", action === 'accept' ? "Request Accepted! NGO notified." : "Request Rejected. Food is visible again.");
      fetchRequests(); // Refresh list
    } catch(e) { 
      Alert.alert("Error", "Could not process response."); 
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.rowBetween}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={[styles.statusBadge, { color: item.status === 'Pending' ? '#FF9800' : '#4CAF50' }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      
      <Text style={styles.qty}>📦 {item.quantity}</Text>
      
      {/* Who requested it? */}
      <View style={styles.ngoBox}>
        <Text style={styles.ngoLabel}>Requested By:</Text>
        <Text style={styles.ngoName}>
          {item.requestedBy?.organizationName || item.requestedBy?.name || "Unknown NGO"}
        </Text>
        <Text style={styles.ngoContact}>{item.requestedBy?.phone}</Text>
      </View>

      {/* ACTION BUTTONS (Only if Pending) */}
      {item.status === 'Pending' && (
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleResponse(item._id, 'reject')}>
            <Ionicons name="close-circle-outline" size={20} color="#D32F2F" />
            <Text style={[styles.btnText, {color: '#D32F2F'}]}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={() => handleResponse(item._id, 'accept')}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#388E3C" />
            <Text style={[styles.btnText, {color: '#388E3C'}]}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CHAT & STATUS (If Accepted) */}
      {item.status === 'Accepted' && (
        <View style={styles.acceptedBox}>
          <Text style={styles.acceptedText}>✅ You accepted this request.</Text>
          <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('Chat', { name: item.requestedBy?.name })}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFF" />
            <Text style={{color:'#FFF', fontWeight:'bold', marginLeft:5}}>Chat with NGO</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
       <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#333"/></TouchableOpacity>
          <Text style={styles.headerTitle}>Incoming Requests</Text>
          <View style={{width: 24}}/>
       </View>

       {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop:50}}/> : (
         <FlatList 
           data={requests} 
           renderItem={renderItem} 
           keyExtractor={item => item._id}
           contentContainerStyle={{padding: 20}}
           ListEmptyComponent={<Text style={{textAlign:'center', marginTop:50, color:'#999'}}>No pending requests.</Text>}
         />
       )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems:'center', backgroundColor: '#FFF' },
  headerTitle: { fontSize: 20, fontWeight:'bold', color: COLORS.text },
  
  card: { backgroundColor: '#FFF', borderRadius: 15, padding: 20, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statusBadge: { fontSize: 12, fontWeight: 'bold' },
  qty: { color: '#666', marginTop: 5 },

  ngoBox: { backgroundColor: '#F5F5F5', padding: 10, borderRadius: 10, marginTop: 15 },
  ngoLabel: { fontSize: 11, color: '#999', fontWeight: 'bold' },
  ngoName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  ngoContact: { fontSize: 13, color: '#555' },

  btnRow: { flexDirection: 'row', gap: 15, marginTop: 20 },
  btn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1 },
  btnReject: { borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  btnAccept: { borderColor: '#C8E6C9', backgroundColor: '#E8F5E9' },
  btnText: { fontWeight: 'bold', marginLeft: 5 },

  acceptedBox: { marginTop: 15, alignItems: 'center' },
  acceptedText: { color: 'green', fontWeight: 'bold', marginBottom: 10 },
  chatBtn: { flexDirection: 'row', backgroundColor: '#2196F3', padding: 12, borderRadius: 10, alignItems: 'center', width: '100%', justifyContent: 'center' }
});

export default DonorRequestsScreen;