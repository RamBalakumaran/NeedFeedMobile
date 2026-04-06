import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const COLORS = {
  background: '#F5F7FB',
  card: '#FFFFFF',
  text: '#223042',
  muted: '#7B8794',
  primary: '#FF624C',
  border: '#E7ECF3',
  danger: '#D32F2F',
};

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || 'Not Provided'}</Text>
  </View>
);

const roleSpecificRows = (user) => {
  if (!user) return [];
  if (user.role === 'donor') {
    return [
      ['Donor Type', user.donorType],
      ['Food Preference', user.donorFoodCategory],
      ['Availability', user.availabilityTime],
    ];
  }
  if (user.role === 'ngo') {
    return [
      ['Organization', user.organizationName],
      ['License', user.licenseNumber],
      ['Capacity', user.capacity ? String(user.capacity) : ''],
    ];
  }
  if (user.role === 'volunteer') {
    return [
      ['Vehicle Type', user.vehicleType],
      ['Preferred Area', user.preferredArea],
      ['Availability', user.isAvailable ? 'Available' : 'Busy'],
    ];
  }
  return [];
};

const UserManagementScreen = () => {
  const { userToken } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await client.get('/admin/users', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setUsers(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const deleteUser = (id) => {
    Alert.alert('Delete user?', 'Delete this account after reviewing all details?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/admin/users/${id}`, {
              headers: { Authorization: `Bearer ${userToken}` },
            });
            setSelectedUser(null);
            fetchUsers();
          } catch (error) {
            Alert.alert('Error', 'Could not delete user');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => setSelectedUser(item)}>
      <Image
        source={{ uri: item.profileImage || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }}
        style={styles.avatar}
      />
      <View style={styles.cardBody}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.meta}>{item.city || 'No city'} • {item.phone || 'No phone'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{(item.role || 'user').toUpperCase()}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9AA6B2" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchUsers();
              }}
              colors={[COLORS.primary]}
            />
          }
        />
      )}

      <Modal visible={!!selectedUser} animationType="slide" transparent onRequestClose={() => setSelectedUser(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Review</Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.profileHero}>
                <Image
                  source={{ uri: selectedUser?.profileImage || 'https://cdn-icons-png.flaticon.com/512/847/847969.png' }}
                  style={styles.heroAvatar}
                />
                <Text style={styles.heroName}>{selectedUser?.name}</Text>
                <Text style={styles.heroRole}>{(selectedUser?.role || 'user').toUpperCase()}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Base Details</Text>
                <InfoRow label="Email" value={selectedUser?.email} />
                <InfoRow label="Phone" value={selectedUser?.phone} />
                <InfoRow label="City" value={selectedUser?.city} />
                <InfoRow label="Address" value={selectedUser?.address} />
                <InfoRow label="Joined" value={selectedUser?.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : ''} />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Role Details</Text>
                {roleSpecificRows(selectedUser).map(([label, value]) => (
                  <InfoRow key={label} label={label} value={value} />
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => selectedUser?._id && deleteUser(selectedUser._id)}
            >
              <Ionicons name="trash-outline" size={18} color="#FFF" />
              <Text style={styles.deleteButtonText}>Delete User After Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2F6',
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  email: {
    marginTop: 3,
    fontSize: 13,
    color: '#5B6778',
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.muted,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#FFF0EB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roleText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '88%',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  profileHero: {
    alignItems: 'center',
    backgroundColor: '#F9FAFC',
    borderRadius: 22,
    paddingVertical: 18,
    marginBottom: 16,
  },
  heroAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#EEF2F6',
  },
  heroName: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
  },
  heroRole: {
    marginTop: 6,
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 10,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.muted,
    textTransform: 'uppercase',
    fontWeight: '800',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    color: '#445164',
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: 4,
    backgroundColor: COLORS.danger,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
  },
});

export default UserManagementScreen;

