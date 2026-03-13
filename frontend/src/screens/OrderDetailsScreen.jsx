import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const OrderDetailsScreen = ({ route }) => {
  const { item } = route.params;

  const DetailRow = ({ label, value }) => (
    <View style={styles.row}><Text style={styles.label}>{label}:</Text><Text style={styles.value}>{value}</Text></View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Order #{item._id.slice(-6)}</Text>
      
      <View style={styles.card}>
        <Text style={styles.title}>🍱 Food Details</Text>
        <DetailRow label="Item" value={item.title} />
        <DetailRow label="Quantity" value={item.quantity} />
        <DetailRow label="Type" value={item.foodType} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>👤 Donor Info</Text>
        <DetailRow label="Name" value={item.donor?.name} />
        <DetailRow label="Phone" value={item.donor?.phone} />
        <DetailRow label="Address" value={item.donor?.address} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>🚚 Delivery Info</Text>
        <DetailRow label="Volunteer" value={item.assignedVolunteer?.name || "Assigning..."} />
        <DetailRow label="Vehicle" value={item.assignedVolunteer?.vehicleType || "-"} />
        <DetailRow label="Contact" value={item.assignedVolunteer?.phone || "-"} />
        <Text style={[styles.status, {color: 'green'}]}>Current Status: {item.status}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 2 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#F25F4C' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#666' },
  value: { fontWeight: 'bold', color: '#333', maxWidth: '60%', textAlign: 'right' },
  status: { marginTop: 10, textAlign: 'center', fontWeight: 'bold', fontSize: 16 }
});

export default OrderDetailsScreen;