import { useAuth } from '@clerk/expo';
import React, { useState } from 'react';
import { View } from 'react-native';

import { useOptionalSession } from '../auth/session';
import { signOutEverywhere } from '../auth/sign-out';
import { Button, Text } from '../ui/primitives';
import { useTheme } from '../ui/theme';

/**
 * Shown when the backend answered 401 even after a token refresh — the Clerk
 * session was revoked, expired while the app was in the background, or the
 * account was changed. The user is told plainly and offered a clean sign-in
 * instead of a screen full of silent failures.
 */
export function SessionRejectedBanner() {
  const session = useOptionalSession();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const t = useTheme();

  if (!session?.sessionRejected) return null;

  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: t.color.dangerBg, padding: t.space(3), gap: t.space(2) }}
    >
      <Text tone="danger" variant="bodyStrong">
        Your session has ended. Sign in again to continue.
      </Text>
      <View style={{ flexDirection: 'row', gap: t.space(2) }}>
        <Button
          label="Sign in again"
          kind="danger"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            await signOutEverywhere(session.api, signOut);
          }}
        />
        <Button label="Dismiss" kind="ghost" onPress={session.acknowledgeRejection} />
      </View>
    </View>
  );
}
