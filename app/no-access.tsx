import { useAuth } from '@clerk/expo';
import React from 'react';

import { useSession } from '../src/auth/session';
import { signOutEverywhere } from '../src/auth/sign-out';
import { env } from '../src/config/env';
import { Button, Screen, Text } from '../src/ui/primitives';

/**
 * A platform administrator with no landlord or renter account. Platform
 * administration is a large-screen, high-risk workflow and stays on the web.
 */
export default function NoAccess() {
  const { api } = useSession();
  const { signOut } = useAuth();
  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <Text variant="title" accessibilityRole="header">
        Use the web for administration
      </Text>
      <Text muted>
        This account manages the RentManager platform. Platform administration is available on the web
        {env.webAppUrl ? ` at ${env.webAppUrl}` : ''}.
      </Text>
      <Button label="Sign out" kind="secondary" onPress={() => void signOutEverywhere(api, signOut)} />
    </Screen>
  );
}
