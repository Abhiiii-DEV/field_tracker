import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { requestPermissions, refreshPermissions } from '../store/trackingSlice';
import { openAutoStartSettings } from '../services/permissions/power';
import { theme } from '../theme/theme';

export default function PermissionsScreen() {
  const dispatch = useAppDispatch();
  const perms = useAppSelector((s) => s.tracking.permissions);

  const rows = [
    { label: 'Location while using the app', ok: perms.fineLocation },
    { label: 'Background location (always)', ok: perms.backgroundLocation },
    { label: 'Notifications', ok: perms.notifications },
    { label: 'Allow background running (battery)', ok: perms.batteryUnrestricted },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>One quick setup step</Text>
      <Text style={styles.body}>
        To share your route with your team while you work, the app needs location
        access — including in the background — and permission to show the tracking
        notification. Tracking only runs while you're signed in and stops the
        moment you sign out.
      </Text>

      <View style={styles.list}>
        {rows.map((r) => (
          <View key={r.label} style={styles.row}>
            <View style={[styles.check, r.ok && styles.checkOn]}>
              <Text style={styles.checkMark}>{r.ok ? '✓' : ''}</Text>
            </View>
            <Text style={styles.rowLabel}>{r.label}</Text>
          </View>
        ))}
      </View>

      {!perms.batteryUnrestricted && (
        <Text style={styles.note}>
          Tip: if your phone is Xiaomi, Oppo, Vivo, Realme or Samsung, also enable
          “Auto-start” so tracking keeps running after you close the app.
        </Text>
      )}

      <TouchableOpacity style={styles.button} onPress={() => void dispatch(requestPermissions())}>
        <Text style={styles.buttonText}>Grant permissions</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={async () => {
          await openAutoStartSettings();
          void dispatch(refreshPermissions());
        }}
      >
        <Text style={styles.settingsLink}>Open auto-start settings</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => void Linking.openSettings()}>
        <Text style={styles.settingsLink}>Open app settings instead</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 28, justifyContent: 'center' },
  title: { color: theme.colors.text, fontSize: 26, fontWeight: '700', marginBottom: 12 },
  body: { color: theme.colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 28 },
  list: { marginBottom: 28 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  check: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    borderColor: theme.colors.border, marginRight: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: theme.colors.positive, borderColor: theme.colors.positive },
  checkMark: { color: '#06231d', fontWeight: '800' },
  rowLabel: { color: theme.colors.text, fontSize: 15 },
  button: {
    backgroundColor: theme.colors.accent, borderRadius: 10,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonText: { color: '#1b1205', fontWeight: '700', fontSize: 16 },
  settingsLink: { color: theme.colors.muted, textAlign: 'center', marginTop: 18 },
  note: {
    color: theme.colors.muted, fontSize: 13, lineHeight: 19,
    marginBottom: 20, fontStyle: 'italic',
  },
});
