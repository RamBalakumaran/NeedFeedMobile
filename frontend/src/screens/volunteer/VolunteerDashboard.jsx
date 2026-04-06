import React, { useState, useContext, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import {
  getNextVolunteerStatuses,
  getVolunteerActionLabel,
  getWorkflowStatusLabel,
  getWorkflowStatusTone,
} from '../../utils/workflowStatus';

const VolunteerDashboard = () => {
  const { userToken } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);

  const fetchTasks = async () => {
    try {
      const res = await client.get('/food/tasks/volunteer', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setTasks(res.data);
    } catch (error) {
      console.log('Error fetching tasks:', error);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchTasks();
  }, []));

  const updateStatus = async (id, current) => {
    const [next] = getNextVolunteerStatuses(current);
    if (!next) return;

    try {
      await client.put(`/food/status/${id}`, { status: next }, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      fetchTasks();
      Alert.alert('Success', `Order marked as ${next}`);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not update status');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item._id}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No delivery tasks assigned yet.</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const workflowTone = getWorkflowStatusTone(item);
          const workflowLabel = getWorkflowStatusLabel(item);
          const hasNextStep = getNextVolunteerStatuses(item.status).length > 0;

          return (
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: workflowTone.backgroundColor }]}>
                  <Text style={[styles.badgeText, { color: workflowTone.color }]}>
                    {workflowLabel.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.sub}>From: {item.donor?.address || 'Unknown'}</Text>
              <Text style={styles.sub}>To: {item.requestedBy?.address || 'Unknown'}</Text>
              <Text style={styles.sub}>Operational status: {item.status}</Text>

              {hasNextStep ? (
                <TouchableOpacity style={styles.btn} onPress={() => updateStatus(item._id, item.status)}>
                  <Text style={styles.btnText}>{getVolunteerActionLabel(item.status)}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.done}>Delivered</Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999' },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 3 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  sub: { color: '#666', marginTop: 5 },
  btn: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  done: { color: 'green', fontWeight: 'bold', marginTop: 12 },
});

export default VolunteerDashboard;
