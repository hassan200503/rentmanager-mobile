import { useAuth, useOrganizationList, useUser } from '@clerk/expo';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';

import { useSession } from '../auth/session';
import { signOutEverywhere } from '../auth/sign-out';
import { env } from '../config/env';
import { usePreferredExperience } from '../features/access/preferred-experience';
import { resolveExperiences, useAccess, type Experience } from '../features/access/use-access';
import { currentPermission, registerForPush } from '../notifications/push';
import { track } from '../observability/analytics';
import { Button, Card, KeyValue, Notice, Screen, SectionTitle, Text } from '../ui/primitives';

/**
 * Shared "More" tab: account, organisation switching, the other experience
 * for dual-role people, notifications, and sign-out.
 */
export function MoreScreen({ current }: { current: Experience }) {
  const { api } = useSession();
  const { signOut, orgId } = useAuth();
  const { user } = useUser();
  const access = useAccess();
  const [, setPreferred] = usePreferredExperience();
  const [pushNote, setPushNote] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const { userMemberships, setActive, isLoaded } = useOrganizationList({ userMemberships: true });

  const experiences = access.data ? resolveExperiences(access.data) : [];
  const other = experiences.find((e) => e !== current && (e === 'landlord' || e === 'renter'));
  const orgs = userMemberships?.data ?? [];

  async function switchExperience(to: Experience) {
    await setPreferred(to);
    router.replace(to === 'landlord' ? '/(landlord)' : '/(renter)');
  }

  function switchOrg(id: string, name: string) {
    Alert.alert(`Switch to ${name}?`, 'You will see that organisation’s properties, rent and repairs.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: async () => {
          if (!setActive) return;
          // setActive changes orgId → SessionProvider clears every cached
          // query before anything renders under the new organisation.
          await setActive({ organization: id });
          track('organization_switched');
          router.replace('/');
        },
      },
    ]);
  }

  async function enablePush() {
    const result = await registerForPush(api, true);
    setPushNote(
      result.status === 'registered'
        ? 'Notifications are on for this phone.'
        : result.status === 'denied'
          ? 'Notifications are turned off in your phone settings.'
          : result.status === 'unsupported'
            ? result.reason
            : "Couldn't turn on notifications. Try again later.",
    );
    if (result.status === 'denied') {
      const status = await currentPermission();
      if (status === 'denied') void Linking.openSettings();
    }
  }

  return (
    <Screen>
      <Text variant="title" accessibilityRole="header">
        More
      </Text>

      <Card>
        <KeyValue label="Signed in as" value={user?.primaryEmailAddress?.emailAddress ?? user?.primaryPhoneNumber?.phoneNumber ?? '—'} />
        {access.data?.landlordRole ? <KeyValue label="Role" value={access.data.landlordRole.toLowerCase()} /> : null}
      </Card>

      {other ? (
        <Button
          label={other === 'renter' ? 'Switch to my rental' : 'Switch to my properties'}
          kind="secondary"
          onPress={() => void switchExperience(other)}
        />
      ) : null}

      {current === 'landlord' && isLoaded && orgs.length > 1 ? (
        <>
          <SectionTitle>Organisations</SectionTitle>
          <Card>
            {orgs.map((m) => (
              <Button
                key={m.organization.id}
                label={m.organization.id === orgId ? `${m.organization.name} (current)` : m.organization.name}
                kind={m.organization.id === orgId ? 'primary' : 'ghost'}
                disabled={m.organization.id === orgId}
                onPress={() => switchOrg(m.organization.id, m.organization.name)}
              />
            ))}
          </Card>
        </>
      ) : null}

      <SectionTitle>Notifications</SectionTitle>
      <Card>
        <Text muted>
          {current === 'renter'
            ? 'Get told when a payment is recorded or a repair is updated.'
            : 'Get told when a renter reports a repair.'}
        </Text>
        <Button label="Turn on notifications" kind="secondary" onPress={() => void enablePush()} />
        {pushNote ? <Notice tone="info">{pushNote}</Notice> : null}
        <Button label="Choose what you're notified about" kind="ghost" onPress={() => router.push('/notifications')} />
      </Card>

      {current === 'landlord' ? (
        <>
          <SectionTitle>Portfolio</SectionTitle>
          <Card>
            <Button label="Properties and units" kind="secondary" onPress={() => router.push('/properties')} />
            <Button label="Log a repair for a renter" kind="secondary" onPress={() => router.push('/log-repair')} />
          </Card>
        </>
      ) : null}

      {env.webAppUrl ? (
        <Button label="Open RentManager on the web" kind="ghost" onPress={() => void Linking.openURL(env.webAppUrl)} />
      ) : null}

      <Button
        label="Sign out"
        kind="danger"
        loading={signingOut}
        onPress={() =>
          Alert.alert('Sign out?', 'You will need to sign in again to see your account on this phone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign out',
              style: 'destructive',
              onPress: async () => {
                setSigningOut(true);
                await signOutEverywhere(api, signOut);
              },
            },
          ])
        }
      />
      <Button label="Delete account" kind="ghost" onPress={() => router.push('/delete-account')} />
      <Text muted variant="caption" style={{ textAlign: 'center' }}>
        {`Version ${env.appVersion} · ${env.appEnv}`}
      </Text>
    </Screen>
  );
}
