import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { primary: '#F25F4C', bg: '#FAFAFA', card: '#FFFFFF', text: '#1D212B', gray: '#9FA1AC' };

const NGOScreen = ({ navigation }) => {
  const requests = [
    { id: '1', food: 'Rice Bags (50kg)', donor: 'Hotel Saravana', status: 'Approved', date: 'Today, 10:00 AM' },
    { id: '2', food: 'Veg Curry (20L)', donor: 'Wedding Hall A', status: 'Pending', date: 'Yesterday' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Requests</Text>
        <View style={{width: 24}}/>
      </View>

      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{flex: 1}}>
              <Text style={styles.title}>{item.food}</Text>
              <Text style={styles.sub}>From: {item.donor}</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <View style={[styles.badge, item.status === 'Approved' ? styles.bgGreen : styles.bgOrange]}>
              <Text style={[styles.statusText, item.status === 'Approved' ? styles.textGreen : styles.textOrange]}>
                {item.status}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  
  card: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.card, borderRadius: 20, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.gray, marginTop: 4 },
  date: { fontSize: 11, color: '#AAA', marginTop: 10 },
  
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, height: 30, justifyContent: 'center' },
  bgGreen: { backgroundColor: '#E8F5E9' },
  bgOrange: { backgroundColor: '#FFF3E0' },
  textGreen: { color: '#4CAF50', fontWeight: 'bold', fontSize: 12 },
  textOrange: { color: '#FF9800', fontWeight: 'bold', fontSize: 12 },
});

export default NGOScreen;