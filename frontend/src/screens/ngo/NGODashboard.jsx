import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';
import { getWorkflowStatusLabel, getWorkflowStatusTone } from '../../utils/workflowStatus';

const NGODashboard = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const { notifications } = useContext(NotificationContext);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyRequestId, setBusyRequestId] = useState(null);

  const unreadChatRequestIds = useMemo(
    () => new Set(
      notifications
        .filter((notification) => !notification.read && notification.type === 'chat_message')
        .map((notification) => String(notification?.data?.requestId || ''))
        .filter(Boolean)
    ),
    [notifications]
  );

  const fetchRequests = async () => {
    try {
      const res = await client.get('/food/requests/ngo', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setMyRequests(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchRequests();
  }, []));

  const performRequestAction = async (requestId, requestFn, successTitle, successMessage) => {
    try {
      setBusyRequestId(requestId);
      await requestFn();
      await fetchRequests();
      Alert.alert(successTitle, successMessage);
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not update this request.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleCancel = async (id) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          await performRequestAction(
            id,
            () => client.put(`/food/cancel/${id}`, {}, {
              headers: { Authorization: `Bearer ${userToken}` },
            }),
            'Cancelled',
            'Item returned to the available list.'
          );
        },
      },
    ]);
  };

  const handleDirectPickup = async (id) => {
    Alert.alert('Confirm Direct Pickup', 'If your NGO will collect this food directly, we will mark the request as delivered right away.', [
      { text: 'Not now' },
      {
        text: 'Mark Delivered',
        onPress: async () => {
          await performRequestAction(
            id,
            () => client.put(`/food/pickup/direct/${id}`, {}, {
              headers: { Authorization: `Bearer ${userToken}` },
            }),
            'Marked Delivered',
            'This request is now completed as a direct NGO pickup.'
          );
        },
      },
    ]);
  };

  const handleTerminateChat = async (id) => {
    Alert.alert('Terminate Chat', 'This keeps the chat history but stops any new messages. Continue?', [
      { text: 'No' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.put(`/chat/terminate/${id}`, {}, {
              headers: { Authorization: `Bearer ${userToken}` },
            });
            fetchRequests();
            Alert.alert('Chat ended', 'This conversation is now read-only.');
          } catch (error) {
            Alert.alert('Error', error?.response?.data?.message || 'Could not terminate this chat.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const canViewDetails = item.status !== 'Available';
    const canViewConversation = ['Accepted', 'FindingVolunteer', 'WaitingForVolunteer', 'Assigned', 'PickupStarted', 'PickedUp', 'InTransit', 'Delivered'].includes(item.status);
    const showDirectPickupChoice = item.status === 'WaitingForVolunteer' && !item.assignedVolunteer;
    const canCancelRequest = ['Pending', 'FindingVolunteer', 'Assigned', 'PickupStarted'].includes(item.status);
    const isChatTerminated = item.chatStatus === 'terminated';
    const canTerminateChat = canViewConversation && !isChatTerminated;
    const hasUnreadChat = !isChatTerminated && unreadChatRequestIds.has(String(item._id));
    const volunteerName = item.assignedVolunteer?.name || '';
    const workflowTone = getWorkflowStatusTone(item);
    const workflowLabel = getWorkflowStatusLabel(item);
    const isBusy = busyRequestId === item._id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.headerRight}>
            {hasUnreadChat && (
              <View style={styles.newMessagePill}>
                <Ionicons name="chatbubble-ellipses" size={12} color="#FFF" />
                <Text style={styles.newMessageText}>New msg</Text>
              </View>
            )}
            <Text style={[styles.statusBadge, { color: workflowTone.color }]}>
              {workflowLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.infoText}>Donor: {item.donor?.name || 'Private Donor'}</Text>
        {volunteerName ? (
          <Text style={styles.infoText}>Volunteer: {volunteerName}</Text>
        ) : null}
        {isChatTerminated ? (
          <Text style={styles.terminatedNote}>
            Chat ended by {item.chatTerminatedBy?.name || 'a participant'}.
          </Text>
        ) : null}
        {showDirectPickupChoice ? (
          <View style={styles.decisionCard}>
            <View style={styles.decisionHeader}>
              <Ionicons name="alert-circle" size={18} color="#B54708" />
              <Text style={styles.decisionTitle}>No volunteer is available right now</Text>
            </View>
            <Text style={styles.decisionBody}>
              Your NGO can collect this donation directly and mark it delivered, or cancel the request and release the order.
            </Text>
            <View style={styles.decisionActions}>
              <TouchableOpacity
                style={[styles.btn, styles.directPickupBtn, isBusy && styles.disabledBtn]}
                onPress={() => handleDirectPickup(item._id)}
                disabled={isBusy}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#0F766E" />
                <Text style={styles.directPickupText}>{isBusy ? 'Updating...' : 'Direct Pickup'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn, isBusy && styles.disabledBtn]}
                onPress={() => handleCancel(item._id)}
                disabled={isBusy}
              >
                <Ionicons name="close-circle-outline" size={16} color="#D32F2F" />
                <Text style={styles.cancelText}>{isBusy ? 'Updating...' : 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          {canViewDetails && (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.detailsBtn]}
                onPress={() => navigation.navigate('OrderDetails', { item })}
              >
                <Ionicons name="list" size={16} color="#333" />
                <Text style={styles.btnText}>Details</Text>
              </TouchableOpacity>

              {canViewConversation && (
                <TouchableOpacity
                  style={[styles.btn, styles.chatBtn]}
                  onPress={() => navigation.navigate('Chat', {
                    requestId: item._id,
                    name: item.donor?.name || 'Donor',
                    status: item.status,
                    chatStatus: item.chatStatus,
                  })}
                >
                  <Ionicons name="chatbubbles-outline" size={16} color="#FFF" />
                  <Text style={styles.whiteText}>{isChatTerminated ? 'View Chat' : 'Chat'}</Text>
                  {hasUnreadChat && <View style={styles.chatDot} />}
                </TouchableOpacity>
              )}
            </>
          )}

          {canCancelRequest && (
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, isBusy && styles.disabledBtn]}
              onPress={() => handleCancel(item._id)}
              disabled={isBusy}
            >
              <Ionicons name="close-circle-outline" size={16} color="#D32F2F" />
              <Text style={styles.cancelText}>{isBusy ? 'Updating...' : 'Cancel'}</Text>
            </TouchableOpacity>
          )}

          {!canCancelRequest && canTerminateChat && (
            <TouchableOpacity
              style={[styles.btn, styles.terminateBtn]}
              onPress={() => handleTerminateChat(item._id)}
            >
              <Ionicons name="stop-circle-outline" size={16} color="#B42318" />
              <Text style={styles.terminateText}>Terminate</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Food Requests</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#F25F4C" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={myRequests}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={styles.empty}>No active requests found.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { padding: 20, backgroundColor: '#FFF', elevation: 2, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1D212B' },
  card: { backgroundColor: '#FFF', padding: 18, borderRadius: 15, marginBottom: 15, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#333', marginRight: 12 },
  statusBadge: { fontSize: 11, fontWeight: 'bold' },
  newMessagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F25F4C',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  newMessageText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  infoText: { color: '#666', marginBottom: 15 },
  terminatedNote: { color: '#B42318', marginBottom: 15, fontWeight: '700' },
  decisionCard: {
    marginBottom: 15,
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  decisionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  decisionTitle: {
    flex: 1,
    color: '#9A3412',
    fontSize: 14,
    fontWeight: '900',
  },
  decisionBody: {
    color: '#9A3412',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  decisionActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionRow: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  directPickupBtn: { backgroundColor: '#E6FFFB' },
  detailsBtn: { backgroundColor: '#F0F0F0' },
  chatBtn: { backgroundColor: '#2196F3' },
  chatDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D9FDD3' },
  cancelBtn: { backgroundColor: '#FFEBEE' },
  terminateBtn: { backgroundColor: '#FDECEC' },
  disabledBtn: { opacity: 0.6 },
  btnText: { fontWeight: 'bold', fontSize: 12, color: '#333' },
  whiteText: { fontWeight: 'bold', fontSize: 12, color: '#FFF' },
  directPickupText: { fontWeight: 'bold', fontSize: 12, color: '#0F766E' },
  cancelText: { fontWeight: 'bold', fontSize: 12, color: '#D32F2F' },
  terminateText: { fontWeight: 'bold', fontSize: 12, color: '#B42318' },
  empty: { textAlign: 'center', marginTop: 50, color: '#999' },
});

export default NGODashboard;

