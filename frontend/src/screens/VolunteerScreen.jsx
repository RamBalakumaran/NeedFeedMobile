import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = { primary: '#F25F4C', bg: '#FAFAFA', card: '#FFFFFF', text: '#1D212B', gray: '#9FA1AC' };

const VolunteerScreen = ({ navigation }) => {
  // Mock Data
  const [pickups, setPickups] = useState([
    { id: '1', title: '50 Veg Meals', address: 'Anna Nagar, Chennai', status: 'Pending', distance: '2.5 km' },
    { id: '2', title: 'Bakery Surplus', address: 'T-Nagar, Chennai', status: 'Assigned', distance: '4.0 km' },
  ]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Ionicons name="cube-outline" size={24} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 10 }}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.sub}>{item.address} • {item.distance}</Text>
        <View style={[styles.badge, item.status === 'Pending' ? styles.bgOrange : styles.bgGreen]}>
          <Text style={[styles.statusText, item.status === 'Pending' ? styles.textOrange : styles.textGreen]}>
            {item.status}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.actionBtn} onPress={() => alert("Pickup Accepted!")}>
        <Ionicons name="checkmark" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pickup Tasks</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <FlatList 
        data={pickups} 
        renderItem={renderItem} 
        keyExtractor={item => item.id} 
        contentContainerStyle={{ padding: 20 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  
  card: { flexDirection: 'row', backgroundColor: COLORS.card, padding: 15, borderRadius: 20, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  iconBox: { width: 50, height: 50, backgroundColor: '#FFF0EC', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  title: { fontWeight: 'bold', fontSize: 16, color: COLORS.text },
  sub: { color: COLORS.gray, fontSize: 13, marginTop: 2 },
  
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 5 },
  bgOrange: { backgroundColor: '#FFF3E0' },
  bgGreen: { backgroundColor: '#E8F5E9' },
  textOrange: { color: '#FF9800', fontSize: 11, fontWeight: 'bold' },
  textGreen: { color: '#4CAF50', fontSize: 11, fontWeight: 'bold' },

  actionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, elevation: 5 }
});

export default VolunteerScreen;