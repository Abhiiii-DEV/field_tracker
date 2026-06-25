import { Platform } from 'react-native';
import {
  check,
  request,
  requestNotifications,
  PERMISSIONS,
  RESULTS,
  Permission,
} from 'react-native-permissions';

export interface PermissionState {
  fineLocation: boolean;
  backgroundLocation: boolean;
  notifications: boolean;
}

const fineLocationPerm: Permission =
  Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

const backgroundLocationPerm: Permission =
  Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_ALWAYS
    : PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION;

const granted = (r: string) => r === RESULTS.GRANTED || r === RESULTS.LIMITED;

export async function checkPermissions(): Promise<PermissionState> {
  const [fine, background] = await Promise.all([
    check(fineLocationPerm),
    check(backgroundLocationPerm),
  ]);
  // Notifications: best-effort check via request with no prompt isn't available,
  // so we treat a prior grant as the source of truth in the slice.
  return {
    fineLocation: granted(fine),
    backgroundLocation: granted(background),
    notifications: true,
  };
}

/**
 * Requests permissions in the correct order. On Android 10+ background location
 * MUST be requested AFTER fine location is already granted, and ideally on a
 * separate user gesture — the UI flow reflects this.
 */
export async function requestAllPermissions(): Promise<PermissionState> {
  const fine = await request(fineLocationPerm);
  let background = RESULTS.DENIED as string;
  if (granted(fine)) {
    background = await request(backgroundLocationPerm);
  }
  const notif = await requestNotifications(['alert', 'sound', 'badge']);

  return {
    fineLocation: granted(fine),
    backgroundLocation: granted(background),
    notifications: notif.status === RESULTS.GRANTED,
  };
}
