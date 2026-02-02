import React, { useState, useCallback, useContext } from 'react';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image, RefreshControl, ActivityIndicator, SafeAreaView, Alert 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext'; // ✅ Import AuthContext

const COLORS = { 
  primary: '#F25F4C', 
  bg: '#FAFAFA', 
  card: '#FFFFFF', 
  textDark: '#1D212B', 
  textLight: '#9FA1AC',
  green: '#4CAF50',
  red: '#E53935'
};

const AvailableFoodScreen = ({ navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext); // ✅ Get Token & User Info
  const [foodList, setFoodList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reqLoading, setReqLoading] = useState(false); // Track request status

  const fetchFood = async () => {
    try {
      const res = await client.get('/food/available'); 
      setFoodList(res.data);
    } catch (error) { 
      console.log("Fetch Error:", error); 
    } 
    finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFood();
    }, [])
  );

  // ✅ FIXED HANDLE REQUEST FUNCTION
  const handleRequest = async (item) => {
    // 1. Check if user is trying to request their own food
    if (item.donor?._id === userInfo?._id || item.donor?._id === userInfo?.id) {
      return Alert.alert("Action Denied", "You cannot request your own donation.");
    }

    // 2. Check Role (Optional: Only NGOs can request)
    if (userInfo?.role === 'donor' || userInfo?.role === 'volunteer') {
       return Alert.alert("Role Error", "Only NGOs or Receivers can request food.");
    }

    setReqLoading(true);

    try {
      console.log("Requesting Food ID:", item._id);

      // 3. API Call
      const res = await client.put(
        `/food/request/${item._id}`, 
        {}, // Empty body
        { headers: { Authorization: `Bearer ${userToken}` } } // ✅ Send Token
      );

      // 4. Success Handling
      Alert.alert("Success", "Request Sent! Wait for donor approval.");
      fetchFood(); // Refresh list (item should disappear)

    } catch (error) {
      console.log("Request Error:", error.response?.data);
      // 5. Show Exact Error from Backend
      const errMsg = error.response?.data?.message || "Could not connect to server";
      Alert.alert("Request Failed", errMsg);
    } finally {
      setReqLoading(false);
    }
  };

  // Helper: Format Time
  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper: Calculate Time Left
  const getTimeLeft = (expiryTime) => {
    const now = new Date();
    const expiry = new Date(expiryTime);
    const diffMs = expiry - now;
    if (diffMs <= 0) return "Expired";
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    if (diffHrs > 24) return `${Math.floor(diffHrs/24)} days left`;
    return `${diffHrs}h ${diffMins}m left`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.foodCard}>
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.imageUrl }} style={styles.foodImage} />
        <View style={styles.badge}><Text style={styles.badgeText}>{item.category}</Text></View>
        <View style={[styles.typeBadge, item.foodType === 'Non-Veg' ? styles.bgRed : styles.bgGreen]}>
          <Text style={styles.typeText}>{item.foodType}</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.foodTitle}>{item.title}</Text>
        <View style={styles.donorRow}>
          <Ionicons name="person-circle-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.donorText}> By {item.donor && item.donor.name ? item.donor.name : "Anonymous"}</Text>
        </View>

        <View style={styles.timeGrid}>
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Prepared</Text>
            <Text style={styles.timeValue}>🕒 {formatTime(item.preparationTime)}</Text>
          </View>
          <View style={styles.verticalLine} />
          <View style={styles.timeItem}>
            <Text style={styles.timeLabel}>Expires</Text>
            <Text style={[styles.timeValue, {color: COLORS.red}]}>🔥 {getTimeLeft(item.expiryTime)}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.qtyText}>📦 {item.quantity}</Text>
          <Text style={styles.storageText}>🌡️ {item.storageInstruction || "Normal"}</Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.mapBtn}
            onPress={() => navigation.navigate('MapScreen', { 
              latitude: item.location.coordinates[1], 
              longitude: item.location.coordinates[0],
              title: item.title 
            })}
          >
            <Ionicons name="map-outline" size={20} color={COLORS.primary} />
            <Text style={styles.mapBtnText}>Map</Text>
          </TouchableOpacity>

          {/* ✅ REQUEST BUTTON */}
          <TouchableOpacity 
            style={styles.requestBtn}
            onPress={() => handleRequest(item)}
            disabled={reqLoading}
          >
            {reqLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.requestBtnText}>Request Food</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Donations</Text>
        <TouchableOpacity onPress={() => {setLoading(true); fetchFood();}}>
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={foodList}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFood(); }} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{alignItems:'center', marginTop:50}}>
              <Text style={{fontSize:40}}>🍽️</Text>
              <Text style={{color:COLORS.textLight, marginTop:10}}>No food available nearby.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.bg },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  listContent: { padding: 20, paddingBottom: 40 },
  foodCard: { backgroundColor: COLORS.card, borderRadius: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, overflow: 'hidden' },
  imageWrapper: { height: 160, width: '100%', position: 'relative' },
  foodImage: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: COLORS.textDark },
  typeBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bgGreen: { backgroundColor: '#E8F5E9' },
  bgRed: { backgroundColor: '#FFEBEE' },
  typeText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  infoContainer: { padding: 16 },
  foodTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  donorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  donorText: { color: COLORS.textLight, fontSize: 13, marginLeft: 5 },
  timeGrid: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, marginBottom: 15, justifyContent: 'space-around' },
  timeItem: { alignItems: 'center' },
  timeLabel: { fontSize: 11, color: COLORS.textLight, marginBottom: 2 },
  timeValue: { fontSize: 13, fontWeight: 'bold', color: COLORS.textDark },
  verticalLine: { width: 1, backgroundColor: '#EEE' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  qtyText: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  storageText: { fontSize: 13, color: COLORS.textLight },
  actionRow: { flexDirection: 'row', gap: 10 },
  mapBtn: { flex: 0.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12, paddingVertical: 12 },
  mapBtnText: { color: COLORS.primary, fontWeight: 'bold', marginLeft: 5 },
  requestBtn: { flex: 0.7, backgroundColor: COLORS.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center', paddingVertical: 12, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3 },
  requestBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});

export default AvailableFoodScreen;