import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';

const { width } = Dimensions.get('window');
const FEEDBACK_WIDTH = width - 32;

const COLORS = {
  bg: '#F8F4EC',
  card: '#FFFDF8',
  text: '#1F2430',
  muted: '#6F7685',
  primary: '#F25F4C',
  green: '#1B8A5A',
  blue: '#2563EB',
  border: '#F0E5D6',
};

const ROLE_TITLES = { donor: 'Donor Hub', ngo: 'Relief Hub', volunteer: 'Route Hub', admin: 'Mission Control' };

const ROLE_ACTIONS = {
  donor: [
    { key: 'donate', label: 'Donate Food', route: 'Donate', icon: 'restaurant-outline', title: 'Create a fresh donation today.', subtitle: 'Post surplus food and let NGOs respond fast.', accent: '#F25F4C', bg: '#FFF2E6', cta: 'Start Donation' },
    { key: 'requests', label: 'Incoming Requests', route: 'DonorRequests', icon: 'mail-open-outline', title: 'Review NGO requests quickly.', subtitle: 'Approve the best match and keep deliveries moving.', accent: '#2563EB', bg: '#EEF4FF', cta: 'Open Requests' },
    { key: 'history', label: 'My Donations', route: 'MyDonations', icon: 'time-outline', title: 'Show the impact you already made.', subtitle: 'Revisit completed deliveries and older listings.', accent: '#1B8A5A', bg: '#ECFDF3', cta: 'View History' },
  ],
  ngo: [
    { key: 'food', label: 'Find Food', route: 'AvailableFood', icon: 'search-outline', title: 'Find donations available near your NGO.', subtitle: 'Browse listings, inspect details, and request fast.', accent: '#2563EB', bg: '#EEF4FF', cta: 'Browse Donations' },
    { key: 'requests', label: 'My Requests', route: 'NGODashboard', icon: 'file-tray-full-outline', title: 'Track every request from approval to delivery.', subtitle: 'See progress, volunteer status, and next steps.', accent: '#F25F4C', bg: '#FFF2E6', cta: 'Open Requests' },
  ],
  volunteer: [
    { key: 'tasks', label: 'Pickup Tasks', route: 'VolunteerDashboard', icon: 'bicycle-outline', title: 'Manage active routes from one home screen.', subtitle: 'Confirm pickup and delivery with clear next actions.', accent: '#1B8A5A', bg: '#ECFDF3', cta: 'Open Tasks' },
    { key: 'profile', label: 'My Profile', route: 'Profile', icon: 'person-outline', title: 'Stay visible for the next delivery assignment.', subtitle: 'Keep your area and contact details current.', accent: '#F25F4C', bg: '#FFF2E6', cta: 'Open Profile' },
  ],
  admin: [
    { key: 'dashboard', label: 'Dashboard', route: 'AdminDashboard', icon: 'speedometer-outline', title: 'Watch the platform pulse from the shared home page.', subtitle: 'Jump from overview to action when needed.', accent: '#2563EB', bg: '#EEF4FF', cta: 'Open Dashboard' },
    { key: 'users', label: 'Users', route: 'UserManagement', icon: 'people-outline', title: 'Review all donors, NGOs, and volunteers.', subtitle: 'Keep the network healthy and active.', accent: '#F25F4C', bg: '#FFF2E6', cta: 'Manage Users' },
    { key: 'food', label: 'Food Monitor', route: 'FoodMonitoring', icon: 'cube-outline', title: 'Track live donation operations.', subtitle: 'Check completed, stalled, and active flows.', accent: '#1B8A5A', bg: '#ECFDF3', cta: 'Open Monitor' },
    { key: 'analytics', label: 'Analytics', route: 'Analytics', icon: 'bar-chart-outline', title: 'See where growth and delivery quality are strongest.', subtitle: 'Use deeper analytics when you want more detail.', accent: '#C58A00', bg: '#FFF7D6', cta: 'View Analytics' },
  ],
};

const shortDate = (value) => {
  if (!value) return 'Today';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const initials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return (parts.length ? parts.map((part) => part[0]).join('') : 'NF').toUpperCase();
};

const roleBadge = (role) => (role === 'ngo' ? 'NGO Voice' : role === 'donor' ? 'Donor View' : role === 'volunteer' ? 'Volunteer View' : 'Community');

const feedbackContext = (item, role) => {
  if (!item) return '';
  if (role === 'donor') return item.volunteer?.name ? `Requested by ${item.ngo?.name || 'the NGO'} and delivered with ${item.volunteer.name}.` : `Picked up directly by ${item.ngo?.name || 'the NGO'}.`;
  if (role === 'ngo') return item.volunteer?.name ? `Food came from ${item.donor?.name || 'the donor'} and was delivered by ${item.volunteer.name}.` : `Food came directly from ${item.donor?.name || 'the donor'}.`;
  if (role === 'volunteer') return `From ${item.donor?.name || 'the donor'} to ${item.ngo?.name || 'the NGO'}.`;
  return 'Completed delivery.';
};

const Avatar = ({ user, size = 48 }) => (
  user?.profileImage ? (
    <Image source={{ uri: user.profileImage }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F3F4F6' }} />
  ) : (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initials(user?.name || 'NeedFeed')}</Text>
    </View>
  )
);

export default function HomeScreen({ navigation }) {
  const { userInfo, userToken } = useContext(AuthContext);
  const { unreadCount } = useContext(NotificationContext);

  const [overview, setOverview] = useState({ today: { donations: 0, delivered: 0, activeVolunteers: 0 }, spotlight: { donors: [], volunteers: [] }, feedback: { ngo: [], recent: [] }, pendingFeedback: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [impactSlide, setImpactSlide] = useState(0);
  const [slide, setSlide] = useState(0);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [prompted, setPrompted] = useState(false);

  const actions = useMemo(() => ROLE_ACTIONS[userInfo?.role] || [], [userInfo?.role]);
  const sliderItems = useMemo(() => overview.feedback?.ngo?.length ? overview.feedback.ngo : overview.feedback?.recent || [], [overview]);
  const impactItems = useMemo(() => ([
    {
      key: 'donations',
      label: "Today's donations",
      value: overview.today?.donations ?? 0,
      caption: 'Fresh donations posted today.',
      icon: 'sunny-outline',
      tint: COLORS.primary,
      bg: '#FFF1EA',
    },
    {
      key: 'delivered',
      label: 'Delivered today',
      value: overview.today?.delivered ?? 0,
      caption: 'Completed deliveries for today.',
      icon: 'checkmark-done-circle-outline',
      tint: COLORS.green,
      bg: '#ECFDF3',
    },
    {
      key: 'volunteers',
      label: 'Active volunteers today',
      value: overview.today?.activeVolunteers ?? 0,
      caption: 'Volunteers active in delivery flow.',
      icon: 'bicycle-outline',
      tint: COLORS.blue,
      bg: '#EEF4FF',
    },
  ]), [overview]);

  const fetchOverview = useCallback(async ({ silent = false } = {}) => {
    if (!userToken) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const res = await client.get('/food/home/overview', { headers: { Authorization: `Bearer ${userToken}` } });
      setOverview(res.data);
    } catch (error) {
      console.log('Home overview error:', error?.response?.data || error.message);
      if (!silent) Alert.alert('Home unavailable', 'We could not load the latest dashboard details right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userToken]);

  useFocusEffect(useCallback(() => { fetchOverview(); }, [fetchOverview]));

  useEffect(() => { setSlide(0); }, [sliderItems.length]);
  useEffect(() => { setImpactSlide(0); }, [impactItems.length]);

  useEffect(() => {
    if (overview.pendingFeedback?.length && !prompted) {
      setFeedbackTarget(overview.pendingFeedback[0]);
      setFeedbackRating(0);
      setFeedbackComment('');
      setFeedbackOpen(true);
      setPrompted(true);
    }
  }, [overview.pendingFeedback, prompted]);

  const openFeedback = (item) => {
    setFeedbackTarget(item);
    setFeedbackRating(0);
    setFeedbackComment('');
    setFeedbackOpen(true);
  };

  const closeFeedback = () => {
    if (!submitting) setFeedbackOpen(false);
  };

  const submitFeedback = async () => {
    if (!feedbackTarget?._id) return;
    if (!feedbackRating) return Alert.alert('Rating needed', 'Please select a rating before sending your feedback.');
    if (feedbackComment.trim().length < 5) return Alert.alert('Add a short note', 'Please write at least a few words about the completed delivery.');
    try {
      setSubmitting(true);
      await client.post(`/food/feedback/${feedbackTarget._id}`, { rating: feedbackRating, comment: feedbackComment.trim() }, { headers: { Authorization: `Bearer ${userToken}` } });
      Alert.alert('Thanks for sharing', 'Your delivery feedback has been saved.');
      setFeedbackOpen(false);
      setFeedbackTarget(null);
      setFeedbackRating(0);
      setFeedbackComment('');
      await fetchOverview({ silent: true });
    } catch (error) {
      Alert.alert('Could not submit feedback', error?.response?.data?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loader}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOverview({ silent: true }); }} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.eyebrow}>{ROLE_TITLES[userInfo?.role] || 'NeedFeed'}</Text>
              <Text style={styles.heroTitle}>Hello, {userInfo?.name?.split(' ')[0] || 'there'}</Text>
              <Text style={styles.heroSubtitle}>A strong delivery story today can inspire the next donor tomorrow.</Text>
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
                <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
                {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <Avatar user={{ name: userInfo?.name, profileImage: userInfo?.profileImage }} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroBottom}>
            <View style={styles.cityPill}>
              <Ionicons name="location-sharp" size={14} color={COLORS.primary} />
              <Text style={styles.cityText}>{userInfo?.city || 'Your city'}</Text>
            </View>
            <Text style={styles.heroMeta}>Shared impact from donors, NGOs, and volunteers</Text>
          </View>
        </View>

        {!!actions.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topTabsRow}>
            {actions.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.topTab}
                activeOpacity={0.88}
                onPress={() => navigation.navigate(item.route)}
              >
                <Text style={styles.topTabText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionTitle}>Today's Impact</Text>
              <Text style={styles.sectionSub}>Swipe to see each metric one at a time.</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => setImpactSlide(Math.round(event.nativeEvent.contentOffset.x / FEEDBACK_WIDTH))}
          >
            {impactItems.map((item) => (
              <View key={item.key} style={styles.slide}>
                <View style={[styles.impactCard, { backgroundColor: item.bg }]}>
                  <View style={[styles.impactIcon, { backgroundColor: item.tint }]}>
                    <Ionicons name={item.icon} size={22} color="#FFF" />
                  </View>
                  <Text style={styles.impactValue}>{item.value}</Text>
                  <Text style={styles.impactLabel}>{item.label}</Text>
                  <Text style={styles.impactCaption}>{item.caption}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dots}>
            {impactItems.map((item, index) => <View key={item.key} style={[styles.dot, index === impactSlide && styles.dotActive]} />)}
          </View>
        </View>

        {!!overview.pendingFeedback?.length && (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View>
                <Text style={styles.sectionTitle}>Feedback Needed</Text>
                <Text style={styles.sectionSub}>{overview.pendingFeedback.length} completed {overview.pendingFeedback.length === 1 ? 'delivery is' : 'deliveries are'} waiting for your note.</Text>
              </View>
              <TouchableOpacity style={styles.smallBtn} onPress={() => openFeedback(overview.pendingFeedback[0])}>
                <Text style={styles.smallBtnText}>Review</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
              {overview.pendingFeedback.map((item) => (
                <TouchableOpacity key={item._id} style={styles.pendingCard} onPress={() => openFeedback(item)}>
                  <Text style={styles.pendingTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.pendingText} numberOfLines={2}>{feedbackContext(item, userInfo?.role)}</Text>
                  <View style={styles.pendingFoot}>
                    <Text style={styles.pendingDate}>{shortDate(item.deliveredAt)}</Text>
                    <Text style={styles.pendingLink}>Add feedback</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={styles.sectionTitle}>{overview.feedback?.ngo?.length ? 'NGO Feedback Slider' : 'Community Feedback Slider'}</Text>
              <Text style={styles.sectionSub}>Real delivery stories help future donors trust the process.</Text>
            </View>
          </View>

          {sliderItems.length ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => setSlide(Math.round(event.nativeEvent.contentOffset.x / FEEDBACK_WIDTH))}
              >
                {sliderItems.map((item) => (
                  <View key={item.id} style={styles.slide}>
                    <View style={styles.feedbackCard}>
                      <View style={styles.feedbackHeader}>
                        <View style={styles.feedbackAuthor}>
                          <Avatar user={item.author} size={46} />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.feedbackName}>{item.author?.name}</Text>
                            <Text style={styles.feedbackMeta}>{roleBadge(item.role)} - {shortDate(item.submittedAt)}</Text>
                          </View>
                        </View>
                        <View style={styles.scorePill}>
                          <Ionicons name="star" size={13} color="#F59E0B" />
                          <Text style={styles.scoreText}>{item.rating}/5</Text>
                        </View>
                      </View>
                      <Text style={styles.feedbackQuote}>"{item.comment || 'The delivery was smooth, timely, and worth repeating.'}"</Text>
                      <View style={styles.feedbackTag}>
                        <Ionicons name="leaf-outline" size={14} color={COLORS.green} />
                        <Text style={styles.feedbackTagText}>{item.donationTitle}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.dots}>
                {sliderItems.map((item, index) => <View key={item.id} style={[styles.dot, index === slide && styles.dotActive]} />)}
              </View>
            </>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={COLORS.primary} />
              <Text style={styles.emptyTitle}>Feedback will appear here</Text>
              <Text style={styles.emptyText}>Once completed deliveries are reviewed, this slider becomes a trust-building story wall.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Donors</Text>
          <Text style={styles.sectionSub}>Recognizing people and teams keeping food moving.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
            {overview.spotlight?.donors?.length ? overview.spotlight.donors.map((item) => (
              <View key={item.userId} style={styles.personCard}>
                <Avatar user={item} size={52} />
                <Text style={styles.personName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.personMeta} numberOfLines={1}>{item.donorType || item.city || 'Community donor'}</Text>
                <Text style={styles.personScore}>{item.deliveredPosts || 0} delivered</Text>
              </View>
            )) : <Text style={styles.placeholderText}>Top donors will appear here as deliveries grow.</Text>}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Volunteers</Text>
          <Text style={styles.sectionSub}>Faces behind reliable pickup and delivery support.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowScroll}>
            {overview.spotlight?.volunteers?.length ? overview.spotlight.volunteers.map((item) => (
              <View key={item.userId} style={styles.personCard}>
                <Avatar user={item} size={52} />
                <Text style={styles.personName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.personMeta} numberOfLines={1}>{item.vehicleType || item.preferredArea || item.city || 'Volunteer'}</Text>
                <Text style={styles.personScore}>{item.deliveredAssignments || 0} delivered</Text>
              </View>
            )) : <Text style={styles.placeholderText}>Volunteer highlights will appear after completed routes.</Text>}
          </ScrollView>
        </View>

      </ScrollView>

      <Modal visible={feedbackOpen} transparent animationType="slide" onRequestClose={closeFeedback}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.modalTitle}>Share Delivery Feedback</Text>
                <Text style={styles.modalSub}>{feedbackTarget?.title || 'Completed donation'}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={closeFeedback} disabled={submitting}>
                <Ionicons name="close" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHelper}>{feedbackContext(feedbackTarget, userInfo?.role)}</Text>

            <Text style={styles.label}>Rating</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((value) => {
                const active = value <= feedbackRating;
                return (
                  <TouchableOpacity key={value} style={[styles.starBtn, active && styles.starBtnActive]} onPress={() => setFeedbackRating(value)}>
                    <Ionicons name={active ? 'star' : 'star-outline'} size={20} color={active ? '#F59E0B' : COLORS.muted} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>What went well?</Text>
            <TextInput
              style={styles.input}
              multiline
              maxLength={280}
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              textAlignVertical="top"
              placeholder="Share timing, communication, pickup quality, or delivery support."
            />
            <Text style={styles.count}>{feedbackComment.trim().length}/280</Text>

            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={submitFeedback} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <><Text style={styles.submitBtnText}>Submit Feedback</Text><Ionicons name="send" size={16} color="#FFF" /></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingTop: 10, paddingBottom: 28 },
  loader: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: COLORS.card, borderRadius: 28, padding: 22, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#372A1F', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: COLORS.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroTitle: { marginTop: 8, fontSize: 29, fontWeight: '900', color: COLORS.text },
  heroSubtitle: { marginTop: 8, fontSize: 14, lineHeight: 21, color: COLORS.muted },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF7EF', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  heroBottom: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFF7EF' },
  cityText: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  heroMeta: { flex: 1, textAlign: 'right', color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  topTabsRow: { paddingTop: 14, paddingRight: 4 },
  topTab: { marginRight: 10, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  topTabText: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  section: { marginTop: 16, backgroundColor: COLORS.card, borderRadius: 26, paddingVertical: 18, borderWidth: 1, borderColor: COLORS.border },
  sectionHead: { paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  sectionSub: { marginTop: 4, color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  smallBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  smallBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  rowScroll: { paddingLeft: 18, paddingRight: 10, paddingTop: 16 },
  pendingCard: { width: 240, marginRight: 12, padding: 16, borderRadius: 20, backgroundColor: '#FFF5EF', borderWidth: 1, borderColor: '#FADCCD' },
  pendingTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  pendingText: { marginTop: 8, color: COLORS.muted, fontSize: 13, lineHeight: 19, minHeight: 40 },
  pendingFoot: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pendingDate: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  pendingLink: { color: COLORS.primary, fontSize: 12, fontWeight: '900' },
  slide: { width: FEEDBACK_WIDTH, paddingLeft: 18, paddingRight: 4, paddingTop: 16 },
  impactCard: { minHeight: 190, borderRadius: 24, padding: 20, justifyContent: 'space-between' },
  impactIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  impactValue: { marginTop: 16, color: COLORS.text, fontSize: 42, fontWeight: '900' },
  impactLabel: { marginTop: 8, color: COLORS.text, fontSize: 24, lineHeight: 31, fontWeight: '900' },
  impactCaption: { marginTop: 6, color: COLORS.muted, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  feedbackCard: { minHeight: 210, borderRadius: 22, padding: 18, backgroundColor: '#FFF9F2', borderWidth: 1, borderColor: '#F6E5CC', justifyContent: 'space-between' },
  feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  feedbackAuthor: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  feedbackName: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  feedbackMeta: { marginTop: 3, color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF0CC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  scoreText: { color: '#9A6400', fontSize: 12, fontWeight: '900' },
  feedbackQuote: { marginTop: 18, color: COLORS.text, fontSize: 20, lineHeight: 29, fontWeight: '700' },
  feedbackTag: { marginTop: 18, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: '#EEFBF2' },
  feedbackTagText: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0D1BD' },
  dotActive: { width: 24, backgroundColor: COLORS.primary },
  emptyBox: { marginHorizontal: 18, marginTop: 16, padding: 22, borderRadius: 22, backgroundColor: '#FFF7EF', alignItems: 'center' },
  emptyTitle: { marginTop: 12, color: COLORS.text, fontSize: 17, fontWeight: '800' },
  emptyText: { marginTop: 8, color: COLORS.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  personCard: { width: 146, marginRight: 12, backgroundColor: '#FFF', borderRadius: 22, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F3E8D8' },
  personName: { marginTop: 12, color: COLORS.text, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  personMeta: { marginTop: 4, color: COLORS.muted, fontSize: 11, minHeight: 28, textAlign: 'center' },
  personScore: { marginTop: 12, color: COLORS.primary, fontSize: 11, fontWeight: '900', backgroundColor: '#FFF3E2', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  placeholderText: { paddingVertical: 24, paddingRight: 18, color: COLORS.muted, fontSize: 13 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE7DB' },
  avatarText: { color: COLORS.primary, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.38)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  modalTitle: { color: COLORS.text, fontSize: 24, fontWeight: '900' },
  modalSub: { marginTop: 4, color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F4EFE7', alignItems: 'center', justifyContent: 'center' },
  modalHelper: { marginTop: 14, color: COLORS.muted, fontSize: 14, lineHeight: 21 },
  label: { marginTop: 18, color: COLORS.text, fontSize: 14, fontWeight: '800' },
  starRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  starBtn: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F1E8' },
  starBtnActive: { backgroundColor: '#FFF0CC' },
  input: { marginTop: 12, minHeight: 120, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 14, color: COLORS.text, fontSize: 14, lineHeight: 21 },
  count: { marginTop: 8, color: COLORS.muted, fontSize: 11, textAlign: 'right', fontWeight: '700' },
  submitBtn: { marginTop: 18, height: 54, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900' },
});

