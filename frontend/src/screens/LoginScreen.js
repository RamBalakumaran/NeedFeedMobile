import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, Image, KeyboardAvoidingView, Platform, ScrollView, Dimensions
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';

// Ensure your logo file is here
const AppLogo = require('../../assets/logo.png'); 

const { height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return alert("Please fill all fields");
    setLoading(true);
    try {
      const res = await client.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
    } catch (error) {
      alert("Login Failed: " + (error.response?.data?.message || "Check network"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. CURVED HEADER BACKGROUND */}
        <View style={styles.headerBackground}>
          {/* 2. CIRCLE LOGO CONTAINER (Floating) */}
          <View style={styles.logoContainer}>
            <Image 
              source={AppLogo} 
              style={styles.logoImage}
              resizeMode="contain" 
            />
          </View>
        </View>

        {/* 3. FORM SECTION */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Login to NeedFeed</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput 
              style={styles.input} 
              placeholder="admin@test.com" 
              placeholderTextColor="#B0BEC5"
              value={email} 
              onChangeText={setEmail} 
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput 
              style={styles.input} 
              placeholder="••••••" 
              placeholderTextColor="#B0BEC5"
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry 
            />
            <TouchableOpacity style={{alignSelf: 'flex-end', marginTop: 10}}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20
  },
  
  // Header Style
  headerBackground: {
    height: height * 0.28,
    backgroundColor: '#FFF5F2', 
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 60, // Increased margin to fit bigger logo
    paddingBottom: 0,
  },
  
  // ✅ LOGO FIXES START HERE
  logoContainer: {
    width: 160,  // Increased Size
    height: 160, 
    borderRadius: 80, // Half of width = Perfect Circle
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: -50, // Floating position
    elevation: 10,
    shadowColor: '#FF6B4A',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
  },

  logoImage: { 
    width: '85%', // Fills more of the white circle
    height: '85%', 
  },
  // ✅ LOGO FIXES END HERE

  formContainer: { 
    paddingHorizontal: 30,
  },
  
  title: { fontSize: 28, fontWeight: 'bold', color: '#2D2D2D', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#90A4AE', textAlign: 'center', marginBottom: 30 },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#455A64', marginBottom: 8, marginLeft: 5 },
  input: { 
    backgroundColor: '#F5F5F5', 
    padding: 16, 
    borderRadius: 15, 
    fontSize: 16, 
    color: '#333',
    borderWidth: 1,
    borderColor: '#F5F5F5'
  },

  forgotText: { color: '#FF6B4A', fontSize: 13, fontWeight: '600' },

  loginBtn: { 
    backgroundColor: '#FF6B4A', 
    paddingVertical: 16, 
    borderRadius: 15, 
    alignItems: 'center', 
    marginTop: 15,
    shadowColor: '#FF6B4A', shadowOpacity: 0.4, shadowOffset: {width: 0, height: 4}, shadowRadius: 10, elevation: 5
  },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerText: { color: '#78909C', fontSize: 15 },
  linkText: { color: '#FF6B4A', fontWeight: 'bold', fontSize: 15 }
});

export default LoginScreen;