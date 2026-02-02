import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const FoodMonitoringScreen = () => {
  const { userToken } = useContext(AuthContext);
  const [food, setFood] = useState([]);

  const fetchFood = async () => {
    try {
      const res = await client.get('/admin/food', { headers: { Authorization: `Bearer ${userToken}` }});
      setFood(res.data);
    } catch(e) { console.log(e); }
  };

  useEffect(() => { fetchFood(); }, []);

  const deleteFood = (id) => {
    Alert.alert("Remove Post?", "Are you sure?", [
      { text: "Cancel" },
      { text: "Remove", style: 'destructive', onPress: async () => {
          try {
            await client.delete(`/admin/food/${id}`, { headers: { Authorization: `Bearer ${userToken}` }});
            fetchFood();
          } catch(e) { Alert.alert("Error", "Failed to remove"); }
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ❌ REMOVED CUSTOM HEADER */}
      <FlatList 
        data={food} 
        keyExtractor={item => item._id}
        contentContainerStyle={{padding: 20}}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
            <View style={{ flex: 1, padding: 10 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>By: {item.donor?.name || 'Unknown'}</Text>
              <Text style={[styles.status, {color: new Date(item.expiryTime) < new Date() ? 'red' : 'green'}]}>
                {new Date(item.expiryTime) < new Date() ? 'Expired' : 'Active'}
              </Text>
            </View>
            <TouchableOpacity style={styles.delBtn} onPress={() => deleteFood(item._id)}>
              <Ionicons name="trash-outline" size={20} color="#D32F2F" />
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  card: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 10, marginBottom: 15, overflow: 'hidden', elevation: 2 },
  image: { width: 80, height: 80 },
  title: { fontWeight: 'bold', color: '#333' },
  sub: { fontSize: 12, color: '#666' },
  status: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  delBtn: { justifyContent: 'center', paddingHorizontal: 15, backgroundColor: '#FFEBEE' }
});

export default FoodMonitoringScreen;