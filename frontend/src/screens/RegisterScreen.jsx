import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import client from '../api/client';
import { getPortalConfig, SIGNUP_ROLE_ORDER } from '../constants/authPortals';

const COLORS = {
  primary: '#FF624C',
  background: '#FFFFFF',
  text: '#1E2433',
  muted: '#9BA5B1',
  input: '#F6F7FB',
  surface: '#FFF5F2',
  border: '#FFD9D1',
};

const resolveRole = (role) => (SIGNUP_ROLE_ORDER.includes(role) ? role : 'donor');

const InputField = ({ containerStyle, style, ...props }) => (
  <View style={containerStyle}>
    <TextInput
      style={[styles.input, style]}
      placeholderTextColor="#7D8897"
      {...props}
    />
  </View>
);

const ChoiceChip = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.choiceChip, selected && styles.choiceChipActive]}
    onPress={onPress}
    activeOpacity={0.88}
  >
    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const RegisterScreen = ({ navigation, route }) => {
  const [selectedRole, setSelectedRole] = useState(resolveRole(route.params?.role));
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    address: '',
  });
  const [donorData, setDonorData] = useState({
    donorType: 'Individual',
    foodCategory: 'Both',
    availability: '',
  });
  const [ngoData, setNgoData] = useState({
    orgName: '',
    license: '',
    capacity: '',
  });
  const [volunteerData, setVolunteerData] = useState({
    vehicle: '',
    area: '',
  });

  useEffect(() => {
    setSelectedRole(resolveRole(route.params?.role));
  }, [route.params?.role]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        if (active) {
          setCoords(location.coords);
        }
      } catch (error) {
        console.log('Location lookup skipped:', error.message);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const roleDetailTitle = {
    donor: 'Donor Details',
    ngo: 'Organization Info',
    volunteer: 'Volunteer Details',
  }[selectedRole];

  const updateForm = (key, value) => setForm({ ...form, [key]: value });
  const updateDonor = (key, value) => setDonorData({ ...donorData, [key]: value });
  const updateNgo = (key, value) => setNgoData({ ...ngoData, [key]: value });
  const updateVolunteer = (key, value) => setVolunteerData({ ...volunteerData, [key]: value });

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.phone || !form.city || !form.address) {
      alert('Please fill all required details.');
      return;
    }

    if (selectedRole === 'ngo' && (!ngoData.orgName || !ngoData.license || !ngoData.capacity)) {
      alert('Please complete your organization details.');
      return;
    }

    if (selectedRole === 'volunteer' && (!volunteerData.vehicle || !volunteerData.area)) {
      alert('Please complete your volunteer details.');
      return;
    }

    setLoading(true);

    const payload = {
      ...form,
      email: form.email.trim(),
      role: selectedRole,
      latitude: coords ? coords.latitude : 0,
      longitude: coords ? coords.longitude : 0,
      ...(selectedRole === 'donor'
        ? {
            donorType: donorData.donorType,
            donorFoodCategory: donorData.foodCategory,
            availabilityTime: donorData.availability,
          }
        : {}),
      ...(selectedRole === 'ngo'
        ? {
            organizationName: ngoData.orgName,
            licenseNumber: ngoData.license,
            capacity: ngoData.capacity,
          }
        : {}),
      ...(selectedRole === 'volunteer'
        ? {
            vehicleType: volunteerData.vehicle,
            preferredArea: volunteerData.area,
          }
        : {}),
    };

    try {
      const res = await client.post('/auth/register', payload);
      if (res.status === 201) {
        alert('Account created successfully!');
        navigation.replace('Login');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login'))}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={28} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join us to bridge the hunger gap.</Text>

          <Text style={styles.rolePrompt}>I am a...</Text>
          <View style={styles.roleTabsRail}>
            {SIGNUP_ROLE_ORDER.map((role) => {
              const rolePortal = getPortalConfig(role);
              const active = selectedRole === role;

              return (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleTab, active && styles.roleTabActive]}
                  onPress={() => setSelectedRole(role)}
                  activeOpacity={0.88}
                >
                  <Ionicons
                    name={rolePortal.icon}
                    size={16}
                    color={active ? '#FFF' : '#A8AFBC'}
                  />
                  <Text style={[styles.roleTabText, active && styles.roleTabTextActive]}>
                    {rolePortal.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Personal Info</Text>

          <View style={styles.formCard}>
            <InputField
              containerStyle={styles.inputSpacing}
              placeholder="Full Name"
              value={form.name}
              onChangeText={(value) => updateForm('name', value)}
            />

            <InputField
              containerStyle={styles.inputSpacing}
              placeholder="Email Address"
              value={form.email}
              onChangeText={(value) => updateForm('email', value)}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <InputField
              containerStyle={styles.inputSpacing}
              placeholder="Password"
              value={form.password}
              onChangeText={(value) => updateForm('password', value)}
              secureTextEntry
            />

            <View style={styles.twoColumnRow}>
              <InputField
                containerStyle={styles.flexItem}
                placeholder="Phone"
                value={form.phone}
                onChangeText={(value) => updateForm('phone', value)}
                keyboardType="phone-pad"
              />
              <InputField
                containerStyle={styles.flexItem}
                placeholder="City"
                value={form.city}
                onChangeText={(value) => updateForm('city', value)}
              />
            </View>

            <InputField
              containerStyle={styles.inputSpacing}
              placeholder="Full Address"
              value={form.address}
              onChangeText={(value) => updateForm('address', value)}
            />

            <View style={styles.detailBlock}>
              <Text style={styles.detailTitle}>{roleDetailTitle}</Text>

              {selectedRole === 'donor' && (
                <>
                  <Text style={styles.detailLabel}>Donor Type</Text>
                  <View style={styles.chipWrap}>
                    {['Individual', 'Restaurant', 'Hotel', 'Event'].map((item) => (
                      <ChoiceChip
                        key={item}
                        label={item}
                        selected={donorData.donorType === item}
                        onPress={() => updateDonor('donorType', item)}
                      />
                    ))}
                  </View>

                  <Text style={styles.detailLabel}>Food Preference</Text>
                  <View style={styles.chipWrap}>
                    {['Veg', 'Non-Veg', 'Both'].map((item) => (
                      <ChoiceChip
                        key={item}
                        label={item}
                        selected={donorData.foodCategory === item}
                        onPress={() => updateDonor('foodCategory', item)}
                      />
                    ))}
                  </View>

                  <InputField
                    placeholder="Availability (e.g. 9AM - 6PM)"
                    value={donorData.availability}
                    onChangeText={(value) => updateDonor('availability', value)}
                  />
                </>
              )}

              {selectedRole === 'ngo' && (
                <>
                  <InputField
                    containerStyle={styles.inputSpacing}
                    placeholder="Organization Name"
                    value={ngoData.orgName}
                    onChangeText={(value) => updateNgo('orgName', value)}
                  />
                  <InputField
                    containerStyle={styles.inputSpacing}
                    placeholder="License / Reg Number"
                    value={ngoData.license}
                    onChangeText={(value) => updateNgo('license', value)}
                  />
                  <InputField
                    placeholder="Capacity (Meals/People)"
                    value={ngoData.capacity}
                    onChangeText={(value) => updateNgo('capacity', value)}
                    keyboardType="numeric"
                  />
                </>
              )}

              {selectedRole === 'volunteer' && (
                <>
                  <InputField
                    containerStyle={styles.inputSpacing}
                    placeholder="Vehicle Type (Bike/Car/Van)"
                    value={volunteerData.vehicle}
                    onChangeText={(value) => updateVolunteer('vehicle', value)}
                  />
                  <InputField
                    placeholder="Preferred Area"
                    value={volunteerData.area}
                    onChangeText={(value) => updateVolunteer('area', value)}
                  />
                </>
              )}
            </View>

            {!coords && (
              <Text style={styles.helperText}>
                Location access is optional. If allowed, it helps coordinate pickups more accurately.
              </Text>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Sign Up</Text>}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 22,
    paddingBottom: 40,
  },
  backButton: {
    width: 68,
    height: 68,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAECEF',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  title: {
    marginTop: 28,
    color: COLORS.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
  },
  rolePrompt: {
    marginTop: 42,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  roleTabsRail: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 64,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: '#F8F9FC',
  },
  roleTabActive: {
    backgroundColor: COLORS.primary,
  },
  roleTabText: {
    color: '#A8AFBC',
    fontSize: 12,
    fontWeight: '800',
    flexShrink: 1,
  },
  roleTabTextActive: {
    color: '#FFF',
  },
  sectionTitle: {
    marginTop: 34,
    marginBottom: 18,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
  },
  inputSpacing: {
    marginBottom: 18,
  },
  input: {
    minHeight: 82,
    borderRadius: 20,
    backgroundColor: COLORS.input,
    paddingHorizontal: 24,
    paddingVertical: 22,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 18,
  },
  flexItem: {
    flex: 1,
  },
  detailBlock: {
    marginTop: 6,
    padding: 24,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 24,
  },
  detailLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  choiceChip: {
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#F4B7A9',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  choiceChipText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  choiceChipTextActive: {
    color: '#FFF',
  },
  helperText: {
    marginTop: 14,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 26,
    minHeight: 74,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  footerRow: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },
});

export default RegisterScreen;

