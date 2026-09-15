import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider } from '../src/auth/session';
import { OfflineBanner } from '../src/components/offline-banner';
import { SessionRejectedBanner } from '../src/components/session-rejected-banner';
import { VersionGate } from '../src/components/version-gate';
import { env } from '../src/config/env';
import { NotificationRouter } from '../src/notifications/notification-router';
import { initMonitoring, setMonitoringUser, wrapRoot } from '../src/observability/monitoring';
import { createQueryClient, wireReactNativeManagers } from '../src/query/query-client';
import { useTheme } from '../src/ui/theme';

export { ErrorBoundary } from '../src/components/error-boundary';

initMonitoring();
wireReactNativeManagers();
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <VersionGate>
            <SessionProvider>
              <AppNavigator />
            </SessionProvider>
          </VersionGate>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

/**
 * Signed out, only `sign-in` is a reachable route; signed in, it is not.
 * Protected routes are enforced by the router itself, including for deep
 * links opened before authentication.
 */
function AppNavigator() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const t = useTheme();

  useEffect(() => {
    if (isLoaded) void SplashScreen.hideAsync().catch(() => undefined);
  }, [isLoaded]);

  useEffect(() => {
    setMonitoringUser(isSignedIn ? (userId ?? null) : null);
  }, [isSignedIn, userId]);

  if (!isLoaded) return null;

  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <OfflineBanner />
      {isSignedIn ? (
        <>
          <SessionRejectedBanner />
          <NotificationRouter />
        </>
      ) : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.color.background } }}>
        <Stack.Protected guard={!!isSignedIn}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(renter)" />
          <Stack.Screen name="(landlord)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="no-access" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="delete-account" />
          <Stack.Screen name="properties" />
          <Stack.Screen name="log-repair" />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default wrapRoot(RootLayout);
