import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const LOGO = require('../../assets/logo.png');

const COLORS = {
  primary: '#FF624C',
  background: '#FFFFFF',
  text: '#1F2432',
  muted: '#8F98A7',
  blush: '#FFF2EE',
};

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      <View style={styles.topCanvas}>
        <View style={styles.topCloud} />
        <View style={styles.sideCloud} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoShell}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.eyebrow}>NeedFeed</Text>
        <Text style={styles.title}>Donate food. Deliver hope.</Text>
        <Text style={styles.subtitle}>
          Bridge the gap between food surplus and hunger with one simple flow for donors,
          NGOs, and volunteers.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.88}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topCanvas: {
    height: '45%',
    backgroundColor: COLORS.blush,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    overflow: 'hidden',
  },
  topCloud: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FFE8E2',
    top: -70,
    right: -80,
  },
  sideCloud: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FFF7F4',
    bottom: -90,
    left: -70,
  },
  content: {
    flex: 1,
    marginTop: -84,
    paddingHorizontal: 28,
    paddingBottom: 44,
    alignItems: 'center',
  },
  logoShell: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 10,
  },
  logo: {
    width: 128,
    height: 128,
  },
  eyebrow: {
    marginTop: 34,
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: 36,
    lineHeight: 44,
    textAlign: 'center',
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 16,
    color: COLORS.muted,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 'auto',
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
});

export default WelcomeScreen;

