import React, { useState, useContext, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// ✅ FIX: Go up two levels to find these folders
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const VolunteerDashboard = () => {
  const { userToken } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);

  const fetchTasks = async () => {
    try {
      const res = await client.get('/food/tasks/volunteer', { headers: { Authorization: `Bearer ${userToken}` }});
      setTasks(res.data);
    } catch (e) {
      console.log("Error fetching tasks:", e);
    }
  };

  useFocusEffect(useCallback(() => { fetchTasks(); }, []));

  const updateStatus = async (id, current) => {
    const next = current === 'Accepted' ? 'PickedUp' : 'Delivered';
    try {
      await client.put(`/food/status/${id}`, { status: next }, { headers: { Authorization: `Bearer ${userToken}` }});
      fetchTasks();
      Alert.alert("Success", `Order marked as ${next}`);
    } catch (e) {
      Alert.alert("Error", "Could not update status");
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={
          <View style={{alignItems:'center', marginTop: 50}}>
            <Text style={{color: '#999'}}>No delivery tasks assigned yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>From: {item.donor?.address || "Unknown"}</Text>
            <Text style={styles.sub}>To: {item.requestedBy?.address || "Unknown"}</Text>
            
            {item.status !== 'Delivered' && (
              <TouchableOpacity style={styles.btn} onPress={() => updateStatus(item._id, item.status)}>
                <Text style={styles.btnText}>
                  {item.status === 'Accepted' ? 'Confirm Pickup' : 'Confirm Delivery'}
                </Text>
              </TouchableOpacity>
            )}
            {item.status === 'Delivered' && <Text style={styles.done}>✅ Delivered</Text>}
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
  sub: { color: '#666', marginTop: 5 },
  btn: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  done: { color: 'green', fontWeight: 'bold', marginTop: 10 }
});

export default VolunteerDashboard;