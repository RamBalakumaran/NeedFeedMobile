import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar } from 'react-native';

const COLORS = { primary: '#F25F4C', text: '#1D212B', gray: '#9FA1AC' };

const WelcomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 1. Full Screen Image */}
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1000&auto=format&fit=crop' }} 
        style={styles.image}
      />
      
      {/* 2. Bottom Content Card */}
      <View style={styles.content}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>
            Donate Food,{"\n"}
            <Text style={{color: COLORS.primary}}>Save Lives.</Text>
          </Text>
          <Text style={styles.subtitle}>
            Bridge the gap between hunger and surplus. Join our community to make a difference today.
          </Text>
        </View>

        {/* 3. Get Started Button */}
        <TouchableOpacity 
          style={styles.btn} 
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.btnText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  image: { flex: 1, width: '100%', opacity: 0.9 },
  content: {
    position: 'absolute', bottom: 0, width: '100%',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 35, borderTopRightRadius: 35,
    padding: 30, paddingBottom: 50,
    alignItems: 'center'
  },
  textBlock: { width: '100%', marginBottom: 30 },
  title: { fontSize: 36, fontWeight: '800', color: COLORS.text, lineHeight: 44, marginBottom: 15 },
  subtitle: { fontSize: 15, color: COLORS.gray, lineHeight: 24 },
  btn: {
    backgroundColor: COLORS.primary, width: '100%', paddingVertical: 18,
    borderRadius: 20, alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: {width:0, height:5}, elevation: 10
  },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});

export default WelcomeScreen;