import React, { useContext } from 'react';
import { View, ActivityIndicator, Platform, StatusBar as NativeStatusBar, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { StatusBar } from 'expo-status-bar';

// 1. Shared Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// 2. Donor Screens
import DonateScreen from './src/screens/DonateScreen';
import MyDonationsScreen from './src/screens/MyDonationsScreen';

// 3. NGO / Receiver Screens
import AvailableFoodScreen from './src/screens/AvailableFoodScreen';
import MapScreen from './src/screens/MapScreen';
import NGOScreen from './src/screens/ngo/NGODashboard';

// 4. Admin Screens
import AdminDashboard from './src/screens/admin/AdminDashboard';
import UserManagement from './src/screens/admin/UserManagement';
import FoodMonitoring from './src/screens/admin/FoodMonitoring';
import Analytics from './src/screens/admin/Analytics';

// 5. Volunteer Screens
import VolunteerScreen from './src/screens/volunteer/VolunteerDashboard';

import DonorRequestsScreen from './src/screens/DonorRequestsScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';
import ChatScreen from './src/screens/ChatScreen';

const Stack = createNativeStackNavigator();

const AppNav = () => {
  const { userToken, loading } = useContext(AuthContext);

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#F25F4C" />
    </View>
  );

  // Styled Header
  const headerOptions = (title) => ({
    headerShown: true,
    title: title,
    headerStyle: { backgroundColor: '#F25F4C' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: 'bold' },
    headerShadowVisible: false,
  });

  return (
    <View style={styles.appContainer}>
      <StatusBar style="dark" backgroundColor="transparent" />
      <NavigationContainer>
        <Stack.Navigator>
          {userToken === null ? (
            // === AUTHENTICATION ===
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
            </>
          ) : (
            // === APP FEATURES ===
            <>
              {/* Home serves as the Role Gateway */}
              <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />

              {/* Donor Routes */}
              <Stack.Screen name="Donate" component={DonateScreen} options={{ headerShown: false }} />
              <Stack.Screen name="MyDonations" component={MyDonationsScreen} options={headerOptions('Donation History')} />

              {/* NGO / Receiver Routes */}
              <Stack.Screen name="AvailableFood" component={AvailableFoodScreen} options={{ headerShown: false }} />
              <Stack.Screen name="MapScreen" component={MapScreen} options={headerOptions('Location')} />
              <Stack.Screen name="NGODashboard" component={NGOScreen} options={headerOptions('My Requests')} />

              {/* Volunteer Routes */}
              <Stack.Screen name="VolunteerDashboard" component={VolunteerScreen} options={headerOptions('Delivery Tasks')} />

              {/* Admin Routes */}
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: false }} />
              <Stack.Screen name="UserManagement" component={UserManagement} options={headerOptions('Manage Users')} />
              <Stack.Screen name="FoodMonitoring" component={FoodMonitoring} options={headerOptions('Food Monitoring')} />
              <Stack.Screen name="Analytics" component={Analytics} options={headerOptions('Analytics')} />

              <Stack.Screen name="DonorRequests" component={DonorRequestsScreen} options={headerOptions('Incoming Requests')} />
              <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={headerOptions('Order Details')} />
              <Stack.Screen name="Chat" component={ChatScreen} options={headerOptions('Chat')} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});