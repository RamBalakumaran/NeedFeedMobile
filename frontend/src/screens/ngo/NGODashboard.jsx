import React, { useState, useContext, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const NGODashboard = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await client.get('/food/requests/ngo', { headers: { Authorization: `Bearer ${userToken}` } });
      setMyRequests(res.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchRequests(); }, []));

  const handleCancel = async (id) => {
    Alert.alert("Cancel Request", "Are you sure you want to cancel this request?", [
      { text: "No" },
      { text: "Yes", onPress: async () => {
        try {
          await client.put(`/food/cancel/${id}`, {}, { headers: { Authorization: `Bearer ${userToken}` } });
          fetchRequests();
          Alert.alert("Cancelled", "Item returned to Available list.");
        } catch (e) { Alert.alert("Error", "Could not cancel."); }
      }}
    ]);
  };

  const renderItem = ({ item }) => {
    // Buttons appear for all these statuses
    const isProcessing = ['Accepted', 'FindingVolunteer', 'WaitingForVolunteer', 'Assigned'].includes(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={[styles.statusBadge, { color: item.status === 'Pending' ? '#FF9800' : '#4CAF50' }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
        
        <Text style={styles.infoText}>📍 Donor: {item.donor?.name || "Private Donor"}</Text>

        <View style={styles.actionRow}>
          {isProcessing && (
            <>
              <TouchableOpacity 
                style={[styles.btn, styles.detailsBtn]} 
                onPress={() => navigation.navigate('OrderDetails', { item })}
              >
                <Ionicons name="list" size={16} color="#333" />
                <Text style={styles.btnText}>Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.btn, styles.chatBtn]} 
                onPress={() => navigation.navigate('Chat', { 
                  requestId: item._id, 
                  name: item.donor?.name || "Donor", 
                  status: item.status 
                })}
              >
                <Ionicons name="chatbubbles-outline" size={16} color="#FFF" />
                <Text style={styles.whiteText}>Chat</Text>
              </TouchableOpacity>
            </>
          )}

          {(item.status === 'Pending' || isProcessing) && (
            <TouchableOpacity 
              style={[styles.btn, styles.cancelBtn]} 
              onPress={() => handleCancel(item._id)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#D32F2F" />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Food Requests</Text>
      </View>
      {loading ? <ActivityIndicator size="large" color="#F25F4C" style={{marginTop: 50}}/> : (
        <FlatList
          data={myRequests}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>No active requests found.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 20, backgroundColor: '#FFF', elevation: 2, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1D212B' },
  card: { backgroundColor: '#FFF', padding: 18, borderRadius: 15, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  statusBadge: { fontSize: 11, fontWeight: 'bold' },
  infoText: { color: '#666', marginBottom: 15 },
  actionRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, flexDirection: 'row', padding: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 5 },
  detailsBtn: { backgroundColor: '#F0F0F0' },
  chatBtn: { backgroundColor: '#2196F3' },
  cancelBtn: { backgroundColor: '#FFEBEE' },
  btnText: { fontWeight: 'bold', fontSize: 12, color: '#333' },
  whiteText: { fontWeight: 'bold', fontSize: 12, color: '#FFF' },
  cancelText: { fontWeight: 'bold', fontSize: 12, color: '#D32F2F' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' }
});

export default NGODashboard;