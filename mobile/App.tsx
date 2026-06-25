import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar, AppState, PermissionsAndroid, Platform } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { store, useAppDispatch, useAppSelector } from './src/store';
import { bootstrapAuth, forceLogout } from './src/store/authSlice';
import {
  refreshPermissions,
  startTracking,
  stopTracking,
  setPending,
  setTracking,
} from './src/store/trackingSlice';
import { setForcedLogoutHandler } from './src/api/client';
import { BackgroundTracker } from './src/services/location/BackgroundTracker';
import { loadConfig } from './src/services/config';
import LoginScreen from './src/screens/LoginScreen';
import PermissionsScreen from './src/screens/PermissionsScreen';
import RootNavigator from './src/navigation/RootNavigator';
import { theme } from './src/theme/theme';

function Gate() {
  const dispatch = useAppDispatch();
  const { user, bootstrapped } = useAppSelector((s) => s.auth);
  const { permissions, isTracking } = useAppSelector((s) => s.tracking);

  const hasPerms = permissions.fineLocation && permissions.backgroundLocation;

  // Runtime Permission Request for Android (Foreground -> Background Chain)
  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // 1. Ask for Foreground First
        const foregroundGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'We need access to your location to update your status on the fleet console.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (foregroundGranted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Foreground location permission granted.');
          
          // 2. Ask for Background Second (Android 11+ Requirement)
          const backgroundGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: 'Background Tracking Required',
              message: 'To track your fleet while the phone is locked, please select "Allow all the time" in the following settings menu.',
              buttonPositive: 'Open Settings',
            }
          );

          if (backgroundGranted === PermissionsAndroid.RESULTS.GRANTED) {
             console.log('Total location permissions granted.');
          } else {
             console.log('Background location permission denied.');
          }

        } else {
          console.log('Foreground location permission denied.');
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // One-time bootstrap.
  useEffect(() => {
    setForcedLogoutHandler(() => {
      void BackgroundTracker.stop();
      dispatch(forceLogout());
    });
    
    void dispatch(bootstrapAuth());

    // Trigger the location popup sequence, then refresh Redux state
    requestLocationPermission().then(() => {
      void dispatch(refreshPermissions());
    });

    // Reflect whatever the foreground service is actually doing.
    dispatch(setTracking(BackgroundTracker.isRunning()));
  }, [dispatch]);

  // Re-check permissions when the app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void dispatch(refreshPermissions());
    });
    return () => sub.remove();
  }, [dispatch]);

  // Start tracking when signed in + permitted; stop when signed out.
  useEffect(() => {
    if (user && hasPerms && !isTracking) {
      void loadConfig(true).finally(() => dispatch(startTracking()));
    }
    if (!user && isTracking) {
      void dispatch(stopTracking());
    }
  }, [user, hasPerms, isTracking, dispatch]);

  // Flush the offline queue as soon as connectivity returns
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) void BackgroundTracker.syncNow();
    });
    const t = setInterval(() => dispatch(setPending(BackgroundTracker.pendingCount())), 5000);
    return () => {
      unsub();
      clearInterval(t);
    };
  }, [dispatch]);

  if (!bootstrapped) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }
  if (!user) return <LoginScreen />;
  if (!hasPerms) return <PermissionsScreen />;
  return <RootNavigator />;
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg} />
        <Gate />
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg },
});