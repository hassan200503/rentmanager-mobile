import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { ApiError } from '../api/errors';

/**
 * Server state lives here and only here — never copied into a global store.
 *
 * Retry policy:
 * - Queries (reads): retried up to twice on transient failures only
 *   (offline, timeout, network, 5xx, 429). 401/403/404/409/400 are answers,
 *   not glitches, and are never retried.
 * - Mutations: never retried. A timed-out payment initiation has an unknown
 *   outcome; replaying it is how a renter gets two STK prompts. The backend
 *   also de-duplicates (ADR-0016), but the client does not rely on that.
 *
 * Persistence: none to disk, deliberately. See docs/mobile/offline-strategy.md.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnReconnect: true,
        networkMode: 'online',
        retry: (failureCount, error) =>
          failureCount < 2 && error instanceof ApiError && error.isTransient && error.kind !== 'offline',
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        retry: false,
        networkMode: 'online',
      },
    },
  });
}

let wired = false;

/** Connects React Query to device connectivity and app foreground state. */
export function wireReactNativeManagers(): void {
  if (wired) return;
  wired = true;

  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      // isInternetReachable is null while unknown; treat unknown as online so
      // the app never refuses to try on a working network.
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    }),
  );

  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (Platform.OS !== 'web') handleFocus(status === 'active');
    });
    return () => sub.remove();
  });
}
