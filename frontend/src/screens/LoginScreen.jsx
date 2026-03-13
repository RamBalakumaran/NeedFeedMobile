import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, Image, KeyboardAvoidingView, Platform 
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';

const AppLogo = require('../../assets/logo.png'); 

const LoginScreen = ({ navigation }) => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return alert('Please fill both fields');
    setLoading(true);
    try {
      const res = await client.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
    } catch (error) {
      alert('Login Failed: ' + (error.response?.data?.message || 'Check network'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#FC5C5A" />

      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroLabel}>NeedFeed Donor Login</Text>
            <Text style={styles.heroTitle}>Fuel the next meal.</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Donor</Text>
          </View>
        </View>
        <Text style={styles.heroCopy}>
          Donate once or schedule recurring drops — every login unlocks a faster handoff to a hungry family.
        </Text>
        <View style={styles.logoGroup}>
          <Image source={AppLogo} style={styles.logo} />
          <View style={styles.glow} />
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Sign in</Text>
        <Text style={styles.formSubtitle}>Secure access to your donation history & commitments.</Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="you@email.com"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue to dashboard</Text>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to NeedFeed?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Create Donor Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
    justifyContent: 'space-between',
  },
  hero: {
    backgroundColor: '#FC5C5A',
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingHorizontal: 30,
    paddingBottom: 40,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    shadowColor: '#FC5C5A',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25,
    elevation: 8,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    color: '#FFEDEB',
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  heroTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  roleText: {
    color: '#FFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroCopy: {
    color: '#FFE7E4',
    fontSize: 14,
    marginTop: 20,
    lineHeight: 22,
  },
  logoGroup: {
    alignSelf: 'center',
    marginTop: 20,
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  logo: {
    width: 70,
    height: 70,
  },
  glow: {
    position: 'absolute',
    width: 165,
    height: 165,
    borderRadius: 82.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    right: -30,
    top: 10,
  },
  formCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    backgroundColor: '#FFF',
    borderRadius: 26,
    padding: 26,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 6,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  formSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#94A3B8',
  },
  inputGroup: {
    marginTop: 20,
  },
  input: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#0F172A',
  },
  loginBtn: {
    backgroundColor: '#0F172A',
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  footer: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    color: '#94A3B8',
  },
  linkText: {
    color: '#0F172A',
    fontWeight: '700',
  },
});

export default LoginScreen;
