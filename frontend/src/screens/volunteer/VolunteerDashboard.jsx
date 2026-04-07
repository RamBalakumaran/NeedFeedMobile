import React, { useState, useContext, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import {
  getNextVolunteerStatuses,
  getVolunteerActionLabel,
  getWorkflowStatusLabel,
  getWorkflowStatusTone,
} from '../../utils/workflowStatus';

const COLORS = {
  background: '#F6F7FB',
  card: '#FFFFFF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  primary: '#F25F4C',
  success: '#1F8F43',
  successBg: '#EAF8EF',
  pickupBg: '#FFF4EF',
  dropBg: '#EEF4FF',
  buttonBlue: '#2563EB',
  buttonGreen: '#1F8F43',
};

const getFoodCoordinates = (item) => {
  const coordinates = item?.location?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const getUserCoordinates = (user) => {
  const coordinates = user?.location?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const getDisplayName = (user, fallback = 'Unknown') => (
  user?.organizationName
  || user?.name
  || fallback
);

const getPickupAddress = (item) => (
  item?.address
  || item?.donor?.address
  || item?.donor?.city
  || 'Pickup address unavailable'
);

const getDropAddress = (item) => (
  item?.requestedBy?.address
  || item?.requestedBy?.city
  || 'Drop-off address unavailable'
);

const openMapPreview = (navigation, coordinates, title) => {
  if (!coordinates) {
    Alert.alert('Map unavailable', 'Location coordinates are not available for this stop yet.');
    return;
  }

  navigation.navigate('MapScreen', {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    title,
  });
};

const RouteInfoCard = ({
  icon,
  iconColor,
  backgroundColor,
  title,
  name,
  phone,
  address,
  onMapPress,
  mapDisabled,
}) => (
  <View style={[styles.routeCard, { backgroundColor }]}>
    <View style={styles.routeHeader}>
      <View style={[styles.routeIcon, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.routeTitle}>{title}</Text>
    </View>

    <Text style={styles.routeName}>{name}</Text>
    <Text style={styles.routeMeta}>Phone: {phone || 'Unavailable'}</Text>
    <Text style={styles.routeAddress}>{address}</Text>

    <TouchableOpacity
      style={[styles.mapBtn, mapDisabled && styles.mapBtnDisabled]}
      onPress={onMapPress}
      disabled={mapDisabled}
    >
      <Ionicons name="map-outline" size={16} color={COLORS.buttonBlue} />
      <Text style={styles.mapBtnText}>Open Map</Text>
    </TouchableOpacity>
  </View>
);

const VolunteerDashboard = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await client.get('/food/tasks/volunteer', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setTasks(res.data);
    } catch (error) {
      console.log('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchTasks();
  }, [userToken]));

  const updateStatus = async (id, current) => {
    const [next] = getNextVolunteerStatuses(current);
    if (!next) return;

    try {
      await client.put(`/food/status/${id}`, { status: next }, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      fetchTasks();
      Alert.alert('Success', `Order marked as ${next}`);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not update status');
    }
  };

  const renderTask = ({ item }) => {
    const workflowTone = getWorkflowStatusTone(item);
    const workflowLabel = getWorkflowStatusLabel(item);
    const hasNextStep = getNextVolunteerStatuses(item.status).length > 0;
    const pickupCoordinates = getFoodCoordinates(item);
    const dropCoordinates = getUserCoordinates(item.requestedBy);

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: workflowTone.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: workflowTone.color }]}>
              {workflowLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.metaText}>Quantity: {item.quantity || 'Not specified'}</Text>
        <Text style={styles.metaText}>Operational status: {item.status}</Text>

        <RouteInfoCard
          icon="storefront-outline"
          iconColor={COLORS.primary}
          backgroundColor={COLORS.pickupBg}
          title="Pickup From Donor"
          name={getDisplayName(item.donor, 'Donor')}
          phone={item.donor?.phone}
          address={getPickupAddress(item)}
          onMapPress={() => openMapPreview(navigation, pickupCoordinates, `${item.title} Pickup`)}
          mapDisabled={!pickupCoordinates}
        />

        <RouteInfoCard
          icon="home-outline"
          iconColor={COLORS.buttonBlue}
          backgroundColor={COLORS.dropBg}
          title="Deliver To NGO"
          name={getDisplayName(item.requestedBy, 'NGO')}
          phone={item.requestedBy?.phone}
          address={getDropAddress(item)}
          onMapPress={() => openMapPreview(navigation, dropCoordinates, `${getDisplayName(item.requestedBy, 'NGO')} Drop-off`)}
          mapDisabled={!dropCoordinates}
        />

        <View style={styles.footerRow}>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => navigation.navigate('OrderDetails', { item })}
          >
            <Ionicons name="list-outline" size={16} color={COLORS.text} />
            <Text style={styles.detailsBtnText}>Details</Text>
          </TouchableOpacity>

          {hasNextStep ? (
            <TouchableOpacity style={styles.actionBtn} onPress={() => updateStatus(item._id, item.status)}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
              <Text style={styles.actionBtnText}>{getVolunteerActionLabel(item.status)}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.donePill}>
              <Ionicons name="checkmark-done-circle" size={16} color={COLORS.success} />
              <Text style={styles.doneText}>Delivered</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={(
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={34} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>No delivery tasks assigned yet.</Text>
            <Text style={styles.emptyText}>Assigned pickup routes will appear here with donor and NGO details.</Text>
          </View>
        )}
        renderItem={renderTask}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loader: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 18,
    paddingBottom: 28,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 28,
  },
  emptyTitle: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  metaText: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  routeCard: {
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  routeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '900',
  },
  routeName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  routeMeta: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  routeAddress: {
    marginTop: 6,
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  mapBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#D8E4FF',
  },
  mapBtnDisabled: {
    opacity: 0.5,
  },
  mapBtnText: {
    color: COLORS.buttonBlue,
    fontSize: 12,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  detailsBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  detailsBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  actionBtn: {
    flex: 1.4,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: COLORS.buttonGreen,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },
  donePill: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: COLORS.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  doneText: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '900',
  },
});

export default VolunteerDashboard;
