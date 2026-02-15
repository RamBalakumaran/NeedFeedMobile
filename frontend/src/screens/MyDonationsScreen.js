import React, { useEffect, useState, useContext } from 'react';
import { 
  View, Text, FlatList, StyleSheet, Image, ActivityIndicator, RefreshControl, TouchableOpacity 
} from 'react-native';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';

const MyDonationsScreen = ({ navigation }) => {
  const { userInfo } = useContext(AuthContext);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyDonations = async () => {
    try {
      const res = await client.get(`/food/my/${userInfo._id || userInfo.id}`);
      setDonations(res.data);
    } catch (error) {
      console.log("Error fetching donations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyDonations();
  }, []);

  const getStatusColor = (item) => {
    const now = new Date();
    const expiry = new Date(item.expiryTime);
    
    if (now > expiry) return { label: 'EXPIRED', color: '#E53935', bg: '#FFEBEE' };
    if (item.status === 'Claimed') return { label: 'CLAIMED', color: '#2196F3', bg: '#E3F2FD' };
    return { label: 'ACTIVE', color: '#4CAF50', bg: '#E8F5E9' };
  };

  const renderItem = ({ item }) => {
    const status = getStatusColor(item);

    return (
      <View style={styles.card}>
        {/* Left: Image */}
        <Image source={{ uri: item.imageUrl }} style={styles.image} />
        
        {/* Right: Content */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          
          <Text style={styles.qty}>📦 {item.quantity}</Text>
          <Text style={styles.date}>📅 {new Date(item.createdAt).toLocaleDateString()}</Text>
          
          <View style={styles.statsRow}>
            <Text style={styles.views}>👁️ {Math.floor(Math.random() * 50)} Views</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => alert('Edit feature coming soon')}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={donations}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMyDonations(); }} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={{fontSize: 40}}>🥡</Text>
              <Text style={styles.emptyText}>No donations yet.</Text>
              <TouchableOpacity style={styles.donateBtn} onPress={() => navigation.navigate('Donate')}>
                <Text style={styles.donateBtnText}>Donate Now</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, marginBottom: 15, padding: 10, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  image: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#eee' },
  content: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  qty: { color: '#666', fontSize: 13, marginBottom: 2 },
  date: { color: '#999', fontSize: 12, marginBottom: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  views: { fontSize: 12, color: '#aaa' },
  editBtn: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  editText: { fontSize: 12, color: '#333', fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#888', marginTop: 10, marginBottom: 20 },
  donateBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  donateBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default MyDonationsScreen;