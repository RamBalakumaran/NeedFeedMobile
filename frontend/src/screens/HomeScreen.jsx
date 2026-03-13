import React, { useContext, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, StatusBar, SafeAreaView, Platform 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#F25F4C',      // Coral red from screenshot
  primaryLight: '#FCE5E2', // Soft tint for the large background icons
  bg: '#F8F9FA',           // Clean off-white background
  card: '#FFFFFF',
  textDark: '#1A1D26',     // Very dark text for titles
  textLight: '#9498A3',    // Soft gray for subtitles
};

const HomeScreen = ({ navigation }) => {
  const { userInfo } = useContext(AuthContext);

  useEffect(() => {
    // Redirect admins to their specific dashboard
    if (userInfo?.role === 'admin') {
      navigation.replace('AdminRole');
    }
  }, [userInfo]);

  // Redesigned Card matching your screenshot UI perfectly
  const ActionCard = ({ title, subtitle, image, iconName, onPress }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{subtitle}</Text>
        
        <View style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>Open</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" style={styles.btnIcon} />
        </View>
      </View>
      
      {/* Right side graphic (Image or Large Tinted Icon) */}
      <View style={styles.graphicContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.actionImage} resizeMode="contain" />
        ) : (
          <Ionicons name={iconName} size={75} color={COLORS.primaryLight} style={styles.largeIcon} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      {/* Sleek Minimal Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>
            Hello, {userInfo?.name?.split(' ')[0] || 'Donor'}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={14} color={COLORS.primary} />
            <Text style={styles.locationText}>{userInfo?.city || 'Select Location'} ▼</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
          <Image 
            source={{ uri: userInfo?.profileImage || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content Scroll */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* DONOR ESSENTIAL CARDS ONLY */}
        {userInfo?.role === 'donor' && (
          <View style={styles.cardsWrapper}>
            <ActionCard
              title='Donate Food'
              subtitle='Post surplus food easily.' 
              image='https://img.freepik.com/free-psd/food-delivery-mockup_1310-813.jpg'
              onPress={() => navigation.navigate('Donate')}
            />
            <ActionCard
              title='Incoming Requests'
              subtitle='Approve NGO requests.'
              iconName='notifications'
              onPress={() => navigation.navigate('DonorRequests')}
            />
            <ActionCard
              title='My History'
              subtitle='View your past donations.'
              iconName='time'
              onPress={() => navigation.navigate('MyDonations')}
            />
          </View>
        )}

        {/* NGO CARDS */}
        {userInfo?.role === 'ngo' && (
          <View style={styles.cardsWrapper}>
            <ActionCard
              title='Find Food'
              subtitle='Browse nearby surplus meals.'
              iconName='search'
              onPress={() => navigation.navigate('AvailableFood')}
            />
            <ActionCard
              title='My Requests'
              subtitle='Track request status & pickups.'
              iconName='file-tray-full'
              onPress={() => navigation.navigate('NGODashboard')}
            />
          </View>
        )}

        {/* VOLUNTEER CARDS */}
        {userInfo?.role === 'volunteer' && (
          <View style={styles.cardsWrapper}>
            <ActionCard
              title='Pickup Tasks'
              subtitle='View deliveries near you.'
              iconName='bicycle'
              onPress={() => navigation.navigate('VolunteerDashboard')}
            />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 10,
  },
  headerGreeting: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: COLORS.textDark, 
    marginBottom: 4 
  },
  locationRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  locationText: { 
    color: COLORS.textLight, 
    fontSize: 13, 
    fontWeight: '600', 
    marginLeft: 4 
  },
  avatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#EAEAEA' 
  },

  // Main Scroll Area
  scrollContent: { 
    paddingHorizontal: 20, 
    paddingTop: 15,
    paddingBottom: 40 
  },
  cardsWrapper: {
    gap: 16, // Adds consistent spacing between cards
  },

  // Redesigned Action Cards
  actionCard: { 
    backgroundColor: COLORS.card, 
    borderRadius: 24, 
    padding: 24, 
    flexDirection: 'row', 
    alignItems: 'center', 
    // Beautiful soft shadow matching the screenshot
    shadowColor: '#000', 
    shadowOpacity: 0.06, 
    shadowRadius: 15, 
    shadowOffset: { width: 0, height: 8 }, 
    elevation: 4,
  },
  actionTextContainer: { 
    flex: 1, 
    paddingRight: 10 
  },
  actionTitle: { 
    fontSize: 20, 
    fontWeight: '900', // Extra bold like the screenshot
    color: COLORS.textDark, 
    marginBottom: 6,
    letterSpacing: -0.5, // Slightly tightens the text for that modern feel
  },
  actionSub: { 
    fontSize: 13, 
    fontWeight: '600',
    color: COLORS.textLight, 
    marginBottom: 20 
  },
  
  // Open Button
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.primary, 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20, // Pill shape
    alignSelf: 'flex-start' 
  },
  actionBtnText: { 
    color: '#FFF', 
    fontWeight: '700', 
    fontSize: 14 
  },
  btnIcon: { 
    marginLeft: 6 
  },

  // Graphics (Right side)
  graphicContainer: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionImage: { 
    width: 90, 
    height: 90, 
    borderRadius: 12,
  },
  largeIcon: {
    // Shifts the icon slightly to match the off-center crop effect in your image
    transform: [{ translateX: 10 }], 
  }
});

export default HomeScreen;