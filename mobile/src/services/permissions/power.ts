import { NativeModules, Platform } from 'react-native';

/**
 * Thin JS wrapper over the native PowerModule (Android only). On iOS or if the
 * native module is missing, every call degrades gracefully so the app keeps
 * working — battery management is an Android-only concern.
 */
interface PowerNative {
  isIgnoringBatteryOptimizations(): Promise<boolean>;
  requestIgnoreBatteryOptimizations(): Promise<boolean>;
  openBatteryOptimizationSettings(): Promise<boolean>;
  openAutoStartSettings(): Promise<boolean>;
}

const PowerManagerModule: PowerNative | undefined = NativeModules.PowerManagerModule;
const isAndroid = Platform.OS === 'android';

/** True if the app is exempt from battery optimization (or N/A on iOS). */
export async function isBatteryUnrestricted(): Promise<boolean> {
  if (!isAndroid || !PowerManagerModule) return true;
  try {
    return await PowerManagerModule.isIgnoringBatteryOptimizations();
  } catch {
    return true; // don't block the user on a detection failure
  }
}

/** Fires the one-tap system dialog to exempt the app, then reports the result. */
export async function requestBatteryUnrestricted(): Promise<boolean> {
  if (!isAndroid || !PowerManagerModule) return true;
  try {
    await PowerManagerModule.requestIgnoreBatteryOptimizations();
  } catch {
    // ignore — fall through to a re-check
  }
  return isBatteryUnrestricted();
}

/** Opens the OEM Auto-start / protected-apps screen (best effort). */
export async function openAutoStartSettings(): Promise<boolean> {
  if (!isAndroid || !PowerManagerModule) return false;
  try {
    return await PowerManagerModule.openAutoStartSettings();
  } catch {
    return false;
  }
}
