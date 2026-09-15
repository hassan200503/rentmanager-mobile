import { useHostedAuth } from '@clerk/expo/hosted-auth';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { View } from 'react-native';

import { track } from '../src/observability/analytics';
import { Button, Notice, Screen, Text } from '../src/ui/primitives';
import { useTheme } from '../src/ui/theme';

WebBrowser.maybeCompleteAuthSession();

/**
 * Sign-in and sign-up both go through Clerk's hosted Account Portal in the
 * system browser. The app never sees a password or one-time code, every
 * method configured for the web (email, phone, Google, MFA) works here
 * without a second implementation, and the session lands in SecureStore via
 * Clerk's token cache. See docs/mobile/authentication.md.
 */
export default function SignIn() {
  const { startHostedAuth } = useHostedAuth();
  const [busy, setBusy] = useState<'sign-in' | 'sign-up' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const t = useTheme();

  async function start(mode: 'sign-in' | 'sign-up') {
    setBusy(mode);
    setProblem(null);
    track('sign_in_started');
    try {
      const result = await startHostedAuth({ mode, authSessionOptions: { preferEphemeralSession: false } });
      if (result.createdSessionId) {
        track('sign_in_completed');
        // The root navigator switches to the signed-in routes on its own.
      } else if (result.authSessionResult?.type !== 'cancel' && result.authSessionResult?.type !== 'dismiss') {
        setProblem("We couldn't finish signing you in. Please try again.");
      }
    } catch {
      setProblem("We couldn't reach the sign-in service. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'space-between', paddingVertical: t.space(10) }}>
      <View style={{ gap: t.space(3), marginTop: t.space(10) }}>
        <Text variant="title" accessibilityRole="header">
          RentManager
        </Text>
        <Text variant="heading" muted>
          Rent, leases and repairs — for landlords and the people who rent from them.
        </Text>
      </View>

      <View style={{ gap: t.space(3) }}>
        {problem ? <Notice tone="danger">{problem}</Notice> : null}
        <Button label="Sign in" onPress={() => start('sign-in')} loading={busy === 'sign-in'} disabled={!!busy} />
        <Button
          label="Create an account"
          kind="secondary"
          onPress={() => start('sign-up')}
          loading={busy === 'sign-up'}
          disabled={!!busy}
        />
        <Text muted variant="caption" style={{ textAlign: 'center' }}>
          Renting through RentManager? Use the phone number or email your landlord registered.
        </Text>
      </View>
    </Screen>
  );
}
