import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const UserManagementScreen = () => {
  const { userToken } = useContext(AuthContext);
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    try {
      const res = await client.get('/admin/users', { headers: { Authorization: `Bearer ${userToken}` }});
      setUsers(res.data);
    } catch(e) { console.log(e); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const deleteUser = (id) => {
    Alert.alert("Confirm Delete", "Irreversible action.", [
      { text: "Cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
          try {
            await client.delete(`/admin/users/${id}`, { headers: { Authorization: `Bearer ${userToken}` }});
            fetchUsers();
          } catch(e) { Alert.alert("Error", "Could not delete user"); }
      }}
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.profileImage || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }} style={styles.avatar} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <View style={styles.roleBadge}><Text style={styles.roleText}>{item.role.toUpperCase()}</Text></View>
      </View>
      <TouchableOpacity onPress={() => deleteUser(item._id)} style={styles.delBtn}>
        <Ionicons name="trash-outline" size={20} color="#E53935" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ❌ REMOVED CUSTOM HEADER - Uses App.js Header now */}
      <FlatList 
        data={users} 
        renderItem={renderItem} 
        keyExtractor={item => item._id} 
        contentContainerStyle={{padding: 20}} 
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEE' },
  name: { fontWeight: 'bold', fontSize: 16, color:'#333' },
  email: { color: '#777', fontSize: 12 },
  roleBadge: { backgroundColor: '#E8F5E9', alignSelf: 'flex-start', paddingHorizontal: 8, borderRadius: 5, marginTop: 4 },
  roleText: { color: '#2E7D32', fontSize: 10, fontWeight: 'bold' },
  delBtn: { padding: 8, backgroundColor: '#FFEBEE', borderRadius: 8 }
});

export default UserManagementScreen;