import React, { useState, useContext, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch, Image, ActivityIndicator, StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ Fixes Warning
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';

const COLORS = { primary: '#F25F4C', bg: '#FFFFFF', input: '#F6F8FA', text: '#1D212B', gray: '#9FA1AC' };

// Reusable Selector
const Selector = ({ options, selected, onSelect }) => (
  <View style={styles.chipContainer}>
    {options.map((opt) => (
      <TouchableOpacity key={opt} onPress={() => onSelect(opt)} 
        style={[styles.chip, selected === opt && styles.chipActive]}>
        <Text style={selected === opt ? styles.chipTextActive : styles.chipText}>{opt}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const DonateScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  // Data States
  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [foodType, setFoodType] = useState('Veg'); 
  const [category, setCategory] = useState('Cooked'); 
  const [storage, setStorage] = useState('Room Temperature'); 
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [isFresh, setIsFresh] = useState(false);
  const [isHygienic, setIsHygienic] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
    })();
  }, []);

  const handleImagePick = () => {
    Alert.alert("Upload Food Photo", "Choose a method", [
      { text: "Camera", onPress: openCamera },
      { text: "Gallery", onPress: openGallery },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Error", "Camera access is needed.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      // ✅ FIXED: Using MediaTypeOptions prevents the crash
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Error", "Gallery access is needed.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      // ✅ FIXED: Using MediaTypeOptions prevents the crash
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.5,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleDonate = async () => {
    if (!title || !quantity || !image) return Alert.alert("Missing Info", "Please fill Name, Quantity & Photo.");
    if (!location) return Alert.alert("Location", "Waiting for GPS...");
    if (!isFresh || !isHygienic) return Alert.alert("Safety", "Please verify hygiene checks.");

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('quantity', quantity);
      formData.append('description', description || "No description");
      formData.append('foodType', foodType);
      formData.append('category', category);
      formData.append('storageInstruction', storage);
      formData.append('preparationTime', new Date().toISOString()); 
      formData.append('latitude', location.latitude.toString());
      formData.append('longitude', location.longitude.toString());
      
      let uriParts = image.split('.');
      let fileType = uriParts[uriParts.length - 1];
      
      formData.append('image', {
        uri: image,
        name: `photo.${fileType}`,
        type: `image/${fileType}`,
      });

      const res = await client.post('/food/donate', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${userToken}` },
      });

      if (res.data.success) {
        Alert.alert("Success", "Donation Listed Successfully!");
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert("Upload Failed", "Server error. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Donate Food</Text>
          <View style={{width: 40}} /> 
        </View>

        <TouchableOpacity style={styles.uploadCard} onPress={handleImagePick}>
          {image ? (
            <Image source={{ uri: image }} style={styles.uploadedImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <View style={styles.iconCircle}>
                <Ionicons name="camera" size={30} color={COLORS.primary} />
              </View>
              <Text style={styles.uploadText}>Tap to Add Photo</Text>
              <Text style={styles.uploadSub}>(Camera or Gallery)</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Food Details</Text>

        <View style={styles.inputGroup}>
          <TextInput style={styles.input} placeholder="Food Name (e.g. Veg Biryani)" value={title} onChangeText={setTitle} />
          <View style={{flexDirection: 'row', gap: 10}}>
            <TextInput style={[styles.input, {flex: 1}]} placeholder="Qty" value={quantity} onChangeText={setQuantity} />
            <View style={[styles.locBadge, location && styles.locActive]}>
              <Ionicons name={location ? "location" : "hourglass"} size={16} color={location ? "#FFF" : COLORS.gray} />
              <Text style={location ? styles.locTextActive : styles.locText}>{location ? " GPS" : " ..."}</Text>
            </View>
          </View>
          <TextInput style={styles.input} placeholder="Ingredients" value={description} onChangeText={setDescription} />
        </View>

        <Text style={styles.label}>Dietary Type</Text>
        <Selector options={['Veg', 'Non-Veg', 'Vegan']} selected={foodType} onSelect={setFoodType} />

        <Text style={styles.label}>Category</Text>
        <Selector options={['Cooked', 'Raw', 'Bakery', 'Packed']} selected={category} onSelect={setCategory} />

        <Text style={styles.label}>Storage Condition</Text>
        <Selector options={['Room Temperature', 'Refrigerate', 'Keep Hot']} selected={storage} onSelect={setStorage} />

        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>Safety Declaration</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Food is fresh & edible?</Text>
            <Switch value={isFresh} onValueChange={setIsFresh} trackColor={{true: COLORS.primary}} thumbColor="#FFF" />
          </View>
          <View style={styles.divider} />
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Packed hygienically?</Text>
            <Switch value={isHygienic} onValueChange={setIsHygienic} trackColor={{true: COLORS.primary}} thumbColor="#FFF" />
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleDonate} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>CONFIRM DONATION</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 24, paddingBottom: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  uploadCard: { height: 180, backgroundColor: COLORS.input, borderRadius: 20, marginBottom: 25, overflow: 'hidden', borderWidth: 1, borderColor: '#EEE', borderStyle: 'dashed' },
  uploadPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF0EC', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  uploadText: { fontWeight: 'bold', color: COLORS.text, fontSize: 16 },
  uploadSub: { color: COLORS.gray, fontSize: 12, marginTop: 4 },
  uploadedImage: { width: '100%', height: '100%' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 15 },
  inputGroup: { gap: 15, marginBottom: 20 },
  input: { backgroundColor: COLORS.input, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 15, fontSize: 15, color: COLORS.text },
  locBadge: { width: 80, borderRadius: 12, backgroundColor: COLORS.input, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  locActive: { backgroundColor: COLORS.primary },
  locText: { fontSize: 12, color: COLORS.gray, fontWeight: 'bold', marginLeft: 4 },
  locTextActive: { fontSize: 12, color: '#FFF', fontWeight: 'bold', marginLeft: 4 },
  label: { fontSize: 14, fontWeight: 'bold', color: COLORS.gray, marginBottom: 10, marginTop: 5 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.input, borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.gray, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  safetyCard: { backgroundColor: '#FFF0EC', borderRadius: 16, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: '#FFCCBC' },
  safetyTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#FFCCBC', marginVertical: 12, opacity: 0.5 },
  submitBtn: { backgroundColor: COLORS.primary, height: 55, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

export default DonateScreen;