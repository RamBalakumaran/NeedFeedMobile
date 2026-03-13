// src/screens/MapScreen.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const MapScreen = ({ route, navigation }) => {
  // 1. Get Params passed from AvailableFoodScreen
  const { latitude, longitude, title } = route.params;

  return (
    <View style={styles.container}>
      {/* 2. Render Map */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{ latitude: parseFloat(latitude), longitude: parseFloat(longitude) }}
          title={title}
          pinColor="red"
        />
      </MapView>

      {/* Close Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  backBtn: { 
    position: 'absolute', top: 50, left: 20, 
    backgroundColor: '#FFF', padding: 10, borderRadius: 25, elevation: 5 
  }
});

export default MapScreen;