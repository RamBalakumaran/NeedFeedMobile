import React, { useContext, useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, StatusBar, SafeAreaView 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons'; 

// THEME COLORS
const COLORS = {
  primary: '#F25F4C', // Coral Orange
  secondary: '#FF897E',
  bg: '#FAFAFA',
  card: '#FFFFFF',
  textDark: '#1D212B',
  textLight: '#9FA1AC',
  inputBg: '#F3F4F6'
};

const HomeScreen = ({ navigation }) => {
  const { userInfo } = useContext(AuthContext);
  const [activeCategory, setActiveCategory] = useState(0);

  const categories = ['All', 'Cooked', 'Raw', 'Bakery', 'Fruits'];

  // 🛡️ ADMIN REDIRECT LOGIC
  // If an Admin logs in, send them straight to the Admin Panel
  useEffect(() => {
    if (userInfo?.role === 'admin') {
      navigation.replace('AdminDashboard'); 
    }
  }, [userInfo]);

  // Reusable Category Pill
  const CategoryItem = ({ name, index }) => (
    <TouchableOpacity 
      style={[styles.catItem, activeCategory === index && styles.catItemActive]}
      onPress={() => setActiveCategory(index)}
    >
      <Text style={[styles.catText, activeCategory === index && styles.catTextActive]}>
        {name}
      </Text>
    </TouchableOpacity>
  );

  // Reusable Action Card (The Big Cards)
  const ActionCard = ({ title, subtitle, image, onPress, icon }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionTextContainer}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{subtitle}</Text>
        <View style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>Open</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFF" style={{marginLeft: 5}}/>
        </View>
      </View>
      {/* If an image URL is provided, use Image, else use Icon */}
      {image ? (
        <Image source={{ uri: image }} style={styles.actionImage} resizeMode="contain" />
      ) : (
        <View style={styles.iconPlaceholder}>
            <Ionicons name={icon} size={60} color={COLORS.primary} style={{opacity: 0.2}} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 1. HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>Current Location</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={18} color={COLORS.primary} />
              <Text style={styles.locationText}>{userInfo?.city || "Select Location"} ▾</Text>
            </View>
          </View>
          
          {/* Profile Avatar */}
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Image 
              source={{ uri: userInfo?.profileImage || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }} 
              style={styles.avatar} 
            />
          </TouchableOpacity>
        </View>

        {/* 2. GREETING */}
        <Text style={styles.greeting}>
          Hello, <Text style={{color: COLORS.primary}}>{userInfo?.name?.split(' ')[0]}</Text>!{"\n"}
          What would you like to do?
        </Text>

        {/* 3. SEARCH BAR (Visual Only) */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.textLight} style={{marginRight: 10}} />
          <TextInput 
            placeholder="Search donations..." 
            placeholderTextColor={COLORS.textLight}
            style={styles.searchInput}
          />
          <View style={styles.filterBtn}>
            <Ionicons name="options-outline" size={20} color="#FFF" />
          </View>
        </View>

        {/* 4. ROLE BASED DASHBOARD CARDS */}
        
        {/* === DONOR SECTION === */}
        {userInfo?.role === 'donor' && (
          <>
            <ActionCard 
              title="Donate Food" 
              subtitle="Post surplus food easily." 
              image="https://img.freepik.com/free-psd/food-delivery-mockup_1310-813.jpg"
              onPress={() => navigation.navigate('Donate')}
            />
            
            {/* ✅ NEW: INCOMING REQUESTS */}
            <ActionCard 
              title="Incoming Requests" 
              subtitle="Approve NGO requests." 
              icon="notifications" 
              onPress={() => navigation.navigate('DonorRequests')}
            />

            <ActionCard 
              title="My History" 
              subtitle="View your past donations." 
              icon="time" 
              onPress={() => navigation.navigate('MyDonations')}
            />
          </>
        )}

        {/* === NGO SECTION === */}
        {userInfo?.role === 'ngo' && (
          <>
            <ActionCard 
              title="Find Food" 
              subtitle="Fresh meals nearby." 
              image="https://img.freepik.com/free-photo/fresh-gourmet-meal-beef-taco-salad-plate-generated-by-ai_188544-13382.jpg"
              onPress={() => navigation.navigate('AvailableFood')}
            />
            <ActionCard 
              title="My Requests" 
              subtitle="Track status & pickups." 
              image="https://cdn-icons-png.flaticon.com/512/3081/3081840.png"
              onPress={() => navigation.navigate('NGODashboard')}
            />
          </>
        )}

        {/* === VOLUNTEER SECTION === */}
        {userInfo?.role === 'volunteer' && (
          <ActionCard 
            title="Pickup Tasks" 
            subtitle="View deliveries nearby." 
            image="https://cdn-icons-png.flaticon.com/512/2830/2830305.png"
            onPress={() => navigation.navigate('VolunteerDashboard')}
          />
        )}

        {/* 5. CATEGORIES (Visual Only) */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {categories.map((cat, index) => (
            <CategoryItem key={index} name={cat} index={index} />
          ))}
        </ScrollView>

        {/* 6. POPULAR SECTION (Mock Data) */}
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Impact Leaders</Text>
          <Text style={styles.seeAll}>See all</Text>
        </View>

        <View style={styles.popularCard}>
          <Image source={{uri: 'https://img.freepik.com/free-photo/chicken-wings-barbecue-sweetly-sour-sauce-picnic-summer-menu-tasty-food-top-view-flat-lay_2829-6471.jpg'}} style={styles.popImage} />
          <View style={styles.popContent}>
            <Text style={styles.popTitle}>Top Donor: Ram</Text>
            <Text style={styles.popSub}>150+ Meals Donated</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>5.0 (Verified)</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addBtn}>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 24, paddingBottom: 50 },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerLabel: { color: COLORS.textLight, fontSize: 12, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { color: COLORS.textDark, fontSize: 16, fontWeight: 'bold', marginLeft: 4 },
  avatar: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#eee', borderWidth: 1, borderColor: '#EEE' },

  // Greeting
  greeting: { fontSize: 28, fontWeight: '800', color: COLORS.textDark, lineHeight: 38, marginBottom: 25 },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.textDark, paddingVertical: 8 },
  filterBtn: { backgroundColor: COLORS.primary, padding: 10, borderRadius: 12 },

  // Action Card
  actionCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 20, position: 'relative', overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  actionTextContainer: { flex: 1, zIndex: 2 },
  actionTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 8 },
  actionSub: { fontSize: 12, color: COLORS.textLight, marginBottom: 20 },
  actionBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, alignSelf: 'flex-start', flexDirection:'row', alignItems:'center' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  actionImage: { width: 120, height: 120, position: 'absolute', right: -10, bottom: -10, borderRadius: 60, opacity: 0.9 },
  iconPlaceholder: { position: 'absolute', right: 20, bottom: 20 },

  // Categories
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 15 },
  catScroll: { marginBottom: 30 },
  catItem: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, backgroundColor: '#FFF', marginRight: 10, borderWidth: 1, borderColor: '#F0F0F0' },
  catItemActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catText: { color: COLORS.textLight, fontWeight: '600' },
  catTextActive: { color: '#FFF' },

  // Popular
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  seeAll: { color: COLORS.primary, fontWeight: 'bold' },
  popularCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 20, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  popImage: { width: 70, height: 70, borderRadius: 15 },
  popContent: { flex: 1, marginLeft: 15 },
  popTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  popSub: { fontSize: 12, color: COLORS.textLight, marginVertical: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 12, color: COLORS.textDark, marginLeft: 4, fontWeight: 'bold' },
  addBtn: { backgroundColor: COLORS.textDark, padding: 10, borderRadius: 12 },
});

export default HomeScreen;