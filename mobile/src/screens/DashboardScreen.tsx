import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchStats } from '../store/trackingSlice';
import { logout } from '../store/authSlice';
import { theme } from '../theme/theme';
import type { SelfStats } from '../types';
import { BackgroundTracker } from '../services/location/BackgroundTracker'; // <--- ADDED IMPORT

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}
function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardScreen() {
  const dispatch = useAppDispatch();
  const { stats, isTracking, pending, statsStatus } = useAppSelector((s) => s.tracking);
  const user = useAppSelector((s) => s.auth.user);

  const load = useCallback(() => {
    void dispatch(fetchStats());
  }, [dispatch]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const inside = stats?.currentStatus === 'INSIDE_OFFICE';

  // NEW: Stops tracking explicitly before logging out
  const handleSignOut = async () => {
    await BackgroundTracker.stop();
    dispatch(logout());
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={statsStatus === 'loading'}
          onRefresh={load}
          tintColor={theme.colors.accent}
        />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hi, {user?.name ?? 'there'}</Text>
          <Text style={styles.sub}>Field tracking</Text>
        </View>
      </View>

      {/* Tracking + location status */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: isTracking ? theme.colors.accent : theme.colors.danger }]} />
          <Text style={styles.statusText}>
            {isTracking ? 'Tracking active' : 'Tracking off'}
          </Text>
        </View>
        <View style={[styles.pill, inside ? styles.pillOffice : styles.pillField]}>
          <Text style={[styles.pillText, { color: inside ? theme.colors.positive : theme.colors.accent }]}>
            {inside ? 'Inside office' : 'Outside office'}
          </Text>
        </View>
      </View>

      {pending > 0 && (
        <Text style={styles.pending}>{pending} location(s) waiting to sync…</Text>
      )}

      {/* Today */}
      <Text style={styles.sectionLabel}>TODAY</Text>
      <View style={styles.grid}>
        <Stat value={`${(stats?.today.distanceTravelledKm ?? 0).toFixed(1)} km`} label="Distance" big />
        <Stat value={fmtDuration(stats?.today.travelMinutes ?? 0)} label="Travel time" big />
      </View>
      <View style={styles.grid}>
        <Stat value={fmtTime(stats?.today.leftOfficeAt ?? null)} label="Left office" />
        <Stat value={fmtTime(stats?.today.returnedOfficeAt ?? null)} label="Returned" />
      </View>

      {/* Week + Month */}
      <Text style={styles.sectionLabel}>THIS WEEK</Text>
      <View style={styles.grid}>
        <Stat value={`${(stats?.week.distanceTravelledKm ?? 0).toFixed(1)} km`} label="Distance" />
        <Stat value={fmtDuration(stats?.week.travelMinutes ?? 0)} label="Travel time" />
      </View>

      <Text style={styles.sectionLabel}>THIS MONTH</Text>
      <View style={styles.grid}>
        <Stat value={`${(stats?.month.distanceTravelledKm ?? 0).toFixed(1)} km`} label="Distance" />
        <Stat value={fmtDuration(stats?.month.travelMinutes ?? 0)} label="Travel time" />
      </View>

      {/* Updated TouchableOpacity to use handleSignOut */}
      <TouchableOpacity style={styles.logout} onPress={handleSignOut}>
        <Text style={styles.logoutText}>Sign out & stop tracking</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ value, label, big }: { value: string; label: string; big?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, big && styles.statValueBig]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const C = theme.colors;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 20 },
  hello: { color: C.text, fontSize: 24, fontWeight: '700' },
  sub: { color: C.muted, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  statusCard: {
    backgroundColor: C.surface, borderRadius: theme.radius, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: C.border,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  statusText: { color: C.text, fontSize: 16, fontWeight: '600' },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  pillOffice: { borderColor: C.positive, backgroundColor: 'rgba(54,194,166,0.08)' },
  pillField: { borderColor: C.accent, backgroundColor: 'rgba(244,163,64,0.08)' },
  pillText: { fontSize: 12, fontWeight: '600' },
  pending: { color: C.muted, fontSize: 12, marginTop: 10 },
  sectionLabel: { color: C.muted, fontSize: 11, letterSpacing: 2, marginTop: 24, marginBottom: 10 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stat: {
    flex: 1, backgroundColor: C.surface, borderRadius: theme.radius, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  statValue: { color: C.text, fontSize: 18, fontWeight: '700' },
  statValueBig: { fontSize: 26 },
  statLabel: { color: C.muted, fontSize: 12, marginTop: 4 },
  logout: {
    marginTop: 32, borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingVertical: 15, alignItems: 'center',
  },
  logoutText: { color: C.danger, fontWeight: '600' },
});