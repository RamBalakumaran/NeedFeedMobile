import React, { useEffect, useState, useContext } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, StatusBar, SafeAreaView, Image 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const COLORS = { primary: '#F25F4C', bg: '#F8F9FA', card: '#FFF', text: '#333' };

const AdminDashboardScreen = ({ navigation }) => {
  const { userToken, logout, userInfo } = useContext(AuthContext);
  const [stats, setStats] = useState({ totalUsers: 0, totalFood: 0, activeDonations: 0, ngos: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await client.get('/admin/stats', { headers: { Authorization: `Bearer ${userToken}` }});
      setStats(res.data);
    } catch (e) { console.log("Stats error:", e); } 
    finally { setRefreshing(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const StatCard = ({ label, value, icon, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.iconBox, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#FFF" />
      </View>
      <View>
        <Text style={styles.statValue}>{value || 0}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  const MenuButton = ({ title, sub, icon, screen }) => (
    <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate(screen)}>
      <View style={styles.menuIconCircle}>
        <Ionicons name={icon} size={22} color={COLORS.primary} />
      </View>
      <View style={{flex:1}}>
        <Text style={styles.menuText}>{title}</Text>
        <Text style={styles.menuSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>Welcome, {userInfo?.name}</Text>
        </View>
        
        <View style={styles.headerActions}>
          {/* ✅ PROFILE BUTTON ADDED */}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Image 
              source={{ uri: userInfo?.profileImage || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }} 
              style={styles.avatar} 
            />
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true); fetchStats()}} />}
      >
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.grid}>
          <StatCard label="Users" value={stats.totalUsers} icon="people" color="#4CAF50" />
          <StatCard label="Donations" value={stats.totalFood} icon="fast-food" color="#FF9800" />
          <StatCard label="Active" value={stats.activeDonations} icon="alert-circle" color="#2196F3" />
          <StatCard label="NGOs" value={stats.ngos} icon="business" color="#9C27B0" />
        </View>

        <Text style={styles.sectionTitle}>Management</Text>
        <MenuButton title="User Management" sub="Verify NGOs & Volunteers" icon="people-circle-outline" screen="UserManagement" />
        <MenuButton title="Food Monitoring" sub="Remove expired/spam posts" icon="nutrition-outline" screen="FoodMonitoring" />
        <MenuButton title="Reports & Analytics" sub="System insights" icon="stats-chart-outline" screen="Analytics" />

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  
  header: { padding: 24, paddingTop: 50, backgroundColor: COLORS.primary, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomRightRadius: 30, borderBottomLeftRadius: 30 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#FFF' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
  
  scroll: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#444', marginTop: 10 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { width: '48%', backgroundColor: COLORS.card, padding: 15, borderRadius: 15, marginBottom: 15, elevation: 3, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  statLabel: { fontSize: 12, color: '#888' },

  menuBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, marginBottom: 15, padding: 15, borderRadius: 15, elevation: 2 },
  menuIconCircle: { width: 45, height: 45, backgroundColor: '#FFF0EC', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuText: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  menuSub: { fontSize: 12, color: '#888' }
});

export default AdminDashboardScreen;