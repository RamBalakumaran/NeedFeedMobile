import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { StatusBar } from 'expo-status-bar';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';

const LOGO = require('../../assets/logo.png');

const COLORS = {
  primary: '#FF624C',
  background: '#FFFFFF',
  text: '#1E2433',
  muted: '#93A0AE',
  input: '#F6F7FB',
  blush: '#FFF3F0',
};

const LoginScreen = ({ navigation }) => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await client.post('/auth/login', {
        email: email.trim(),
        password,
      });
      login(res.data.token, res.data.user);
    } catch (error) {
      alert('Login failed: ' + (error.response?.data?.message || 'Check network'));
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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroPanel}>
            <View style={styles.heroOrbLarge} />
            <View style={styles.heroOrbSmall} />
          </View>

          <View style={styles.content}>
            <View style={styles.logoShell}>
              <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            </View>

            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Login to NeedFeed</Text>

            <View style={styles.formBlock}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@test.com"
                placeholderTextColor="#B8C2CF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.formBlock}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="******"
                placeholderTextColor="#B8C2CF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => alert('Forgot password flow is not configured yet.')}
            >
              <Text style={styles.forgotButtonText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.footerLink}>Sign Up</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 34,
  },
  heroPanel: {
    height: 270,
    backgroundColor: COLORS.blush,
    borderBottomLeftRadius: 62,
    borderBottomRightRadius: 62,
    overflow: 'hidden',
  },
  heroOrbLarge: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#FFE8E2',
    top: -120,
    right: -90,
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#FFF9F7',
    bottom: -110,
    left: -60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    marginTop: -82,
  },
  logoShell: {
    alignSelf: 'center',
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 10,
  },
  logo: {
    width: 134,
    height: 134,
  },
  title: {
    marginTop: 26,
    textAlign: 'center',
    color: COLORS.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: '#9AA6B3',
    fontSize: 17,
    fontWeight: '700',
  },
  formBlock: {
    marginTop: 28,
  },
  fieldLabel: {
    color: '#324150',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.input,
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 20,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 18,
  },
  forgotButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    marginTop: 58,
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    paddingVertical: 22,
    alignItems: 'center',
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
    marginTop: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  footerText: {
    color: '#8495A5',
    fontSize: 16,
    fontWeight: '700',
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '900',
  },
});

export default LoginScreen;

