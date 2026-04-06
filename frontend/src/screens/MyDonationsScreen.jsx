import React, { useCallback, useContext, useMemo, useState } from 'react';
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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { getWorkflowStatusLabel, getWorkflowStatusTone } from '../utils/workflowStatus';

const COLORS = {
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  primary: '#F25F4C',
  success: '#1F8F43',
  successBg: '#EAF8EF',
  warning: '#E59B23',
  warningBg: '#FFF5E5',
  danger: '#D32F2F',
  dangerBg: '#FDECEC',
};

const FOOD_TYPES = ['Veg', 'Non-Veg', 'Vegan'];
const CATEGORIES = ['Cooked', 'Raw', 'Bakery', 'Packed'];
const STORAGE_OPTIONS = ['Room Temperature', 'Refrigerate', 'Keep Hot'];

const Selector = ({ options, selected, onSelect }) => (
  <View style={styles.selectorWrap}>
    {options.map((option) => (
      <TouchableOpacity
        key={option}
        activeOpacity={0.9}
        style={[styles.selectorChip, selected === option && styles.selectorChipActive]}
        onPress={() => onSelect(option)}
      >
        <Text style={[styles.selectorText, selected === option && styles.selectorTextActive]}>
          {option}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const getStatusConfig = (item) => {
  const now = new Date();
  const isExpired = new Date(item.expiryTime) <= now;

  if (isExpired) {
    return { label: 'EXPIRED', color: COLORS.danger, bg: COLORS.dangerBg };
  }

  if (item.status && item.status !== 'Available') {
    const workflowTone = getWorkflowStatusTone(item);
    return {
      label: getWorkflowStatusLabel(item).toUpperCase(),
      color: workflowTone.color,
      bg: workflowTone.backgroundColor,
    };
  }

  const workflowTone = getWorkflowStatusTone(item);
  return {
    label: getWorkflowStatusLabel(item).toUpperCase(),
    color: workflowTone.color || COLORS.success,
    bg: workflowTone.backgroundColor || COLORS.successBg,
  };
};

const canEditDonation = (item) => (
  item?.status === 'Available' && new Date(item.expiryTime) > new Date()
);

const MyDonationsScreen = ({ navigation }) => {
  const { userInfo, userToken } = useContext(AuthContext);
  const donorId = userInfo?._id || userInfo?.id;

  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const donationCountLabel = useMemo(
    () => `${donations.length} donation${donations.length === 1 ? '' : 's'}`,
    [donations.length]
  );

  const fetchMyDonations = async ({ silent = false } = {}) => {
    if (!donorId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    try {
      const res = await client.get(`/food/my/${donorId}`);
      setDonations(res.data);
    } catch (error) {
      console.log('Error fetching donations:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchMyDonations();
  }, [donorId]));

  const openEditModal = (item) => {
    if (!canEditDonation(item)) {
      Alert.alert('Edit unavailable', 'Only active donations that are still available can be edited.');
      return;
    }

    setEditForm({
      _id: item._id,
      title: item.title || '',
      quantity: item.quantity || '',
      description: item.description || '',
      foodType: item.foodType || 'Veg',
      category: item.category || 'Cooked',
      storageInstruction: item.storageInstruction || 'Room Temperature',
      image: item.imageUrl || '',
      originalImage: item.imageUrl || '',
    });
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditForm(null);
  };

  const pickImage = () => {
    Alert.alert('Update photo', 'Choose a source', [
      { text: 'Camera', onPress: openCamera },
      { text: 'Gallery', onPress: openGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera access is needed to update the photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });

    if (!result.canceled) {
      setEditForm((prev) => prev ? { ...prev, image: result.assets[0].uri } : prev);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Gallery access is needed to update the photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });

    if (!result.canceled) {
      setEditForm((prev) => prev ? { ...prev, image: result.assets[0].uri } : prev);
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;

    if (!editForm.title.trim() || !editForm.quantity.trim()) {
      Alert.alert('Missing details', 'Please fill in both food name and quantity.');
      return;
    }

    setSaving(true);

    try {
      const imageChanged = editForm.image && editForm.image !== editForm.originalImage;
      const payload = {
        title: editForm.title.trim(),
        quantity: editForm.quantity.trim(),
        description: editForm.description.trim(),
        foodType: editForm.foodType,
        category: editForm.category,
        storageInstruction: editForm.storageInstruction,
      };
      const buildRequestBody = () => {
        if (!imageChanged) {
          return payload;
        }

        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          formData.append(key, value);
        });

        const extension = editForm.image.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = extension === 'png' ? 'image/png' : extension === 'heic' ? 'image/heic' : 'image/jpeg';

        formData.append('image', {
          uri: editForm.image,
          name: `donation-edit.${extension}`,
          type: mimeType,
        });

        return formData;
      };

      const requestHeaders = {
        Authorization: `Bearer ${userToken}`,
      };

      try {
        await client.put(`/food/my/${editForm._id}`, buildRequestBody(), {
          headers: {
            ...requestHeaders,
          },
        });
      } catch (error) {
        const responseBody = String(error?.response?.data || '');
        const routeMissing = error?.response?.status === 404
          || responseBody.includes('Cannot PUT /api/food/my/');

        if (!routeMissing) {
          throw error;
        }

        await client.post(`/food/my/${editForm._id}`, buildRequestBody(), {
          headers: {
            ...requestHeaders,
          },
        });
      }

      Alert.alert('Updated', 'Donation details saved successfully.');
      setEditForm(null);
      await fetchMyDonations({ silent: true });
    } catch (error) {
      console.log('Donation update error:', error?.response?.data || error.message);
      const responseBody = String(error?.response?.data || '');
      const routeStillMissing = error?.response?.status === 404
        || responseBody.includes('Cannot PUT /api/food/my/')
        || responseBody.includes('Cannot POST /api/food/my/');
      const message = routeStillMissing
        ? 'The backend update route is not active yet. Restart the backend server and try again.'
        : error?.response?.data?.message || 'Could not update this donation.';
      Alert.alert('Update failed', message);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }) => {
    const status = getStatusConfig(item);
    const editable = canEditDonation(item);

    return (
      <View style={styles.card}>
        <Image source={{ uri: item.imageUrl }} style={styles.image} />

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          <Text style={styles.detailText}>Qty: {item.quantity}</Text>
          <Text style={styles.detailText}>Posted: {new Date(item.createdAt).toLocaleDateString()}</Text>
          <Text style={styles.detailText}>Expires: {new Date(item.expiryTime).toLocaleDateString()}</Text>

          <View style={styles.footerRow}>
            <Text style={styles.footerHint}>
              {editable ? 'You can still edit this listing.' : 'Locked after request or expiry.'}
            </Text>
            <TouchableOpacity
              style={[styles.editBtn, !editable && styles.editBtnDisabled]}
              disabled={!editable}
              onPress={() => openEditModal(item)}
            >
              <Text style={[styles.editText, !editable && styles.editTextDisabled]}>
                {editable ? 'Edit' : 'Locked'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <>
          <View style={styles.summaryBar}>
            <Text style={styles.summaryTitle}>Donation History</Text>
            <Text style={styles.summaryCopy}>{donationCountLabel}</Text>
          </View>

          <FlatList
            data={donations}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={(
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchMyDonations({ silent: true });
                }}
              />
            )}
            ListEmptyComponent={(
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🥡</Text>
                <Text style={styles.emptyText}>No donations yet.</Text>
                <TouchableOpacity style={styles.donateBtn} onPress={() => navigation.navigate('Donate')}>
                  <Text style={styles.donateBtnText}>Donate Now</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}

      <Modal visible={!!editForm} animationType="slide" transparent onRequestClose={closeEditModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Donation</Text>
                <Text style={styles.modalSubtitle}>Update the listing while it is still active.</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={closeEditModal} disabled={saving}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <TouchableOpacity style={styles.imagePickerCard} onPress={pickImage} activeOpacity={0.9}>
                {editForm?.image ? (
                  <Image source={{ uri: editForm.image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={26} color={COLORS.primary} />
                    <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Food name"
                value={editForm?.title}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, title: value }))}
              />

              <TextInput
                style={styles.input}
                placeholder="Quantity"
                value={editForm?.quantity}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, quantity: value }))}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                value={editForm?.description}
                onChangeText={(value) => setEditForm((prev) => ({ ...prev, description: value }))}
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.inputLabel}>Dietary Type</Text>
              <Selector
                options={FOOD_TYPES}
                selected={editForm?.foodType}
                onSelect={(value) => setEditForm((prev) => ({ ...prev, foodType: value }))}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <Selector
                options={CATEGORIES}
                selected={editForm?.category}
                onSelect={(value) => setEditForm((prev) => ({ ...prev, category: value }))}
              />

              <Text style={styles.inputLabel}>Storage Condition</Text>
              <Selector
                options={STORAGE_OPTIONS}
                selected={editForm?.storageInstruction}
                onSelect={(value) => setEditForm((prev) => ({ ...prev, storageInstruction: value }))}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeEditModal} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loader: {
    marginTop: 60,
  },
  summaryBar: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 4,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },
  summaryCopy: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
    paddingBottom: 26,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    marginBottom: 14,
    padding: 10,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  image: {
    width: 92,
    height: 92,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  content: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginRight: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  detailText: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  footerHint: {
    flex: 1,
    color: '#9CA3AF',
    fontSize: 11,
    marginRight: 10,
  },
  editBtn: {
    backgroundColor: '#FFF0EB',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  editBtnDisabled: {
    backgroundColor: '#F3F4F6',
  },
  editText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  editTextDisabled: {
    color: '#9CA3AF',
  },
  emptyBox: {
    alignItems: 'center',
    marginTop: 90,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyText: {
    color: '#6B7280',
    marginTop: 10,
    marginBottom: 20,
    fontSize: 15,
  },
  donateBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  donateBtnText: {
    color: '#FFF',
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '92%',
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  modalSubtitle: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 13,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingBottom: 16,
  },
  imagePickerCard: {
    height: 170,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: COLORS.primary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 100,
  },
  inputLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  selectorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  selectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
  },
  selectorChipActive: {
    backgroundColor: COLORS.primary,
  },
  selectorText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 12,
  },
  selectorTextActive: {
    color: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cancelBtnText: {
    color: COLORS.text,
    fontWeight: '800',
  },
  saveBtn: {
    flex: 1.3,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '900',
  },
});

export default MyDonationsScreen;
