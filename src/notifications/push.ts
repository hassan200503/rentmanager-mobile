import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { ApiClient } from '../api/client';
import { env } from '../config/env';

/**
 * Device registration lifecycle:
 *   sign-in   → ask permission (only after the user has context, never at launch)
 *             → get Expo push token → POST /devices/push (owner = token subject)
 *   sign-out  → POST /devices/push/unregister BEFORE clearing the session,
 *               while there is still a valid token to authenticate with
 *   new owner → the backend moves the device to whoever registers it last,
 *               and drops queued pushes for the previous owner
 *
 * The push token is stored only to know what to unregister; it is not a
 * secret, but it is kept in SecureStore rather than plain storage anyway.
 */

const TOKEN_KEY = 'rm.pushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Rent and maintenance updates',
    importance: Notifications.AndroidImportance.HIGH,
    // Lock-screen content is generic by design; still, keep it private.
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
}

export type PushRegistration =
  | { status: 'registered' }
  | { status: 'denied' }
  | { status: 'unsupported'; reason: string }
  | { status: 'error'; reason: string };

export async function currentPermission(): Promise<Notifications.PermissionStatus> {
  const settings = await Notifications.getPermissionsAsync();
  return settings.status;
}

/**
 * Registers this device for the signed-in person. `askIfNeeded` is false on
 * silent re-registration at startup, so the OS prompt only ever appears in
 * response to the user choosing to turn notifications on.
 */
export async function registerForPush(api: ApiClient, askIfNeeded: boolean): Promise<PushRegistration> {
  if (!Device.isDevice) {
    return { status: 'unsupported', reason: 'Push notifications need a physical device.' };
  }
  if (!env.easProjectId) {
    return { status: 'unsupported', reason: 'Push is not configured for this build (EAS_PROJECT_ID).' };
  }
  try {
    await ensureAndroidChannel();
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && askIfNeeded) {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') {
      return { status: 'denied' };
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: env.easProjectId });
    await api.post('/devices/push', {
      token,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
      appVersion: env.appVersion,
    });
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return { status: 'registered' };
  } catch (err) {
    return { status: 'error', reason: err instanceof Error ? err.message : 'unknown' };
  }
}

/** Best effort, bounded: sign-out must never hang on a dead network. */
export async function unregisterPush(api: ApiClient): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
  if (!token) return;
  try {
    await api.post('/devices/push/unregister', { token }, { timeoutMs: 5_000 });
  } catch {
    // If this fails the backend still protects the next person: registering
    // the device under a new account moves ownership, and queued deliveries
    // are re-checked against the owner at send time.
  } finally {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
  }
}
