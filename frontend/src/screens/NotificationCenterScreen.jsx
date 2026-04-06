import React, { useContext, useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NotificationContext } from '../context/NotificationContext';
import { AuthContext } from '../context/AuthContext';
import { resolveNotificationTarget } from '../utils/notificationNavigation';

const COLORS = {
  background: '#F6F7FB',
  card: '#FFFFFF',
  text: '#243040',
  muted: '#7B8794',
  primary: '#F25F4C',
  border: '#E7ECF3',
};

const iconForType = (type) => {
  if (type === 'chat_message') return 'chatbubble-ellipses';
  if (type === 'food_posted') return 'restaurant';
  if (type === 'ngo_request') return 'notifications';
  if (type === 'volunteer_assigned') return 'bicycle';
  if (type === 'food_delivered') return 'checkmark-done-circle';
  if (type === 'chat_terminated') return 'stop-circle';
  if (type === 'request_cancelled') return 'close-circle';
  return 'notifications';
};

const NotificationCenterScreen = ({ navigation }) => {
  const { notifications, refreshNotifications, markAsRead, markAllAsRead } = useContext(NotificationContext);
  const { userInfo } = useContext(AuthContext);

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [notifications]
  );

  const openNotification = async (item) => {
    if (!item.read) {
      await markAsRead(item._id);
    }

    const target = resolveNotificationTarget(item, userInfo?.role);
    navigation.navigate(target.screen, target.params);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedNotifications}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refreshNotifications} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && styles.unreadCard]}
            activeOpacity={0.85}
            onPress={() => openNotification(item)}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={iconForType(item.type)} size={20} color={COLORS.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBodyText}>{item.body}</Text>
              <Text style={styles.cardMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyCopy}>New requests, chat messages, assignments, and delivery updates will show here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },
  markAllText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadCard: {
    borderColor: '#FFD6CD',
    backgroundColor: '#FFF9F7',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFF0EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  cardBodyText: {
    marginTop: 4,
    color: '#576476',
    fontSize: 13,
    lineHeight: 19,
  },
  cardMeta: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 11,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    marginLeft: 10,
  },
  emptyState: {
    paddingTop: 90,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  emptyCopy: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 30,
  },
});

export default NotificationCenterScreen;

