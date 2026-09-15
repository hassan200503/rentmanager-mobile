import { Redirect } from 'expo-router';
import React from 'react';

import { userMessage } from '../src/api/errors';
import { resolveExperiences, useAccess } from '../src/features/access/use-access';
import { usePreferredExperience } from '../src/features/access/preferred-experience';
import { ErrorState, LoadingState, Screen } from '../src/ui/primitives';

/**
 * Entry gate. Asks the backend what this session is authorised for and sends
 * the person to the matching experience. Nothing is rendered from a guess.
 */
export default function Index() {
  const access = useAccess();
  const [preferred, , preferenceLoaded] = usePreferredExperience();

  if (access.isPending || !preferenceLoaded) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Opening your account" />
      </Screen>
    );
  }

  if (access.isError) {
    return (
      <Screen scroll={false}>
        <ErrorState message={userMessage(access.error)} onRetry={() => void access.refetch()} />
      </Screen>
    );
  }

  const experiences = resolveExperiences(access.data);
  const chosen = preferred && experiences.includes(preferred) ? preferred : experiences[0];

  switch (chosen) {
    case 'landlord':
      return <Redirect href="/(landlord)" />;
    case 'renter':
      return <Redirect href="/(renter)" />;
    case 'onboarding':
      return <Redirect href="/onboarding" />;
    default:
      return <Redirect href="/no-access" />;
  }
}
