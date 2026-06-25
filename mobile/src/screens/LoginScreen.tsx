import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { login } from '../store/authSlice';
import { theme } from '../theme/theme';

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    if (!email || !password) return;
    void dispatch(login({ email: email.trim().toLowerCase(), password }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brandRow}>
        <View style={styles.dot} />
        <Text style={styles.brand}>Field Tracking</Text>
      </View>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to start your day.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.colors.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, status === 'loading' && styles.buttonDisabled]}
        onPress={submit}
        disabled={status === 'loading'}
      >
        <Text style={styles.buttonText}>
          {status === 'loading' ? 'Signing in…' : 'Sign in'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 28, justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accent, marginRight: 8 },
  brand: { color: theme.colors.muted, letterSpacing: 2, fontSize: 12, textTransform: 'uppercase' },
  title: { color: theme.colors.text, fontSize: 30, fontWeight: '700' },
  subtitle: { color: theme.colors.muted, fontSize: 15, marginBottom: 28, marginTop: 6 },
  input: {
    backgroundColor: theme.colors.surface2,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 10,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    fontSize: 16,
  },
  error: { color: theme.colors.danger, marginBottom: 12 },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#1b1205', fontWeight: '700', fontSize: 16 },
});
