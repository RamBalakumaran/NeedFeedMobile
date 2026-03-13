import React, { useEffect, useState, useContext } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, 
  StatusBar, SafeAreaView, Image, Platform, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

// Enhanced Color Palette
const COLORS = { 
  primary: '#FF6450',       // Vibrant coral/red
  primaryDark: '#E04F3D',   // Slightly darker for gradients/headers
  bg: '#F4F6F9',            // Cool modern gray for background
  card: '#FFFFFF',          // Clean white
  text: '#2C3A47',          // Deep gray for strong readability
  textMuted: '#8395A7',     // Soft gray for subtitles
  success: '#20BF6B',
  warning: '#F7B731',
  info: '#45AAF2',
  purple: '#A55EEA',
};

const AdminDashboardScreen = ({ navigation }) => {
  const { userToken, logout, userInfo } = useContext(AuthContext);
  const [stats, setStats] = useState({ totalUsers: 0, totalFood: 0, activeDonations: 0, ngos: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await client.get('/admin/stats', { headers: { Authorization: `Bearer ${userToken}` }});
      setStats(res.data);
    } catch (e) { 
      console.log("Stats error:", e); 
    } finally { 
      setRefreshing(false); 
    }
  };

  useEffect(() => { fetchStats(); },[]);

  // Redesigned Vertical Stat Card
  const StatCard = ({ label, value, icon, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.iconWrapper, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statValue}>{value || 0}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );

  // Elegant Menu Button
  const MenuButton = ({ title, sub, icon, screen, iconColor }) => (
    <TouchableOpacity 
      style={styles.menuBtn} 
      activeOpacity={0.7}
      onPress={() => navigation.navigate(screen)}
    >
      <View style={[styles.menuIconCircle, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuText}>{title}</Text>
        <Text style={styles.menuSub}>{sub}</Text>
      </View>
      <View style={styles.chevronWrapper}>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />
      
      {/* MODERN OVERLAPPING HEADER */}
      <View style={styles.headerBackground}>
        <View style={styles.header}>
          <View>
            <Text style={styles.subtitle}>Good Afternoon, Admin</Text>
            <Text style={styles.title}>{userInfo?.name || 'Dashboard'}</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Profile')}
              style={styles.avatarContainer}
            >
              <Image 
                source={{ uri: userInfo?.profileImage || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }} 
                style={styles.avatar} 
              />
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} onPress={logout} style={styles.logoutBtn}>
              <Ionicons name="log-out-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); fetchStats(); }} 
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* STATS GRID - Negatively margined to overlap the header */}
        <View style={styles.gridContainer}>
          <StatCard label="Total Users" value={stats.totalUsers} icon="people" color={COLORS.success} />
          <StatCard label="Donations" value={stats.totalFood} icon="fast-food" color={COLORS.warning} />
          <StatCard label="Active Items" value={stats.activeDonations} icon="pulse" color={COLORS.info} />
          <StatCard label="Partner NGOs" value={stats.ngos} icon="business" color={COLORS.purple} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Management</Text>
          <Text style={styles.sectionSubtitle}>Control panel options</Text>
        </View>

        {/* MENU OPTIONS */}
        <View style={styles.menuContainer}>
          <MenuButton 
            title="User Management" 
            sub="Verify NGOs & Volunteers" 
            icon="people-circle" 
            screen="UserManagement" 
            iconColor={COLORS.info}
          />
          <MenuButton 
            title="Food Monitoring" 
            sub="Review flagged & expired posts" 
            icon="nutrition" 
            screen="FoodMonitoring" 
            iconColor={COLORS.success}
          />
          <MenuButton 
            title="Reports & Analytics" 
            sub="View system insights & logs" 
            icon="stats-chart" 
            screen="Analytics" 
            iconColor={COLORS.warning}
          />
        </View>
        
        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// Reusable Shadow Style for consistency
const dropShadow = {
  shadowColor: '#1E293B',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 4,
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  
  // Header Styles
  headerBackground: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 35,
    borderBottomLeftRadius: 35,
    paddingBottom: 24,
    paddingTop: Platform.OS === 'android' ? 28 : 20,
    marginBottom: 14,
  },
  header: { 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFF', marginTop: 4 },
  
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: {
    padding: 2,
    backgroundColor: '#FFF',
    borderRadius: 24,
    marginRight: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  logoutBtn: { 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    width: 44, height: 44, 
    borderRadius: 22, 
    justifyContent: 'center', alignItems: 'center' 
  },
  
  // Scroll Area
  scrollContent: { 
    paddingHorizontal: 20,
    paddingTop: 26,
  },
  
  // Grid Styles
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: { 
    width: (width - 55) / 2, 
    backgroundColor: COLORS.card, 
    padding: 18, 
    borderRadius: 20, 
    marginBottom: 15, 
    ...dropShadow,
  },
  iconWrapper: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 12,
  },
  statTextContainer: { gap: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },

  // Typography
  sectionHeader: { marginBottom: 15, paddingHorizontal: 5 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  sectionSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  
  // Menu Buttons
  menuContainer: { gap: 12 },
  menuBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.card, 
    padding: 16, 
    borderRadius: 20, 
    ...dropShadow,
  },
  menuIconCircle: { 
    width: 50, height: 50, 
    borderRadius: 16, 
    justifyContent: 'center', alignItems: 'center', 
    marginRight: 15 
  },
  menuTextContainer: { flex: 1, gap: 4 },
  menuText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  menuSub: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  chevronWrapper: {
    width: 30, height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.bg,
    justifyContent: 'center', alignItems: 'center',
  }
});

export default AdminDashboardScreen;
