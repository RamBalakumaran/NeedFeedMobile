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
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import { getWorkflowStatusLabel, getWorkflowStatusTone } from '../utils/workflowStatus';

const COLORS = {
  primary: '#F25F4C',
  bg: '#FAFAFA',
  card: '#FFF',
  text: '#333',
  green: '#4CAF50',
  blue: '#2196F3',
};

const DonorRequestsScreen = ({ navigation }) => {
  const { userToken } = useContext(AuthContext);
  const { notifications } = useContext(NotificationContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const res = await client.get('/food/requests/donor', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setRequests(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchRequests();
  }, []));

  const handleResponse = async (id, action) => {
    try {
      const res = await client.put(`/food/respond/${id}`, { action }, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const successMessage = action === 'accept'
        ? res?.data?.message || 'Request accepted.'
        : 'Request rejected.';
      Alert.alert('Success', successMessage);
      fetchRequests();
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not process response.');
    }
  };

  const handleCancel = async (id) => {
    Alert.alert('Cancel Order', "Stop this delivery and return food to the available list?", [
      { text: 'No' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await client.put(`/food/cancel/${id}`, {}, {
              headers: { Authorization: `Bearer ${userToken}` },
            });
            fetchRequests();
          } catch (error) {
            Alert.alert('Error', 'Could not cancel.');
          }
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
    const canViewConversation = ['Accepted', 'FindingVolunteer', 'WaitingForVolunteer', 'Assigned', 'PickupStarted', 'PickedUp', 'InTransit', 'Delivered'].includes(item.status);
    const canCancelRequest = ['FindingVolunteer', 'WaitingForVolunteer', 'Assigned', 'PickupStarted'].includes(item.status);
    const isChatTerminated = item.chatStatus === 'terminated';
    const canTerminateChat = canViewConversation && !isChatTerminated;
    const hasUnreadChat = !isChatTerminated && unreadChatRequestIds.has(String(item._id));
    const volunteerName = item.assignedVolunteer?.name || '';
    const workflowTone = getWorkflowStatusTone(item);
    const workflowLabel = getWorkflowStatusLabel(item);

    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{item.title || 'Food Donation'}</Text>
          <View style={styles.cardHeaderRight}>
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

        <Text style={styles.qty}>Qty: {item.quantity}</Text>

        <View style={styles.ngoBox}>
          <Text style={styles.ngoLabel}>Requested By</Text>
          <Text style={styles.ngoName}>{item.requestedBy?.organizationName || item.requestedBy?.name}</Text>
          <Text style={styles.ngoContact}>{item.requestedBy?.phone}</Text>
        </View>
        {volunteerName ? (
          <View style={styles.volunteerBox}>
            <Text style={styles.ngoLabel}>Volunteer</Text>
            <Text style={styles.ngoName}>{volunteerName}</Text>
            <Text style={styles.ngoContact}>{item.assignedVolunteer?.phone || 'Phone unavailable'}</Text>
          </View>
        ) : null}
        {isChatTerminated ? (
          <Text style={styles.terminatedNote}>
            Chat ended by {item.chatTerminatedBy?.name || 'a participant'}.
          </Text>
        ) : null}
        {item.status === 'WaitingForVolunteer' ? (
          <Text style={styles.waitingVolunteerNote}>
            No volunteer is currently available. The NGO can now choose direct pickup or cancel the order.
          </Text>
        ) : null}

        {item.status === 'Pending' && (
          <View style={styles.btnRow}>
            <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleResponse(item._id, 'reject')}>
              <Text style={[styles.btnText, { color: '#D32F2F' }]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={() => handleResponse(item._id, 'accept')}>
              <Text style={[styles.btnText, { color: '#388E3C' }]}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {canViewConversation && (
          <View style={styles.activeActions}>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.blue }]}
                onPress={() => navigation.navigate('Chat', {
                  requestId: item._id,
                  name: item.requestedBy?.organizationName || item.requestedBy?.name,
                  status: item.status,
                  chatStatus: item.chatStatus,
                })}
              >
                <Ionicons name="chatbubbles" size={18} color="#FFF" />
                <Text style={styles.whiteText}>{isChatTerminated ? 'View Chat' : 'Chat NGO'}</Text>
                {hasUnreadChat && <View style={styles.chatDot} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#607D8B' }]}
                onPress={() => navigation.navigate('OrderDetails', { item })}
              >
                <Ionicons name="list" size={18} color="#FFF" />
                <Text style={styles.whiteText}>Details</Text>
              </TouchableOpacity>
            </View>

            {canCancelRequest && (
              <TouchableOpacity style={styles.fullCancelBtn} onPress={() => handleCancel(item._id)}>
                <Text style={styles.cancelText}>Cancel Order</Text>
              </TouchableOpacity>
            )}

            {!canCancelRequest && canTerminateChat && (
              <TouchableOpacity style={styles.fullTerminateBtn} onPress={() => handleTerminateChat(item._id)}>
                <Text style={styles.terminateText}>Terminate Chat</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incoming Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={requests}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No pending requests.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFF',
    elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  card: { backgroundColor: '#FFF', borderRadius: 15, padding: 20, marginBottom: 15, elevation: 3 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#333', marginRight: 12 },
  statusBadge: { fontSize: 11, fontWeight: 'bold' },
  newMessagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  newMessageText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  qty: { color: '#666', marginTop: 5 },
  ngoBox: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, marginTop: 15 },
  volunteerBox: { backgroundColor: '#F0F7FF', padding: 12, borderRadius: 10, marginTop: 12 },
  ngoLabel: { fontSize: 11, color: '#999', fontWeight: 'bold' },
  ngoName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  ngoContact: { fontSize: 13, color: '#555' },
  terminatedNote: { marginTop: 12, color: '#B42318', fontWeight: '700' },
  waitingVolunteerNote: {
    marginTop: 12,
    color: '#9A3412',
    fontWeight: '700',
    lineHeight: 19,
  },
  btnRow: { flexDirection: 'row', gap: 15, marginTop: 20 },
  btn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  btnReject: { borderColor: '#FFCDD2', backgroundColor: '#FFEBEE' },
  btnAccept: { borderColor: '#C8E6C9', backgroundColor: '#E8F5E9' },
  btnText: { fontWeight: 'bold' },
  activeActions: { marginTop: 15 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D9FDD3' },
  whiteText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  fullCancelBtn: {
    width: '100%',
    padding: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 10,
    alignItems: 'center',
  },
  fullTerminateBtn: {
    width: '100%',
    padding: 12,
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F5B5B1',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelText: { color: '#D32F2F', fontWeight: 'bold' },
  terminateText: { color: '#B42318', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
});

export default DonorRequestsScreen;

