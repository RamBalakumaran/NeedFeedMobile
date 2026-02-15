import React, { useEffect, useState, useContext } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const COLORS = { primary: '#F25F4C', bg: '#F8F9FA', card: '#FFF', text: '#333', gray: '#9FA1AC' };

const Analytics = () => {
  const { userToken } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await client.get('/admin/stats', { headers: { Authorization: `Bearer ${userToken}` }});
      setStats(res.data);
    } catch(e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleDownload = () => {
    Alert.alert("Export Report", "Downloading PDF Report for this month...", [{ text: "OK" }]);
  };

  // Reusable Progress Bar
  const StatBar = ({ label, value, max, color }) => {
    const width = max > 0 ? (value / max) * 100 : 0;
    return (
      <View style={styles.barContainer}>
        <View style={styles.barHeader}>
          <Text style={styles.barLabel}>{label}</Text>
          <Text style={styles.barValue}>{value}<Text style={{fontSize:10, color:'#999'}}>({Math.round(width)}%)</Text></Text>
        </View>
        <View style={styles.bgBar}>
          <View style={[styles.fillBar, { width: `${width}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  // Reusable Small Stat Box
  const StatBox = ({ title, value, color, icon }) => (
    <View style={styles.statBox}>
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.boxValue}>{value}</Text>
        <Text style={styles.boxTitle}>{title}</Text>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary}/></View>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Report</Text>
        <Text style={styles.date}>{new Date().toDateString()}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true); fetchStats()}} />}
      >

        {/* 1. IMPACT HIGHLIGHT (Success Metric) */}
        <View style={styles.impactCard}>
          <View>
            <Text style={styles.impactTitle}>Total Meals Delivered</Text>
            <Text style={styles.impactNum}>{stats?.breakdown?.delivered || 0}</Text>
            <Text style={styles.impactSub}>Succesfully redistributed</Text>
          </View>
          <Ionicons name="trophy" size={50} color="#FFF" style={{opacity:0.8}} />
        </View>

        {/* 2. DONATION LIFECYCLE (Status) */}
        <Text style={styles.sectionTitle}>Donation Status</Text>
        <View style={styles.gridRow}>
          <StatBox title="Active" value={stats?.activeDonations || 0} icon="radio-button-on" color="#2196F3" />
          <StatBox title="Pending" value={stats?.breakdown?.pending || 0} icon="time" color="#FF9800" />
        </View>
        <View style={styles.gridRow}>
          <StatBox title="Expired" value={stats?.breakdown?.expired || 0} icon="alert-circle" color="#E53935" />
          <StatBox title="Total Posts" value={stats?.totalFood || 0} icon="layers" color="#607D8B" />
        </View>

        {/* 3. FOOD COMPOSITION (Veg/Non-Veg) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Food Composition</Text>
          <StatBar 
            label="Vegetarian Meals" 
            value={stats?.types?.veg || 0} 
            max={stats?.totalFood} 
            color="#4CAF50" 
          />
          <StatBar 
            label="Non-Veg Meals" 
            value={stats?.types?.nonVeg || 0} 
            max={stats?.totalFood} 
            color="#E53935" 
          />
        </View>

        {/* 4. USER DEMOGRAPHICS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>User Demographics</Text>
          <StatBar label="Donors" value={stats?.donors || 0} max={stats?.totalUsers} color="#FF9800" />
          <StatBar label="NGOs" value={stats?.ngos || 0} max={stats?.totalUsers} color="#2196F3" />
          <StatBar label="Volunteers" value={stats?.volunteers || 0} max={stats?.totalUsers} color="#9C27B0" />
        </View>

        <View style={{height: 60}} />
      </ScrollView>

      {/* Floating Download Button */}
      <TouchableOpacity style={styles.fab} onPress={handleDownload}>
        <Ionicons name="download-outline" size={24} color="#FFF" />
        <Text style={styles.fabText}>Export PDF</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { padding: 24, paddingTop: 20, backgroundColor: '#FFF', paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
  date: { fontSize: 13, color: COLORS.gray, marginTop: 2 },

  scroll: { padding: 20 },

  // Impact Card
  impactCard: { 
    backgroundColor: COLORS.primary, borderRadius: 20, padding: 25, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 25, elevation: 5, shadowColor: COLORS.primary, shadowOpacity: 0.3
  },
  impactTitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },
  impactNum: { color: '#FFF', fontSize: 36, fontWeight: 'bold', marginVertical: 5 },
  impactSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#444', marginBottom: 15 },

  // Grid
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statBox: { 
    width: '48%', backgroundColor: '#FFF', borderRadius: 15, padding: 15, 
    flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2 
  },
  iconCircle: { width: 35, height: 35, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  boxValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  boxTitle: { fontSize: 12, color: COLORS.gray },

  // Standard Card
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#444', marginBottom: 20 },

  // Bar
  barContainer: { marginBottom: 15 },
  barHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  barLabel: { fontSize: 13, color: '#555', fontWeight: '500' },
  barValue: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  bgBar: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  fillBar: { height: '100%', borderRadius: 4 },

  // FAB
  fab: { 
    position: 'absolute', bottom: 30, alignSelf: 'center', 
    backgroundColor: '#333', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, elevation: 5 
  },
  fabText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 }
});

export default Analytics;