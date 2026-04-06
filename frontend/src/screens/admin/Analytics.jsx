import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import client from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

const COLORS = {
  primary: '#F25F4C',
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#27313F',
  muted: '#7C8898',
  success: '#20BF6B',
  warning: '#F7B731',
  info: '#45AAF2',
  danger: '#E74C3C',
  purple: '#8E5CF7',
};

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const Analytics = () => {
  const { userToken } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await client.get('/admin/stats', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setStats(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const breakdownEntries = useMemo(() => ([
    { label: 'Available', value: stats?.breakdown?.available || 0, color: COLORS.info },
    { label: 'Pending', value: stats?.breakdown?.pending || 0, color: COLORS.warning },
    { label: 'Finding Volunteer', value: stats?.breakdown?.findingVolunteer || 0, color: '#FF8A65' },
    { label: 'Waiting Volunteer', value: stats?.breakdown?.waitingVolunteer || 0, color: '#FFB74D' },
    { label: 'Assigned', value: stats?.breakdown?.assigned || 0, color: COLORS.purple },
    { label: 'Picked Up', value: stats?.breakdown?.pickedUp || 0, color: '#5C6BC0' },
    { label: 'Delivered', value: stats?.breakdown?.delivered || 0, color: COLORS.success },
    { label: 'Cancelled', value: stats?.breakdown?.cancelled || 0, color: COLORS.danger },
    { label: 'Expired', value: stats?.breakdown?.expired || 0, color: '#8D6E63' },
  ]), [stats]);

  const buildLeaderboardHtml = (title, rows, valueKey, secondaryKey) => {
    if (!rows?.length) {
      return `<h3>${escapeHtml(title)}</h3><p>No data available.</p>`;
    }

    const body = rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.city)}</td>
        <td>${escapeHtml(row[valueKey])}</td>
        <td>${escapeHtml(row[secondaryKey])}</td>
      </tr>
    `).join('');

    return `
      <h3>${escapeHtml(title)}</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>City</th>
            <th>${escapeHtml(valueKey)}</th>
            <th>${escapeHtml(secondaryKey)}</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    `;
  };

  const handleDownload = async () => {
    if (!stats) return;

    setExporting(true);
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #223042; }
              h1 { color: #F25F4C; }
              h2 { margin-top: 24px; }
              h3 { margin-top: 18px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid #d9e0ea; padding: 8px; text-align: left; font-size: 12px; }
              th { background: #f4f7fb; }
              .metric { margin-bottom: 8px; }
            </style>
          </head>
          <body>
            <h1>NeedFeed Analytics Report</h1>
            <p>Generated on ${escapeHtml(new Date().toLocaleString())}</p>

            <h2>Overview</h2>
            <p class="metric">Total Users: ${escapeHtml(stats.totalUsers)}</p>
            <p class="metric">Total Food Posts: ${escapeHtml(stats.totalFood)}</p>
            <p class="metric">Active Donations: ${escapeHtml(stats.activeDonations)}</p>
            <p class="metric">Completion Rate: ${escapeHtml(stats.completionRate)}%</p>
            <p class="metric">Expiry Rate: ${escapeHtml(stats.expiryRate)}%</p>

            <h2>Status Breakdown</h2>
            ${breakdownEntries.map((entry) => `<p class="metric">${escapeHtml(entry.label)}: ${escapeHtml(entry.value)}</p>`).join('')}

            <h2>Food Composition</h2>
            <p class="metric">Veg: ${escapeHtml(stats?.types?.veg || 0)}</p>
            <p class="metric">Non-Veg: ${escapeHtml(stats?.types?.nonVeg || 0)}</p>
            <p class="metric">Vegan: ${escapeHtml(stats?.types?.vegan || 0)}</p>
            <p class="metric">Cooked: ${escapeHtml(stats?.categories?.cooked || 0)}</p>
            <p class="metric">Raw: ${escapeHtml(stats?.categories?.raw || 0)}</p>
            <p class="metric">Bakery: ${escapeHtml(stats?.categories?.bakery || 0)}</p>
            <p class="metric">Packed: ${escapeHtml(stats?.categories?.packed || 0)}</p>

            ${buildLeaderboardHtml('Top Active Donors', stats.topDonors, 'totalPosts', 'deliveredPosts')}
            ${buildLeaderboardHtml('Top Active Volunteers', stats.topVolunteers, 'totalAssignments', 'deliveredAssignments')}
          </body>
        </html>
      `;

      const pdf = await Print.printToFileAsync({ html });
      const outputUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}needfeed-analytics-${Date.now()}.pdf`;
      await FileSystem.copyAsync({ from: pdf.uri, to: outputUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(outputUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'NeedFeed analytics report',
          UTI: 'com.adobe.pdf',
        });
      }

      Alert.alert('Export ready', 'PDF report generated successfully.');
    } catch (error) {
      console.log('PDF export error', error);
      Alert.alert('Export failed', 'Could not generate the PDF report.');
    } finally {
      setExporting(false);
    }
  };

  const StatBox = ({ title, value, color, icon }) => (
    <View style={styles.statBox}>
      <View style={[styles.iconCircle, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.boxValue}>{value}</Text>
        <Text style={styles.boxTitle}>{title}</Text>
      </View>
    </View>
  );

  const ProgressRow = ({ label, value, max, color }) => {
    const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 6 : 0) : 0;
    return (
      <View style={styles.progressRow}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressValue}>{value}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${width}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  const LeaderboardCard = ({ title, icon, rows, primaryKey, secondaryKey, accent }) => (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>Highest activity across the network</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: `${accent}18` }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
      </View>

      {!rows?.length ? (
        <Text style={styles.emptyText}>No data yet.</Text>
      ) : (
        rows.map((row, index) => (
          <View key={`${row.userId || row.name}-${index}`} style={styles.leaderRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.leaderCopy}>
              <Text style={styles.leaderName}>{row.name}</Text>
              <Text style={styles.leaderMeta}>{row.city || row.preferredArea || 'No location'}</Text>
            </View>
            <View style={styles.leaderStats}>
              <Text style={styles.leaderStatPrimary}>{row[primaryKey]}</Text>
              <Text style={styles.leaderStatSecondary}>{secondaryKey}: {row[secondaryKey]}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>System Analytics</Text>
          <Text style={styles.date}>{new Date().toDateString()}</Text>
        </View>
        <TouchableOpacity style={styles.exportButtonTop} onPress={handleDownload} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="download-outline" size={18} color="#FFF" />
              <Text style={styles.exportButtonTopText}>Export PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchStats();
            }}
          />
        }
      >
        <View style={styles.impactCard}>
          <View>
            <Text style={styles.impactTitle}>Meals Delivered</Text>
            <Text style={styles.impactNum}>{stats?.breakdown?.delivered || 0}</Text>
            <Text style={styles.impactSub}>Completion rate {stats?.completionRate || 0}%</Text>
          </View>
          <Ionicons name="trophy" size={48} color="#FFF" />
        </View>

        <Text style={styles.sectionTitle}>Operational Snapshot</Text>
        <View style={styles.gridRow}>
          <StatBox title="Total Users" value={stats?.totalUsers || 0} icon="people" color={COLORS.info} />
          <StatBox title="Total Posts" value={stats?.totalFood || 0} icon="fast-food" color={COLORS.primary} />
        </View>
        <View style={styles.gridRow}>
          <StatBox title="Active" value={stats?.activeDonations || 0} icon="radio-button-on" color={COLORS.success} />
          <StatBox title="Expiry Rate" value={`${stats?.expiryRate || 0}%`} icon="alert-circle" color={COLORS.danger} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Lifecycle</Text>
          {breakdownEntries.map((entry) => (
            <ProgressRow
              key={entry.label}
              label={entry.label}
              value={entry.value}
              max={stats?.totalFood || 1}
              color={entry.color}
            />
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Food Type Mix</Text>
          <ProgressRow label="Veg" value={stats?.types?.veg || 0} max={stats?.totalFood || 1} color={COLORS.success} />
          <ProgressRow label="Non-Veg" value={stats?.types?.nonVeg || 0} max={stats?.totalFood || 1} color={COLORS.danger} />
          <ProgressRow label="Vegan" value={stats?.types?.vegan || 0} max={stats?.totalFood || 1} color={COLORS.info} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Food Category Mix</Text>
          <ProgressRow label="Cooked" value={stats?.categories?.cooked || 0} max={stats?.totalFood || 1} color={COLORS.primary} />
          <ProgressRow label="Raw" value={stats?.categories?.raw || 0} max={stats?.totalFood || 1} color={COLORS.warning} />
          <ProgressRow label="Bakery" value={stats?.categories?.bakery || 0} max={stats?.totalFood || 1} color={COLORS.purple} />
          <ProgressRow label="Packed" value={stats?.categories?.packed || 0} max={stats?.totalFood || 1} color={COLORS.info} />
        </View>

        <LeaderboardCard
          title="Top Active Donors"
          icon="medal-outline"
          rows={stats?.topDonors}
          primaryKey="totalPosts"
          secondaryKey="deliveredPosts"
          accent={COLORS.primary}
        />

        <LeaderboardCard
          title="Top Active Volunteers"
          icon="bicycle-outline"
          rows={stats?.topVolunteers}
          primaryKey="totalAssignments"
          secondaryKey="deliveredAssignments"
          accent={COLORS.success}
        />

        <View style={styles.footerSpace} />
      </ScrollView>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
  },
  date: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.muted,
  },
  exportButtonTop: {
    backgroundColor: COLORS.text,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 116,
    justifyContent: 'center',
  },
  exportButtonTopText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  scroll: {
    padding: 20,
  },
  impactCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  impactTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
  },
  impactNum: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 6,
  },
  impactSub: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 14,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statBox: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  boxTitle: {
    fontSize: 12,
    color: COLORS.muted,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.text,
  },
  cardSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.muted,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: '#566374',
    fontWeight: '700',
  },
  progressValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: '#EEF2F6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F4F7',
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF0EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 12,
  },
  leaderCopy: {
    flex: 1,
  },
  leaderName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  leaderMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  leaderStats: {
    alignItems: 'flex-end',
  },
  leaderStatPrimary: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
  },
  leaderStatSecondary: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  footerSpace: {
    height: 24,
  },
});

export default Analytics;

