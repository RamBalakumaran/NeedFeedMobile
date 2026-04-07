import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';

const COLORS = {
  primary: '#F25F4C',
  bg: '#FAFAFA',
  card: '#FFFFFF',
  textDark: '#1D212B',
  textLight: '#707684',
  border: '#E7E8EC',
  chip: '#F4F6F8',
  green: '#4CAF50',
  red: '#E53935',
  blue: '#2563EB',
};
const PLACEHOLDER_COLOR = '#8B97A8';

const NEARBY_OPTIONS = [2, 5, 10];
const FOOD_TYPE_OPTIONS = ['All', 'Veg', 'Non-Veg', 'Vegan'];
const CATEGORY_OPTIONS = ['All', 'Cooked', 'Packed', 'Bakery', 'Raw'];
const DEFAULT_FILTERS = {
  foodName: '',
  donorName: '',
  location: '',
  foodType: 'All',
  category: 'All',
  nearbyRadiusKm: null,
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const getDonorName = (item) => (
  item?.donor?.organizationName
  || item?.donor?.name
  || 'Anonymous'
);

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

const getLocationLabel = (item) => (
  item?.address
  || item?.donor?.address
  || item?.donor?.city
  || 'Location unavailable'
);

const toRadians = (degree) => (degree * Math.PI) / 180;

const calculateDistanceKm = (origin, destination) => {
  if (!origin || !destination) return null;

  const earthRadiusKm = 6371;
  const deltaLat = toRadians(destination.latitude - origin.latitude);
  const deltaLng = toRadians(destination.longitude - origin.longitude);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(origin.latitude))
    * Math.cos(toRadians(destination.latitude))
    * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const formatDistance = (distanceKm) => {
  if (distanceKm === null || distanceKm === undefined) {
    return 'Distance unavailable';
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }

  return `${distanceKm < 10 ? distanceKm.toFixed(1) : distanceKm.toFixed(0)} km away`;
};

const AvailableFoodScreen = ({ navigation }) => {
  const { userToken, userInfo } = useContext(AuthContext);
  const [foodList, setFoodList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingFoodId, setRequestingFoodId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [foodNameFilter, setFoodNameFilter] = useState(DEFAULT_FILTERS.foodName);
  const [donorNameFilter, setDonorNameFilter] = useState(DEFAULT_FILTERS.donorName);
  const [locationFilter, setLocationFilter] = useState(DEFAULT_FILTERS.location);
  const [foodTypeFilter, setFoodTypeFilter] = useState(DEFAULT_FILTERS.foodType);
  const [categoryFilter, setCategoryFilter] = useState(DEFAULT_FILTERS.category);
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(DEFAULT_FILTERS.nearbyRadiusKm);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [userLocation, setUserLocation] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);

  const fetchFood = async () => {
    try {
      const res = await client.get('/food/available');
      setFoodList(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.log('Fetch Error:', error);
      Alert.alert('Error', 'Could not load available donations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFood();
    }, [])
  );

  const syncDraftFilters = (filters = DEFAULT_FILTERS) => {
    setFoodNameFilter(filters.foodName || '');
    setDonorNameFilter(filters.donorName || '');
    setLocationFilter(filters.location || '');
    setFoodTypeFilter(filters.foodType || 'All');
    setCategoryFilter(filters.category || 'All');
    setNearbyRadiusKm(filters.nearbyRadiusKm ?? null);
  };

  const requestUserLocation = async () => {
    if (locatingUser) return userLocation;

    setLocatingUser(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access to filter nearby donations.');
        return null;
      }

      const lastKnownPosition = await Location.getLastKnownPositionAsync();
      if (lastKnownPosition?.coords) {
        const nextLocation = {
          latitude: lastKnownPosition.coords.latitude,
          longitude: lastKnownPosition.coords.longitude,
        };
        setUserLocation(nextLocation);
        return nextLocation;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserLocation(nextLocation);

      return nextLocation;
    } catch (error) {
      console.log('Location Error:', error.message);
      Alert.alert('Location', 'Could not get your current location.');
      return null;
    } finally {
      setLocatingUser(false);
    }
  };

  const toggleFiltersPanel = () => {
    if (!showFilters) {
      syncDraftFilters(appliedFilters);
    }

    setShowFilters((prev) => !prev);
  };

  const handleNearbyRadiusChange = (radiusKm) => {
    if (nearbyRadiusKm === radiusKm) {
      setNearbyRadiusKm(null);
      return;
    }

    setNearbyRadiusKm(radiusKm);
  };

  const clearFilters = () => {
    syncDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setShowFilters(false);
  };

  const applyFilters = async () => {
    const nextFilters = {
      foodName: foodNameFilter,
      donorName: donorNameFilter,
      location: locationFilter,
      foodType: foodTypeFilter,
      category: categoryFilter,
      nearbyRadiusKm,
    };

    if (nextFilters.nearbyRadiusKm) {
      const location = await requestUserLocation();
      if (!location) {
        return;
      }
    }

    setAppliedFilters(nextFilters);
    setShowFilters(false);
  };

  const handleRequest = async (item) => {
    if (item.donor?._id === userInfo?._id || item.donor?._id === userInfo?.id) {
      return Alert.alert('Action Denied', 'You cannot request your own donation.');
    }

    if (userInfo?.role === 'donor' || userInfo?.role === 'volunteer') {
      return Alert.alert('Role Error', 'Only NGOs or receivers can request food.');
    }

    setRequestingFoodId(String(item._id));

    try {
      await client.put(
        `/food/request/${item._id}`,
        {},
        { headers: { Authorization: `Bearer ${userToken}` } }
      );

      Alert.alert('Success', 'Request sent. Wait for donor approval.');
      fetchFood();
    } catch (error) {
      console.log('Request Error:', error.response?.data);
      const errMsg = error.response?.data?.message || 'Could not connect to server';
      Alert.alert('Request Failed', errMsg);
    } finally {
      setRequestingFoodId('');
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeLeft = (expiryTime) => {
    const now = new Date();
    const expiry = new Date(expiryTime);
    const diffMs = expiry - now;

    if (diffMs <= 0) return 'Expired';

    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);

    if (diffHrs > 24) return `${Math.floor(diffHrs / 24)} days left`;
    return `${diffHrs}h ${diffMins}m left`;
  };

  const filteredFoodList = foodList
    .map((item) => ({
      ...item,
      distanceKm: calculateDistanceKm(userLocation, getFoodCoordinates(item)),
    }))
    .filter((item) => {
      const matchesFoodName = !normalizeText(appliedFilters.foodName)
        || normalizeText(item.title).includes(normalizeText(appliedFilters.foodName));
      const matchesDonorName = !normalizeText(appliedFilters.donorName)
        || normalizeText(getDonorName(item)).includes(normalizeText(appliedFilters.donorName));
      const matchesLocation = !normalizeText(appliedFilters.location)
        || normalizeText(getLocationLabel(item)).includes(normalizeText(appliedFilters.location));
      const matchesFoodType = appliedFilters.foodType === 'All' || item.foodType === appliedFilters.foodType;
      const matchesCategory = appliedFilters.category === 'All' || item.category === appliedFilters.category;
      const matchesNearby = !appliedFilters.nearbyRadiusKm
        || (item.distanceKm !== null && item.distanceKm <= appliedFilters.nearbyRadiusKm);

      return matchesFoodName
        && matchesDonorName
        && matchesLocation
        && matchesFoodType
        && matchesCategory
        && matchesNearby;
    })
    .sort((firstItem, secondItem) => {
      if (!appliedFilters.nearbyRadiusKm) return 0;
      if (firstItem.distanceKm === null) return 1;
      if (secondItem.distanceKm === null) return -1;
      return firstItem.distanceKm - secondItem.distanceKm;
    });

  const activeFilterCount = [
    appliedFilters.foodName,
    appliedFilters.donorName,
    appliedFilters.location,
    appliedFilters.foodType !== 'All' ? appliedFilters.foodType : '',
    appliedFilters.category !== 'All' ? appliedFilters.category : '',
    appliedFilters.nearbyRadiusKm,
  ].filter(Boolean).length;

  const renderItem = ({ item }) => {
    const coordinates = getFoodCoordinates(item);
    const isRequesting = requestingFoodId === String(item._id);

    return (
      <View style={styles.foodCard}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: item.imageUrl }} style={styles.foodImage} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.category}</Text>
          </View>
          <View style={[styles.typeBadge, item.foodType === 'Non-Veg' ? styles.bgRed : styles.bgGreen]}>
            <Text style={styles.typeText}>{item.foodType}</Text>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.foodTitle}>{item.title}</Text>

          <View style={styles.metaInfoRow}>
            <Ionicons name="person-circle-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.metaInfoText}>By {getDonorName(item)}</Text>
          </View>

          <View style={styles.metaInfoRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
            <Text numberOfLines={2} style={styles.metaInfoText}>
              {getLocationLabel(item)}
            </Text>
          </View>

          <View style={styles.metaInfoRow}>
            <Ionicons name="navigate-outline" size={16} color={COLORS.blue} />
            <Text style={[styles.metaInfoText, styles.distanceText]}>
              {formatDistance(item.distanceKm)}
            </Text>
          </View>

          <View style={styles.timeGrid}>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Prepared</Text>
              <Text style={styles.timeValue}>{formatTime(item.preparationTime)}</Text>
            </View>
            <View style={styles.verticalLine} />
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Expires</Text>
              <Text style={[styles.timeValue, styles.expiryText]}>{getTimeLeft(item.expiryTime)}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.qtyText}>{item.quantity}</Text>
            <Text style={styles.storageText}>{item.storageInstruction || 'Normal'}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.mapBtn, !coordinates && styles.mapBtnDisabled]}
              onPress={() => {
                if (!coordinates) {
                  Alert.alert('Map', 'Location coordinates are not available for this donation.');
                  return;
                }

                navigation.navigate('MapScreen', {
                  latitude: coordinates.latitude,
                  longitude: coordinates.longitude,
                  title: item.title,
                });
              }}
            >
              <Ionicons name="map-outline" size={20} color={COLORS.primary} />
              <Text style={styles.mapBtnText}>Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.requestBtn, isRequesting && styles.requestBtnDisabled]}
              onPress={() => handleRequest(item)}
              disabled={isRequesting}
            >
              {isRequesting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.requestBtnText}>Request Food</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Food</Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            fetchFood();
          }}
        >
          <Ionicons name="refresh" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterSummaryBar}>
        <View style={styles.filterSummaryCopy}>
          <Text style={styles.filterSummaryTitle}>Results</Text>
          <Text style={styles.filterSummaryText}>
            {filteredFoodList.length} of {foodList.length} donations
            {activeFilterCount ? ` • ${activeFilterCount} filters applied` : ''}
          </Text>
        </View>

        <TouchableOpacity style={styles.filterLaunchBtn} onPress={toggleFiltersPanel}>
          <Ionicons name="options-outline" size={18} color={COLORS.primary} />
          <Text style={styles.filterLaunchText}>Filter</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showFilters}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable style={styles.filterOverlayBackdrop} onPress={() => setShowFilters(false)}>
          <Pressable style={styles.filterOverlayCard} onPress={() => {}}>
            <View style={styles.filterOverlayHeader}>
              <View style={styles.filterTitleRow}>
                <View style={styles.filterIconWrap}>
                  <Ionicons name="options-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.filterTitleCopy}>
                  <Text style={styles.filterTitle}>Filters</Text>
                  <Text style={styles.filterSubtitle}>Choose what you need, then tap Apply.</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.filterCloseIconBtn} onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filterOverlayScroll}
              contentContainerStyle={styles.filterBody}
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={styles.filterInput}
                placeholder="Search by food name"
                placeholderTextColor={PLACEHOLDER_COLOR}
                value={foodNameFilter}
                onChangeText={setFoodNameFilter}
              />

              <TextInput
                style={styles.filterInput}
                placeholder="Search by donor name"
                placeholderTextColor={PLACEHOLDER_COLOR}
                value={donorNameFilter}
                onChangeText={setDonorNameFilter}
              />

              <TextInput
                style={styles.filterInput}
                placeholder="Search by location"
                placeholderTextColor={PLACEHOLDER_COLOR}
                value={locationFilter}
                onChangeText={setLocationFilter}
              />

              <Text style={styles.filterGroupLabel}>Food Type</Text>
              <View style={styles.filterChipRow}>
                {FOOD_TYPE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.filterChip, foodTypeFilter === option && styles.filterChipActive]}
                    onPress={() => setFoodTypeFilter(option)}
                  >
                    <Text style={foodTypeFilter === option ? styles.filterChipTextActive : styles.filterChipText}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterGroupLabel}>Category</Text>
              <View style={styles.filterChipRow}>
                {CATEGORY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[styles.filterChip, categoryFilter === option && styles.filterChipActive]}
                    onPress={() => setCategoryFilter(option)}
                  >
                    <Text style={categoryFilter === option ? styles.filterChipTextActive : styles.filterChipText}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.nearbyHeaderRow}>
                <Text style={styles.nearbyLabel}>Nearby</Text>
                {locatingUser ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
              </View>

              <View style={styles.radiusRow}>
                <TouchableOpacity
                  style={[styles.radiusChip, !nearbyRadiusKm && styles.radiusChipActive]}
                  onPress={() => setNearbyRadiusKm(null)}
                >
                  <Text style={!nearbyRadiusKm ? styles.radiusTextActive : styles.radiusText}>Any</Text>
                </TouchableOpacity>

                {NEARBY_OPTIONS.map((radiusKm) => (
                  <TouchableOpacity
                    key={radiusKm}
                    style={[styles.radiusChip, nearbyRadiusKm === radiusKm && styles.radiusChipActive]}
                    onPress={() => handleNearbyRadiusChange(radiusKm)}
                  >
                    <Text style={nearbyRadiusKm === radiusKm ? styles.radiusTextActive : styles.radiusText}>
                      {radiusKm} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {nearbyRadiusKm ? (
                <Text style={styles.helperText}>
                  When you tap Apply, the app will use your current location for the {nearbyRadiusKm} km filter.
                </Text>
              ) : (
                <Text style={styles.helperText}>
                  Use nearby to filter donations around you.
                </Text>
              )}
            </ScrollView>

            <View style={styles.filterActionsRow}>
              <TouchableOpacity style={styles.secondaryActionBtn} onPress={clearFilters}>
                <Text style={styles.secondaryActionText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => setShowFilters(false)}>
                <Text style={styles.secondaryActionText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryActionBtn} onPress={applyFilters}>
                <Text style={styles.primaryActionText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredFoodList}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchFood();
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={44} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No matching food found</Text>
              <Text style={styles.emptyCopy}>
                Try changing the food, donor, location, or nearby filters.
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: COLORS.bg,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  filterSummaryBar: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  filterSummaryCopy: {
    flex: 1,
    marginRight: 12,
  },
  filterSummaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  filterSummaryText: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  filterLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD2CA',
    backgroundColor: '#FFF2EF',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterLaunchText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  filterOverlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.42)',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 26,
  },
  filterOverlayCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  filterOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterTitleCopy: {
    flex: 1,
  },
  filterIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF2EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  filterToggleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  filterResultsText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: '700',
  },
  filterCloseIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F6F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  filterSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textLight,
  },
  filterOverlayScroll: {
    maxHeight: 520,
  },
  filterBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  filterInput: {
    backgroundColor: '#F6F8FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textDark,
    marginBottom: 10,
  },
  filterGroupLabel: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.chip,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  nearbyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  nearbyLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  radiusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.chip,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radiusChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  radiusText: {
    color: COLORS.textLight,
    fontSize: 13,
    fontWeight: '700',
  },
  radiusTextActive: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textLight,
  },
  filterActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  secondaryActionBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: '800',
  },
  primaryActionBtn: {
    flex: 1.2,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  loader: {
    marginTop: 50,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  foodCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  imageWrapper: {
    height: 160,
    width: '100%',
    position: 'relative',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bgGreen: {
    backgroundColor: '#E8F5E9',
  },
  bgRed: {
    backgroundColor: '#FFEBEE',
  },
  typeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
  },
  infoContainer: {
    padding: 16,
  },
  foodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  metaInfoText: {
    flex: 1,
    color: COLORS.textLight,
    fontSize: 13,
    marginLeft: 6,
    lineHeight: 18,
  },
  distanceText: {
    color: COLORS.blue,
    fontWeight: '700',
  },
  timeGrid: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 15,
    justifyContent: 'space-around',
  },
  timeItem: {
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  expiryText: {
    color: COLORS.red,
  },
  verticalLine: {
    width: 1,
    backgroundColor: '#EEE',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  storageText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mapBtn: {
    flex: 0.32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  mapBtnDisabled: {
    opacity: 0.5,
  },
  mapBtnText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  requestBtn: {
    flex: 0.68,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  requestBtnDisabled: {
    opacity: 0.7,
  },
  requestBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  emptyCopy: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AvailableFoodScreen;
