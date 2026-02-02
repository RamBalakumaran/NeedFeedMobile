import React, { useContext, useState } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, Alert, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';

const COLORS = { primary: '#FF6B4A', bg: '#F5F5F5', card: '#FFF', text: '#1D212B', gray: '#9FA1AC' };

const ProfileScreen = ({ navigation }) => {
  const { userInfo, logout, updateUser, userToken } = useContext(AuthContext);
  const [uploading, setUploading] = useState(false);

  // 📸 Image Upload Logic
  const handleUpdateImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need gallery permissions.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) uploadImage(result.assets[0].uri);
  };

  const uploadImage = async (uri) => {
    setUploading(true);
    try {
      const formData = new FormData();
      let filename = uri.split('/').pop();
      let match = /\.(\w+)$/.exec(filename);
      let type = match ? `image/${match[1]}` : `image/jpeg`;
      formData.append('profileImage', { uri, name: filename, type });

      const res = await client.put('/auth/update-profile-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${userToken}` },
      });
      updateUser(res.data); 
      Alert.alert("Success", "Profile photo updated!");
    } catch (error) {
      console.log("Upload Error:", error);
      Alert.alert("Error", "Failed to update image.");
    } finally {
      setUploading(false);
    }
  };

  const InfoItem = ({ label, value }) => (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "Not Provided"}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6B4A" />
      
      {/* 1. COMPACT HEADER */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={{width: 18}} /> 
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        

        {/* ✅ PROFILE CARD (Starts below header) */}
        <View style={styles.profileCard}>
          {/* ✅ AVATAR (Floating ON TOP) */}
        <View style={styles.avatarContainer}>
          {uploading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.avatar} />
          ) : (
            <Image 
              source={{ uri: userInfo?.profileImage || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }} 
              style={styles.avatar} 
            />
          )}
          <TouchableOpacity style={styles.editBadge} onPress={handleUpdateImage}>
            <Ionicons name="camera" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
          <Text style={styles.userName}>{userInfo?.name || "User Name"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{userInfo?.role?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.divider} />
          <InfoItem label="Email" value={userInfo?.email} />
          <InfoItem label="Phone" value={userInfo?.phone} />
          <InfoItem label="Location" value={`${userInfo?.address || ''}, ${userInfo?.city || ''}`} />
        </View>

        {/* Dynamic Role Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.divider} />
          {userInfo?.role === 'donor' && (
            <View>
              <InfoItem label="Type" value={userInfo?.donorType} />
              <InfoItem label="Availability" value={userInfo?.availabilityTime} />
            </View>
          )}
          {userInfo?.role === 'ngo' && (
            <View>
              <InfoItem label="Organization" value={userInfo?.organizationName} />
              <InfoItem label="License" value={userInfo?.licenseNumber} />
            </View>
          )}
          {userInfo?.role === 'volunteer' && (
            <View>
              <InfoItem label="Vehicle" value={userInfo?.vehicleType} />
              <InfoItem label="Area" value={userInfo?.preferredArea} />
            </View>
          )}
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.editBtn} onPress={() => Alert.alert("Coming Soon", "Edit Profile form will be here.")}>
          <Text style={styles.editBtnText}>Edit Profile Details</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
        

        <View style={{height: 40}} /> 
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  
  // ✅ 1. REDUCED HEADER HEIGHT
  header: {
    height: 120, // Reduced from 180
    backgroundColor: '#FF6B4A',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: Platform.OS === 'android' ? 40 : 50, // Adjust for Status Bar
    paddingHorizontal: 20
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 5 },

  scrollContent: { paddingHorizontal: 20, alignItems: 'center' }, 

  // ✅ 2. AVATAR STYLING (The Sandwich Method)
  avatarContainer: {
    zIndex: 10,     // Ensures it sits ON TOP of the card
    elevation: 10,  // Android shadow priority
    position: 'relative',
    marginBottom: 10
  },
  avatar: { 
    width: 100, height: 100, borderRadius: 50, 
    borderWidth: 4, borderColor: '#FFF', backgroundColor: '#EEE' 
  },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FF6B4A',
    borderRadius: 20, padding: 8, borderWidth: 3, borderColor: '#FFF',
    elevation: 11
  },

  // ✅ 3. CARD STYLING
  profileCard: {
    width: '100%',
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    marginTop:10,
    paddingBottom: 20, 
    paddingTop: 20, 
    alignItems: 'center',
    elevation: 2, 
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, 
    marginBottom: 20,
    zIndex: 1 
  },

  userName: { fontSize: 22, fontWeight: 'bold', color: '#263238', marginBottom: 5 },
  roleBadge: { backgroundColor: '#FFEBEE', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 },
  roleText: { color: '#FF6B4A', fontWeight: 'bold', fontSize: 12 },

  sectionCard: {
    width: '100%', backgroundColor: '#FFF', borderRadius: 15, padding: 20, marginBottom: 15, elevation: 2
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#37474F' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  
  infoItem: { marginBottom: 12 },
  infoLabel: { fontSize: 12, color: '#90A4AE', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#455A64', fontWeight: '500' },

  editBtn: {
    width: '100%', backgroundColor: '#FFF', padding: 16, borderRadius: 15, alignItems: 'center',
    borderWidth: 1, borderColor: '#FF6B4A', marginBottom: 10
  },
  editBtnText: { color: '#FF6B4A', fontWeight: 'bold', fontSize: 16 },

  logoutBtn: {
    width: '100%', backgroundColor: '#FFF', padding: 16, borderRadius: 15, alignItems: 'center',
    borderWidth: 1, borderColor: '#D32F2F'
  },
  logoutBtnText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },
});

export default ProfileScreen;