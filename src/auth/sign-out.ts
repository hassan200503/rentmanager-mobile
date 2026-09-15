import * as SecureStore from 'expo-secure-store';

import type { ApiClient } from '../api/client';
import { unregisterPush } from '../notifications/push';

/**
 * Sign-out order matters:
 * 1. Unregister this device's push token while the session can still
 *    authenticate the call — otherwise the next person to use the phone
 *    could receive this person's notifications until the backend notices.
 * 2. Drop app-local state tied to the person (an in-flight payment marker).
 * 3. Sign out of Clerk, which clears its token from SecureStore. The query
 *    cache is cleared by SessionProvider when the scope changes.
 */
export async function signOutEverywhere(api: ApiClient, clerkSignOut: () => Promise<unknown>): Promise<void> {
  await unregisterPush(api);
  await SecureStore.deleteItemAsync('rm.pendingRentPayment').catch(() => undefined);
  await clerkSignOut();
}
