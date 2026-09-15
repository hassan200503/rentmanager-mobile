import { useAuth } from '@clerk/expo';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';

import { userMessage } from '../src/api/errors';
import { resolveExperiences, useAccess } from '../src/features/access/use-access';
import { useAccountDeletionStatus, useRequestAccountDeletion } from '../src/features/shared/queries';
import { Button, Card, Field, Notice, Screen, Text } from '../src/ui/primitives';

/**
 * In-app account deletion (App Store 5.1.1(v), Google Play account deletion).
 *
 * Says plainly what happens: the login and this person's app data are
 * removed; a landlord's own records of a tenancy and its payments are not,
 * because they are the landlord's records. Owners of a landlord organisation
 * get an honest "recorded for review", not a pretend deletion.
 */
export default function DeleteAccount() {
  const { signOut } = useAuth();
  const access = useAccess();
  const status = useAccountDeletionStatus();
  const request = useRequestAccountDeletion();
  const [confirmText, setConfirmText] = useState('');
  const [outcome, setOutcome] = useState<{ status: string; message: string } | null>(null);

  const experiences = access.data ? resolveExperiences(access.data) : [];
  const isOwner = access.data?.landlordRole === 'OWNER';
  const pendingReview = status.data?.status === 'PENDING_REVIEW';

  function submit() {
    if (request.isPending || confirmText.trim().toUpperCase() !== 'DELETE') return;
    request.mutate(undefined, {
      onSuccess: async (result) => {
        setOutcome({ status: result.status ?? '', message: result.message ?? '' });
        if (result.status === 'COMPLETED') {
          // The login no longer exists on the server. Clear what is left on
          // this phone; the session provider then clears every cached query.
          await SecureStore.deleteItemAsync('rm.pendingRentPayment').catch(() => undefined);
          await SecureStore.deleteItemAsync('rm.pushToken').catch(() => undefined);
          setTimeout(() => void signOut().catch(() => undefined), 2500);
        }
      },
    });
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Delete account' }} />

      {outcome ? (
        <Card>
          <Text variant="heading" tone={outcome.status === 'COMPLETED' ? 'success' : 'warning'} accessibilityLiveRegion="polite">
            {outcome.status === 'COMPLETED' ? 'Account deleted' : 'Request recorded'}
          </Text>
          <Text>{outcome.message}</Text>
        </Card>
      ) : (
        <>
          <Card>
            <Text variant="heading">What happens</Text>
            <Text>• Your RentManager login is removed and you are signed out on this phone.</Text>
            <Text>• Your notification settings and registered phones are removed.</Text>
            {experiences.includes('renter') ? (
              <Text>
                • Your landlord keeps their own records of your tenancy and payments. To have those changed, contact your
                landlord.
              </Text>
            ) : null}
            <Text>• This can't be undone. You can create a new account later.</Text>
          </Card>

          {isOwner ? (
            <Notice tone="warning">
              You own a landlord organisation. Your request will be recorded and the RentManager team will contact you
              to close or hand over the organisation before your login is removed.
            </Notice>
          ) : null}

          {pendingReview ? (
            <Notice tone="info">A deletion request for this account is already waiting for review.</Notice>
          ) : (
            <Card>
              <Field
                label="Type DELETE to confirm"
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {request.isError ? <Notice tone="danger">{userMessage(request.error)}</Notice> : null}
              <Button
                label={isOwner ? 'Request account deletion' : 'Delete my account'}
                kind="danger"
                onPress={submit}
                loading={request.isPending}
                disabled={confirmText.trim().toUpperCase() !== 'DELETE'}
              />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
