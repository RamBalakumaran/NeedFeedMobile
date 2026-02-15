import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView, Platform, KeyboardAvoidingView, StatusBar 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';

const COLORS = { primary: '#F25F4C', bg: '#FFFFFF', input: '#F6F8FA', text: '#1D212B', gray: '#9FA1AC' };

const RegisterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('donor');
  
  // 1. Common Data
  const [form, setForm] = useState({ name:'', email:'', password:'', phone:'', city:'', address:'' });
  
  // 2. Role Specific Data
  const [donorData, setDonorData] = useState({ donorType: 'Individual', foodCategory: 'Both', availability: '' });
  const [ngoData, setNgoData] = useState({ orgName: '', license: '', capacity: '' });
  const [volData, setVolData] = useState({ vehicle: '', area: '' });

  // Helpers
  const updateForm = (k, v) => setForm({...form, [k]: v});
  const updateDonor = (k, v) => setDonorData({...donorData, [k]: v});
  const updateNgo = (k, v) => setNgoData({...ngoData, [k]: v});
  const updateVol = (k, v) => setVolData({...volData, [k]: v});

  const handleRegister = async () => {
    if(!form.name || !form.email || !form.password || !form.phone) return alert("Please fill essential details");
    setLoading(true);
    const payload = {
      ...form, role,
      ...(role === 'donor' ? { donorType: donorData.donorType, donorFoodCategory: donorData.foodCategory, availabilityTime: donorData.availability } : {}),
      ...(role === 'ngo' ? { organizationName: ngoData.orgName, licenseNumber: ngoData.license, capacity: ngoData.capacity } : {}),
      ...(role === 'volunteer' ? { vehicleType: volData.vehicle, preferredArea: volData.area } : {})
    };

    try {
      const res = await client.post('/auth/register', payload);
      if(res.status === 201) { alert("Account Created Successfully!"); navigation.navigate('Login'); }
    } catch(e) { console.log(e); alert("Registration Failed. Try again."); }
    finally { setLoading(false); }
  };

  // Reusable Components
  const RolePill = ({ title, value, icon }) => (
    <TouchableOpacity style={[styles.rolePill, role === value && styles.roleActive]} onPress={() => setRole(value)}>
      <Ionicons name={icon} size={18} color={role === value ? '#FFF' : COLORS.gray} />
      <Text style={[styles.roleText, role === value && { color: '#FFF' }]}>{title}</Text>
    </TouchableOpacity>
  );

  const SelectionPill = ({ label, selected, onPress }) => (
    <TouchableOpacity style={[styles.selectPill, selected && styles.selectActive]} onPress={onPress}>
      <Text style={[styles.selectText, selected && { color: '#FFF' }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header with Back Button */}
          <View style={styles.navHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.sub}>Join us to bridge the hunger gap.</Text>
          </View>

          {/* Role Selector */}
          <Text style={styles.label}>I am a...</Text>
          <View style={styles.roleContainer}>
            <RolePill title="Donor" value="donor" icon="gift-outline" />
            <RolePill title="NGO" value="ngo" icon="business-outline" />
            <RolePill title="Volunteer" value="volunteer" icon="bicycle-outline" />
          </View>

          {/* === COMMON FIELDS === */}
          <Text style={styles.sectionLabel}>Personal Info</Text>
          <TextInput placeholder="Full Name" style={styles.input} onChangeText={t=>updateForm('name',t)} />
          <TextInput placeholder="Email Address" style={styles.input} autoCapitalize="none" onChangeText={t=>updateForm('email',t)} />
          <TextInput placeholder="Password" style={styles.input} secureTextEntry onChangeText={t=>updateForm('password',t)} />
          
          <View style={{flexDirection:'row', gap: 15}}>
            <View style={{flex: 1}}><TextInput placeholder="Phone" style={styles.input} keyboardType="phone-pad" onChangeText={t=>updateForm('phone',t)} /></View>
            <View style={{flex: 1}}><TextInput placeholder="City" style={styles.input} onChangeText={t=>updateForm('city',t)} /></View>
          </View>
          <TextInput placeholder="Full Address" style={styles.input} onChangeText={t=>updateForm('address',t)} />

          {/* === DYNAMIC FIELDS === */}
          {/* 1. DONOR FORM */}
          {role === 'donor' && (
            <View style={styles.dynamicSection}>
              <Text style={styles.sectionLabel}>Donor Details</Text>
              <Text style={styles.miniLabel}>Donor Type</Text>
              <View style={styles.wrapRow}>
                {['Individual', 'Restaurant', 'Hotel', 'Event'].map(t => (
                  <SelectionPill key={t} label={t} selected={donorData.donorType === t} onPress={()=>updateDonor('donorType', t)}/>
                ))}
              </View>
              <Text style={styles.miniLabel}>Food Preference</Text>
              <View style={styles.wrapRow}>
                {['Veg', 'Non-Veg', 'Both'].map(t => (
                  <SelectionPill key={t} label={t} selected={donorData.foodCategory === t} onPress={()=>updateDonor('foodCategory', t)}/>
                ))}
              </View>
              <TextInput placeholder="Availability (e.g. 9AM - 6PM)" style={styles.input} onChangeText={t=>updateDonor('availability',t)} />
            </View>
          )}

          {/* 2. NGO FORM */}
          {role === 'ngo' && (
            <View style={styles.dynamicSection}>
              <Text style={styles.sectionLabel}>Organization Info</Text>
              <TextInput placeholder="Organization Name" style={styles.input} onChangeText={t=>updateNgo('orgName',t)} />
              <TextInput placeholder="License / Reg Number" style={styles.input} onChangeText={t=>updateNgo('license',t)} />
              <TextInput placeholder="Capacity (Meals/People)" style={styles.input} keyboardType="numeric" onChangeText={t=>updateNgo('capacity',t)} />
            </View>
          )}

          {/* 3. VOLUNTEER FORM */}
          {role === 'volunteer' && (
            <View style={styles.dynamicSection}>
              <Text style={styles.sectionLabel}>Volunteer Details</Text>
              <TextInput placeholder="Vehicle Type (Bike/Car/Van)" style={styles.input} onChangeText={t=>updateVol('vehicle',t)} />
              <TextInput placeholder="Preferred Area" style={styles.input} onChangeText={t=>updateVol('area',t)} />
            </View>
          )}

          {/* Button */}
          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF"/> : <Text style={styles.btnText}>Sign Up</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg,
    // ✅ FIX: Pushes content down
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
  },
  scrollContent: { padding: 24, paddingBottom: 50 },
  
  navHeader: { marginBottom: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth:1, borderColor: '#EEE', justifyContent:'center', alignItems:'center' },
  
  titleSection: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 5 },
  sub: { fontSize: 16, color: COLORS.gray },
  
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 10, marginTop: 10 },
  roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  rolePill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.input, marginHorizontal: 4, gap: 5 },
  roleActive: { backgroundColor: COLORS.primary },
  roleText: { fontSize: 12, fontWeight: '600', color: COLORS.gray },

  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 15, marginTop: 10 },
  input: { backgroundColor: COLORS.input, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 15, marginBottom: 15, fontSize: 15, color: COLORS.text },
  
  dynamicSection: { backgroundColor: '#FFF5F2', padding: 15, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#FFE0DB' },
  miniLabel: { fontSize: 12, color: COLORS.gray, marginBottom: 8, fontWeight: '600' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15, gap: 8 },
  
  selectPill: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#FFCCBC' },
  selectActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  selectText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  btn: { backgroundColor: COLORS.primary, height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: {width:0, height:5}, elevation: 5 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerText: { color: COLORS.gray, fontSize: 14 },
  link: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14 }
});

export default RegisterScreen;