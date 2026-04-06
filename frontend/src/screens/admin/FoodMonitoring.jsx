import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
  border: '#E7ECF3',
  primary: '#FF624C',
  success: '#1F8F43',
  warning: '#E59B23',
  danger: '#D32F2F',
};

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || 'Not Provided'}</Text>
  </View>
);

const PersonSection = ({ title, person, fields }) => {
  if (!person) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {fields.map(([label, key]) => (
        <InfoRow key={label} label={label} value={person?.[key]} />
      ))}
    </View>
  );
};

const FoodMonitoringScreen = () => {
  const { userToken } = useContext(AuthContext);
  const [food, setFood] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);

  const fetchFood = async () => {
    try {
      const res = await client.get('/admin/food', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setFood(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFood();
  }, []);

  const deleteFood = (id) => {
    Alert.alert('Remove post?', 'Delete this food post after reviewing the details?', [
      { text: 'Cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/admin/food/${id}`, {
              headers: { Authorization: `Bearer ${userToken}` },
            });
            setSelectedFood(null);
            fetchFood();
          } catch (error) {
            Alert.alert('Error', 'Failed to remove food post');
          }
        },
      },
    ]);
  };

  const renderStatusChip = (item) => {
    const statusColor =
      item.status === 'Delivered'
        ? COLORS.success
        : item.status === 'Pending' || item.status === 'WaitingForVolunteer' || item.status === 'FindingVolunteer'
          ? COLORS.warning
          : item.status === 'Expired' || item.status === 'Cancelled'
            ? COLORS.danger
            : COLORS.primary;

    return (
      <View style={[styles.statusChip, { backgroundColor: `${statusColor}16` }]}>
        <Text style={[styles.statusChipText, { color: statusColor }]}>{item.status}</Text>
      </View>
    );
  };

  const selectedDeliveryState = useMemo(() => {
    if (!selectedFood) return { label: '', color: COLORS.muted, detail: '' };
    if (!selectedFood.requestedBy) {
      return {
        label: 'Not locked by NGO',
        color: COLORS.warning,
        detail: 'This post has not been claimed by any NGO yet.',
      };
    }
    if (selectedFood.status === 'Delivered') {
      return {
        label: 'Delivered',
        color: COLORS.success,
        detail: 'Delivery completed successfully.',
      };
    }
    return {
      label: 'Not delivered yet',
      color: COLORS.primary,
      detail: 'This donation is still in progress or waiting for completion.',
    };
  }, [selectedFood]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.86} onPress={() => setSelectedFood(item)}>
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <View style={styles.cardBody}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.sub}>Posted by {item.donor?.name || 'Unknown Donor'}</Text>
        <Text style={styles.sub}>{item.quantity} • {item.foodType}</Text>
        <View style={styles.cardFooter}>
          {renderStatusChip(item)}
          <Ionicons name="chevron-forward" size={20} color="#9AA6B2" />
        </View>
      </View>
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
          data={food}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchFood();
              }}
              colors={[COLORS.primary]}
            />
          }
        />
      )}

      <Modal visible={!!selectedFood} animationType="slide" transparent onRequestClose={() => setSelectedFood(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Food Review</Text>
              <TouchableOpacity onPress={() => setSelectedFood(null)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Image source={{ uri: selectedFood?.imageUrl }} style={styles.heroImage} />

              <View style={styles.statusReviewCard}>
                <Text style={styles.statusReviewLabel}>Delivery Review</Text>
                <Text style={[styles.statusReviewValue, { color: selectedDeliveryState.color }]}>
                  {selectedDeliveryState.label}
                </Text>
                <Text style={styles.statusReviewDetail}>{selectedDeliveryState.detail}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Food Details</Text>
                <InfoRow label="Title" value={selectedFood?.title} />
                <InfoRow label="Quantity" value={selectedFood?.quantity} />
                <InfoRow label="Description" value={selectedFood?.description} />
                <InfoRow label="Food Type" value={selectedFood?.foodType} />
                <InfoRow label="Category" value={selectedFood?.category} />
                <InfoRow label="Storage" value={selectedFood?.storageInstruction} />
                <InfoRow label="Address" value={selectedFood?.address} />
                <InfoRow label="Status" value={selectedFood?.status} />
                <InfoRow label="Posted At" value={selectedFood?.createdAt ? new Date(selectedFood.createdAt).toLocaleString() : ''} />
                <InfoRow label="Expires At" value={selectedFood?.expiryTime ? new Date(selectedFood.expiryTime).toLocaleString() : ''} />
              </View>

              <PersonSection
                title="Posted By"
                person={selectedFood?.donor}
                fields={[
                  ['Name', 'name'],
                  ['Email', 'email'],
                  ['Phone', 'phone'],
                  ['City', 'city'],
                  ['Address', 'address'],
                ]}
              />

              {selectedFood?.requestedBy && (
                <PersonSection
                  title="Locked By NGO"
                  person={selectedFood?.requestedBy}
                  fields={[
                    ['Name', 'name'],
                    ['Organization', 'organizationName'],
                    ['Email', 'email'],
                    ['Phone', 'phone'],
                    ['City', 'city'],
                    ['License', 'licenseNumber'],
                    ['Capacity', 'capacity'],
                  ]}
                />
              )}

              {selectedFood?.assignedVolunteer && (
                <PersonSection
                  title="Delivery Volunteer"
                  person={selectedFood?.assignedVolunteer}
                  fields={[
                    ['Name', 'name'],
                    ['Email', 'email'],
                    ['Phone', 'phone'],
                    ['City', 'city'],
                    ['Preferred Area', 'preferredArea'],
                    ['Vehicle', 'vehicleType'],
                  ]}
                />
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => selectedFood?._id && deleteFood(selectedFood._id)}
            >
              <Ionicons name="trash-outline" size={18} color="#FFF" />
              <Text style={styles.deleteButtonText}>Delete Food After Review</Text>
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
    backgroundColor: COLORS.card,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
  image: {
    width: 92,
    height: 104,
    backgroundColor: '#E9EDF2',
  },
  cardBody: {
    flex: 1,
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  sub: {
    marginTop: 4,
    color: '#5B6778',
    fontSize: 13,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '90%',
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
  heroImage: {
    width: '100%',
    height: 190,
    borderRadius: 22,
    backgroundColor: '#E9EDF2',
    marginBottom: 14,
  },
  statusReviewCard: {
    backgroundColor: '#F9FAFC',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  statusReviewLabel: {
    fontSize: 12,
    color: COLORS.muted,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  statusReviewValue: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '900',
  },
  statusReviewDetail: {
    marginTop: 4,
    fontSize: 13,
    color: '#566374',
  },
  section: {
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

export default FoodMonitoringScreen;

