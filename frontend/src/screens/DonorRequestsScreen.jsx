import React, { useState, useCallback, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';

const COLORS = { primary: '#F25F4C', bg: '#FAFAFA', card: '#FFF', text: '#333', green: '#4CAF50', blue: '#2196F3' };

const DonorRequestsScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await client.get('/food/requests/donor', { headers: { Authorization: `Bearer ${userToken}` } });
      setRequests(res.data);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchRequests(); }, []));

  const handleResponse = async (id, action) => {
    try {
      await client.put(`/food/respond/${id}`, { action }, { headers: { Authorization: `Bearer ${userToken}` } });
      Alert.alert("Success", action === 'accept' ? "Request Accepted! Finding Volunteer..." : "Request Rejected.");
      fetchRequests();
    } catch (e) { Alert.alert("Error", "Could not process response."); }
  };

  const handleCancel = async (id) => {
    Alert.alert("Cancel Order", "Stop this delivery and return food to 'Available' list?", [
      { text: "No" },
      { text: "Yes", onPress: async () => {
        try {
          await client.put(`/food/cancel/${id}`, {}, { headers: { Authorization: `Bearer ${userToken}` } });
          fetchRequests();
        } catch (e) { Alert.alert("Error", "Could not cancel."); }
      }}
    ]);
  };

  const renderItem = ({ item }) => {
    const isProcessing = ['Accepted', 'FindingVolunteer', 'WaitingForVolunteer', 'Assigned'].includes(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{item.title || "Food Donation"}</Text>
          <Text style={[styles.statusBadge, { color: isProcessing ? COLORS.green : '#FF9800' }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.qty}>📦 {item.quantity}</Text>

        <View style={styles.ngoBox}>
          <Text style={styles.ngoLabel}>Requested By:</Text>
          <Text style={styles.ngoName}>{item.requestedBy?.organizationName || item.requestedBy?.name}</Text>
          <Text style={styles.ngoContact}>{item.requestedBy?.phone}</Text>
        </View>

        {/* 1. INITIAL ACTIONS */}
        {item.status === 'Pending' && (
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleResponse(item._id, 'reject')}>
              <Text style={[styles.btnText, { color: '#D32F2F' }]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={() => handleResponse(item._id, 'accept')}>
              <Text style={[styles.btnText, { color: '#388E3C' }]}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. PROCESSING ACTIONS (Appear even if volunteer not assigned yet) */}
        {isProcessing && (
          <View style={styles.activeActions}>
            <View style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
              <TouchableOpacity 
                style={[styles.actionBtn, {backgroundColor: COLORS.blue}]} 
                onPress={() => navigation.navigate('Chat', { requestId: item._id, name: item.requestedBy?.name, status: item.status })}
              >
                <Ionicons name="chatbubbles" size={18} color="#FFF" />
                <Text style={styles.whiteText}>Chat NGO</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, {backgroundColor: '#607D8B'}]} 
                onPress={() => navigation.navigate('OrderDetails', { item })}
              >
                <Ionicons name="list" size={18} color="#FFF" />
                <Text style={styles.whiteText}>Details</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.fullCancelBtn} onPress={() => handleCancel(item._id)}>
              <Text style={styles.cancelText}>Cancel Order</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Incoming Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} /> : (
        <FlatList
          data={requests}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: '#999' }}>No pending requests.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', backgroundColor: '#FFF', elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  card: { backgroundColor: '#FFF', borderRadius: 15, padding: 20, marginBottom: 15, elevation: 3 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statusBadge: { fontSize: 11, fontWeight: 'bold' },
  qty: { color: '#666', marginTop: 5 },
  ngoBox: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, marginTop: 15 },
  ngoLabel: { fontSize: 11, color: '#999', fontWeight: 'bold' },
  ngoName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  ngoContact: { fontSize: 13, color: '#555' },
  btnRow: { flexDirection: 'row', gap: 15, marginTop: 20 },
  btn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  btnReject: { borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  btnAccept: { borderColor: '#C8E6C9', backgroundColor: '#E8F5E9' },
  btnText: { fontWeight: 'bold' },
  activeActions: { marginTop: 15 },
  actionBtn: { flex: 1, flexDirection: 'row', padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
  whiteText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  fullCancelBtn: { width: '100%', padding: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FFCDD2', borderRadius: 10, alignItems: 'center' },
  cancelText: { color: '#D32F2F', fontWeight: 'bold' }
});

export default DonorRequestsScreen;