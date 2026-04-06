import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';

const COLORS = {
  primary: '#FF6B4A',
  background: '#F6F7FB',
  card: '#FFFFFF',
  text: '#1D2433',
  muted: '#8D97A6',
  border: '#E7EAF0',
  input: '#F8F9FC',
  danger: '#D32F2F',
};

const buildFormFromUser = (user) => ({
  name: user?.name || '',
  email: user?.email || '',
  phone: user?.phone || '',
  address: user?.address || '',
  city: user?.city || '',
  donorType: user?.donorType || 'Individual',
  donorFoodCategory: user?.donorFoodCategory || 'Both',
  availabilityTime: user?.availabilityTime || '',
  organizationName: user?.organizationName || '',
  licenseNumber: user?.licenseNumber || '',
  capacity: user?.capacity ? String(user.capacity) : '',
  vehicleType: user?.vehicleType || '',
  preferredArea: user?.preferredArea || '',
});

const ProfileInput = ({ label, value, onChangeText, editable = true, keyboardType, multiline = false }) => (
  <View style={styles.inputBlock}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      keyboardType={keyboardType}
      multiline={multiline}
      style={[
        styles.textInput,
        multiline && styles.multilineInput,
        !editable && styles.readonlyInput,
      ]}
      placeholderTextColor="#AAB2BF"
    />
  </View>
);

const InfoItem = ({ label, value }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || 'Not Provided'}</Text>
  </View>
);

const ProfileScreen = ({ navigation }) => {
  const { userInfo, logout, updateUser, userToken } = useContext(AuthContext);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(buildFormFromUser(userInfo));

  useEffect(() => {
    setForm(buildFormFromUser(userInfo));
  }, [userInfo]);

  const roleLabel = useMemo(() => (
    userInfo?.role === 'ngo'
      ? 'NGO'
      : (userInfo?.role || 'user').toUpperCase()
  ), [userInfo?.role]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdateImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need gallery permissions.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    setUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('profileImage', { uri, name: filename, type });

      const res = await client.put('/auth/update-profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${userToken}`,
        },
      });

      updateUser(res.data);
      Alert.alert('Success', 'Profile photo updated!');
    } catch (error) {
      console.log('Upload Error:', error);
      Alert.alert('Error', 'Failed to update image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!form.name || !form.email || !form.phone || !form.address || !form.city) {
      Alert.alert('Missing details', 'Please fill name, email, phone, address, and city.');
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      ...(userInfo?.role === 'donor'
        ? {
            donorType: form.donorType,
            donorFoodCategory: form.donorFoodCategory,
            availabilityTime: form.availabilityTime.trim(),
          }
        : {}),
      ...(userInfo?.role === 'ngo'
        ? {
            organizationName: form.organizationName.trim(),
            licenseNumber: form.licenseNumber.trim(),
            capacity: form.capacity.trim(),
          }
        : {}),
      ...(userInfo?.role === 'volunteer'
        ? {
            vehicleType: form.vehicleType.trim(),
            preferredArea: form.preferredArea.trim(),
          }
        : {}),
    };

    try {
      const res = await client.put('/auth/update-profile', payload, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      updateUser(res.data);
      setIsEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setForm(buildFormFromUser(userInfo));
    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity
            onPress={() => (isEditing ? handleCancelEdit() : setIsEditing(true))}
            style={styles.headerAction}
          >
            <Text style={styles.headerActionText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {uploading ? (
              <View style={styles.avatarLoader}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
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

          <Text style={styles.userName}>{userInfo?.name || 'User Name'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{roleLabel}</Text>
          </View>
        </View>

        {!isEditing ? (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <View style={styles.divider} />
              <InfoItem label="Email" value={userInfo?.email} />
              <InfoItem label="Phone" value={userInfo?.phone} />
              <InfoItem label="City" value={userInfo?.city} />
              <InfoItem label="Address" value={userInfo?.address} />
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.divider} />
              {userInfo?.role === 'donor' && (
                <>
                  <InfoItem label="Donor Type" value={userInfo?.donorType} />
                  <InfoItem label="Food Preference" value={userInfo?.donorFoodCategory} />
                  <InfoItem label="Availability" value={userInfo?.availabilityTime} />
                </>
              )}
              {userInfo?.role === 'ngo' && (
                <>
                  <InfoItem label="Organization" value={userInfo?.organizationName} />
                  <InfoItem label="License" value={userInfo?.licenseNumber} />
                  <InfoItem label="Capacity" value={userInfo?.capacity ? String(userInfo.capacity) : ''} />
                </>
              )}
              {userInfo?.role === 'volunteer' && (
                <>
                  <InfoItem label="Vehicle" value={userInfo?.vehicleType} />
                  <InfoItem label="Preferred Area" value={userInfo?.preferredArea} />
                </>
              )}
            </View>

            <TouchableOpacity style={styles.primaryOutlineButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.primaryOutlineButtonText}>Edit Profile Details</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>
            <View style={styles.divider} />

            <ProfileInput label="Full Name" value={form.name} onChangeText={(value) => updateField('name', value)} />
            <ProfileInput label="Email" value={form.email} onChangeText={(value) => updateField('email', value)} keyboardType="email-address" />
            <ProfileInput label="Phone" value={form.phone} onChangeText={(value) => updateField('phone', value)} keyboardType="phone-pad" />
            <ProfileInput label="City" value={form.city} onChangeText={(value) => updateField('city', value)} />
            <ProfileInput label="Address" value={form.address} onChangeText={(value) => updateField('address', value)} multiline />

            {userInfo?.role === 'donor' && (
              <>
                <ProfileInput label="Donor Type" value={form.donorType} onChangeText={(value) => updateField('donorType', value)} />
                <ProfileInput label="Food Preference" value={form.donorFoodCategory} onChangeText={(value) => updateField('donorFoodCategory', value)} />
                <ProfileInput label="Availability" value={form.availabilityTime} onChangeText={(value) => updateField('availabilityTime', value)} />
              </>
            )}

            {userInfo?.role === 'ngo' && (
              <>
                <ProfileInput label="Organization Name" value={form.organizationName} onChangeText={(value) => updateField('organizationName', value)} />
                <ProfileInput label="License Number" value={form.licenseNumber} onChangeText={(value) => updateField('licenseNumber', value)} />
                <ProfileInput label="Capacity" value={form.capacity} onChangeText={(value) => updateField('capacity', value)} keyboardType="numeric" />
              </>
            )}

            {userInfo?.role === 'volunteer' && (
              <>
                <ProfileInput label="Vehicle Type" value={form.vehicleType} onChangeText={(value) => updateField('vehicleType', value)} />
                <ProfileInput label="Preferred Area" value={form.preferredArea} onChangeText={(value) => updateField('preferredArea', value)} />
              </>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 124,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: Platform.OS === 'android' ? 40 : 52,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
  },
  headerAction: {
    minWidth: 52,
    alignItems: 'flex-end',
  },
  headerActionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 22,
    marginBottom: 18,
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 4,
    borderColor: '#FFF',
    backgroundColor: '#EEE',
  },
  avatarLoader: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 4,
    borderColor: '#FFF',
    backgroundColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },
  roleBadge: {
    marginTop: 8,
    backgroundColor: '#FFF0EB',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  roleText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: '#EFF2F6',
    marginVertical: 12,
  },
  infoItem: {
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    color: '#435063',
    fontWeight: '600',
  },
  inputBlock: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#516072',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  readonlyInput: {
    opacity: 0.7,
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
  },
  primaryOutlineButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryOutlineButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  logoutBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFD7D7',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontWeight: '900',
    fontSize: 16,
  },
  bottomSpacer: {
    height: 30,
  },
});

export default ProfileScreen;
