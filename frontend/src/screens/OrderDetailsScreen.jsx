import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getWorkflowStatusLabel } from '../utils/workflowStatus';

const COLORS = {
  background: '#F5F7FA',
  card: '#FFFFFF',
  title: '#1F2937',
  accent: '#F25F4C',
  label: '#6B7280',
  value: '#111827',
  border: '#E5E7EB',
  success: '#1F8F43',
  danger: '#B42318',
};

const formatValue = (value, fallback = '-') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value);
};

const DetailRow = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{formatValue(value)}</Text>
  </View>
);

const InfoCard = ({ title, children }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

const OrderDetailsScreen = ({ route }) => {
  const { item } = route.params || {};
  const chatEnded = item?.chatStatus === 'terminated';
  const statusHistory = Array.isArray(item?.statusHistory) ? item.statusHistory : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Request Details</Text>
      <Text style={styles.subHeader}>ID #{item?._id?.slice(-6) || '000000'}</Text>

      <InfoCard title="Food Details">
        <DetailRow label="Item" value={item?.title} />
        <DetailRow label="Quantity" value={item?.quantity} />
        <DetailRow label="Type" value={item?.foodType} />
        <DetailRow label="Category" value={item?.category} />
        <DetailRow label="Workflow Status" value={getWorkflowStatusLabel(item)} />
        <DetailRow label="Operational Status" value={item?.status} />
        <DetailRow label="Description" value={item?.description} />
      </InfoCard>

      <InfoCard title="Status Timeline">
        {statusHistory.length ? statusHistory.map((entry, index) => (
          <View key={`${entry?.status || 'status'}-${index}`} style={styles.timelineRow}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineCopy}>
              <Text style={styles.timelineLabel}>{entry?.label || entry?.status || 'Status Updated'}</Text>
              {entry?.note ? <Text style={styles.timelineNote}>{entry.note}</Text> : null}
              <Text style={styles.timelineMeta}>
                {(entry?.actor?.name || 'System')}
                {entry?.timestamp ? ` • ${new Date(entry.timestamp).toLocaleString()}` : ''}
              </Text>
            </View>
          </View>
        )) : (
          <Text style={styles.timelineEmpty}>No status timeline available yet.</Text>
        )}
      </InfoCard>

      <InfoCard title="Donor Info">
        <DetailRow label="Name" value={item?.donor?.name} />
        <DetailRow label="Phone" value={item?.donor?.phone} />
        <DetailRow label="Address" value={item?.donor?.address} />
      </InfoCard>

      <InfoCard title="NGO Info">
        <DetailRow label="Organization" value={item?.requestedBy?.organizationName || item?.requestedBy?.name} />
        <DetailRow label="Phone" value={item?.requestedBy?.phone} />
        <DetailRow label="Address" value={item?.requestedBy?.address} />
      </InfoCard>

      <InfoCard title="Volunteer Info">
        <DetailRow label="Name" value={item?.assignedVolunteer?.name || 'Not assigned yet'} />
        <DetailRow label="Phone" value={item?.assignedVolunteer?.phone} />
        <DetailRow label="Vehicle" value={item?.assignedVolunteer?.vehicleType} />
        <DetailRow label="Address" value={item?.assignedVolunteer?.address} />
      </InfoCard>

      <InfoCard title="Chat Status">
        <DetailRow label="Conversation" value={chatEnded ? 'Terminated' : 'Active'} />
        <DetailRow label="Ended By" value={item?.chatTerminatedBy?.name} />
        <DetailRow
          label="Ended At"
          value={item?.chatTerminatedAt ? new Date(item.chatTerminatedAt).toLocaleString() : '-'}
        />
        <Text style={[styles.statusNote, chatEnded ? styles.statusNoteEnded : styles.statusNoteActive]}>
          {chatEnded
            ? 'Chat history is still visible, but new messages are disabled.'
            : 'Chat stays open through pickup and delivery until the donor or NGO terminates it.'}
        </Text>
      </InfoCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.title,
  },
  subHeader: {
    marginTop: 6,
    marginBottom: 18,
    color: COLORS.label,
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.accent,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  label: {
    color: COLORS.label,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  value: {
    color: COLORS.value,
    fontSize: 13,
    fontWeight: '800',
    flex: 1.2,
    textAlign: 'right',
  },
  statusNote: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  statusNoteActive: {
    color: COLORS.success,
  },
  statusNoteEnded: {
    color: COLORS.danger,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
    marginTop: 5,
  },
  timelineCopy: {
    flex: 1,
  },
  timelineLabel: {
    color: COLORS.value,
    fontSize: 13,
    fontWeight: '800',
  },
  timelineNote: {
    marginTop: 3,
    color: COLORS.label,
    fontSize: 12,
    lineHeight: 18,
  },
  timelineMeta: {
    marginTop: 4,
    color: COLORS.label,
    fontSize: 11,
    fontWeight: '700',
  },
  timelineEmpty: {
    color: COLORS.label,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default OrderDetailsScreen;
