import React, { useEffect, useState, useContext } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const RESPONSIBILITIES = [
  {
    label: 'Governance & Trust',
    detail: 'Validate NGOs, volunteers, and donors while keeping compliance logs tidy.'
  },
  {
    label: 'Food Safety Watch',
    detail: 'Monitor flagged posts, expired donations, and coordinate rapid removal.'
  },
  {
    label: 'Impact Intelligence',
    detail: 'Track adoption, mission KPIs, and surface insights for stakeholders.'
  },
  {
    label: 'Community Support',
    detail: 'Respond to critical alerts, elevate escalations, and guide volunteers.'
  }
];

const QUICK_ACTIONS = [
  { title: 'Open Dashboard', desc: 'See the full control room for every metric.', screen: 'AdminDashboard', icon: 'speedometer-outline' },
  { title: 'Manage Users', desc: 'Approve partners and review flags.', screen: 'UserManagement', icon: 'people-outline' },
  { title: 'Food Monitoring', desc: 'Inspect posts that need urgent action.', screen: 'FoodMonitoring', icon: 'restaurant-outline' }
];

const AdminRoleScreen = ({ navigation }) => {
  const { userInfo, userToken, logout } = useContext(AuthContext);
  const [stats, setStats] = useState({ totalUsers: 0, totalFood: 0, activeDonations: 0, ngos: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await client.get('/admin/stats', { headers: { Authorization: `Bearer ${userToken}` } });
      setStats(res.data);
    } catch (e) {
      console.log('Admin role stats error', e?.message || e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const StatTile = ({ value, label, icon, color }) => (
    <View style={[styles.statTile, { backgroundColor: color }]}> 
      <Ionicons name={icon} size={32} color="#fff" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const Responsibility = ({ label, detail, icon }) => (
    <View style={styles.responsibilityRow}>
      <View style={styles.responsibilityIcon}>
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.responsibilityLabel}>{label}</Text>
        <Text style={styles.responsibilityDetail}>{detail}</Text>
      </View>
    </View>
  );

  const ActionCard = ({ title, desc, icon, screen }) => (
    <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate(screen)}>
      <View>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc}>{desc}</Text>
      </View>
      <Ionicons name={icon} size={28} color="#F25F4C" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#20232A" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor="#F25F4C" colors={['#F25F4C']} />}
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Admin HQ</Text>
          <Text style={styles.heroSubtitle}>You keep the NeedFeed network safe, compliant, and accountable.</Text>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaLabel}>Signed in as</Text>
            <Text style={styles.heroMetaValue}>{userInfo?.name || 'Super Admin'}</Text>
          </View>
          <View style={styles.heroRow}>
            <Ionicons name="shield-checkmark" size={30} color="#fff" />
            <Text style={styles.heroRowText}>Every login unlocks mission-critical oversight across donors, NGOs, and volunteers.</Text>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.heroButton} onPress={() => navigation.navigate('AdminDashboard')}>
              <Text style={styles.heroButtonText}>Open Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroGhost} onPress={logout}>
              <Text style={styles.heroGhostText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.grid}> 
          <StatTile value={stats.totalUsers || '-'} label="Users" icon="people" color="#4C9AFF" />
          <StatTile value={stats.totalFood || '-'} label="Donations" icon="fast-food" color="#F25F4C" />
          <StatTile value={stats.activeDonations || '-'} label="Active Posts" icon="pulse" color="#20BF6B" />
          <StatTile value={stats.ngos || '-'} label="NGOs" icon="business" color="#A55EEA" />
        </View>

        <Text style={styles.sectionTitle}>Core responsibilities</Text>
        <View style={styles.card}>
          {RESPONSIBILITIES.map((item, index) => (
            <Responsibility
              key={item.label}
              label={item.label}
              detail={item.detail}
              icon={index % 2 === 0 ? 'construct' : 'stats-chart'}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Command center</Text>
        <View style={styles.card}>
          {QUICK_ACTIONS.map(action => (
            <ActionCard key={action.title} {...action} />
          ))}
        </View>

        <View style={styles.footerSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  heroSection: { backgroundColor: '#20232A', borderRadius: 28, padding: 24, marginBottom: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 8 }, shadowRadius: 20 },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '800' },
  heroSubtitle: { color: '#CBD5F5', fontSize: 15, marginTop: 6, marginBottom: 18 },
  heroMeta: { marginBottom: 14 },
  heroMetaLabel: { color: '#94A3B8', fontSize: 12, textTransform: 'uppercase' },
  heroMetaValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20 },
  heroRowText: { color: '#E2E8F0', fontSize: 14, flex: 1 },
  heroActions: { flexDirection: 'row', gap: 12 },
  heroButton: { flex: 1, backgroundColor: '#F05A3C', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  heroButtonText: { color: '#fff', fontWeight: '700' },
  heroGhost: { flex: 1, borderWidth: 1, borderColor: '#475569', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  heroGhostText: { color: '#94A3B8', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  statTile: { width: '48%', borderRadius: 20, padding: 18 },
  statValue: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 12 },
  statLabel: { color: '#E2E8F0', fontSize: 12, letterSpacing: 0.5 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 18, marginBottom: 20, elevation: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  responsibilityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  responsibilityIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  responsibilityLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  responsibilityDetail: { color: '#475569', fontSize: 13, marginTop: 2, lineHeight: 18 },
  actionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  actionDesc: { fontSize: 13, color: '#64748B', marginTop: 4 },
  footerSpacing: { height: 20 }
});

export default AdminRoleScreen;

