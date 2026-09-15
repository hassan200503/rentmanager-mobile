import { useAuth, useOrganizationList, useUser } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { ApiError, userMessage } from '../src/api/errors';
import { useSession } from '../src/auth/session';
import { signOutEverywhere } from '../src/auth/sign-out';
import { track } from '../src/observability/analytics';
import { toE164 } from '../src/lib/phone';
import { Button, Card, ChoiceChips, Field, Notice, Screen, Text } from '../src/ui/primitives';

/**
 * First-run for a signed-in person the backend does not yet know as a
 * landlord or a renter (ROLE_PENDING_ONBOARDING).
 *
 * Landlord setup uses the SAME backend path as the web, so it can be started
 * on one and finished on the other:
 *   1. Ensure an active Clerk organisation (reuse one already created on the
 *      web; otherwise create it). The organisation id reaches the backend only
 *      through the verified token — never the request body.
 *   2. POST /onboarding/tenant creates the landlord organisation record.
 *   3. Force a fresh token: the one that authorised step 2 still carries
 *      PENDING_ONBOARDING, and re-check access before leaving this screen.
 *
 * Renters are never self-created: a landlord adds them, or they come through
 * a reservation. So the renter path explains how to get linked instead of
 * inventing a flow the backend does not support.
 */
export default function Onboarding() {
  const [path, setPath] = useState<'landlord' | 'renter' | null>(null);
  const { api, refreshToken, scope } = useSession();
  const { signOut } = useAuth();
  const { user } = useUser();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Text variant="title" accessibilityRole="header">
          Welcome{user?.firstName ? `, ${user.firstName}` : ''}
        </Text>
        <ChoiceChips
          label="How will you use RentManager?"
          value={path}
          onChange={setPath}
          options={[
            { value: 'landlord', label: 'I manage rentals' },
            { value: 'renter', label: 'I rent a home' },
          ]}
        />
        {path === 'landlord' ? <LandlordSetup /> : null}
        {path === 'renter' ? <RenterHelp email={user?.primaryEmailAddress?.emailAddress} phone={user?.primaryPhoneNumber?.phoneNumber} onRefresh={refreshToken} scope={scope} /> : null}
        <Button label="Sign out" kind="ghost" onPress={() => void signOutEverywhere(api, signOut)} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

function LandlordSetup() {
  const { api, refreshToken, scope } = useSession();
  const { orgId } = useAuth();
  const { user } = useUser();
  const { isLoaded, createOrganization, setActive, userMemberships } = useOrganizationList({ userMemberships: true });
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress ?? '');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const existingOrg = userMemberships?.data?.[0]?.organization;

  function validate() {
    const next: Record<string, string> = {};
    if (!existingOrg && name.trim().length < 2) next.name = 'Enter at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!toE164(phone)) next.phone = 'Enter a Kenyan mobile number, e.g. 0712 345 678.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (submitting || !isLoaded || !validate()) return;
    setSubmitting(true);
    setProblem(null);
    track('onboarding_started');
    try {
      // Step 1 — resume an organisation started elsewhere, or create one.
      let organizationId = orgId ?? existingOrg?.id ?? null;
      const orgName = existingOrg?.name ?? name.trim();
      if (!organizationId) {
        const created = await createOrganization({ name: orgName });
        organizationId = created.id;
      }
      if (organizationId !== orgId) {
        await setActive({ organization: organizationId });
      }
      await refreshToken();

      // Step 2 — the backend record. Bare (non-envelope) response.
      try {
        await api.post(
          '/onboarding/tenant',
          { name: orgName, email: email.trim(), phoneNumber: toE164(phone), tenantType: 'TRIAL' },
          { unwrapped: true },
        );
      } catch (err) {
        // Already created (e.g. finished on the web a moment ago): continue.
        const alreadyDone = err instanceof ApiError && err.kind === 'forbidden';
        if (!alreadyDone) throw err;
      }

      // Step 3 — new token, fresh access, then let the gate route.
      await refreshToken();
      await qc.invalidateQueries({ queryKey: [scope, 'access'] });
      track('onboarding_completed');
      router.replace('/');
    } catch (err) {
      setProblem(userMessage(err, "We couldn't finish setting up your account. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <Text variant="heading">Set up your rental business</Text>
      <Text muted>You can add properties and M-Pesa collection details next — on your phone or on the web.</Text>
      {existingOrg ? (
        <Notice tone="info">{`Continuing setup for "${existingOrg.name}".`}</Notice>
      ) : (
        <Field label="Business or portfolio name" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" returnKeyType="next" />
      )}
      <Field label="Business email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Business phone" value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" autoComplete="tel" hint="Renters and SMS alerts use this number." />
      {problem ? <Notice tone="danger">{problem}</Notice> : null}
      <Button label="Create my account" onPress={() => void submit()} loading={submitting} disabled={!isLoaded} />
    </Card>
  );
}

function RenterHelp({ email, phone, onRefresh, scope }: { email?: string; phone?: string; onRefresh: () => Promise<void>; scope: string }) {
  const qc = useQueryClient();
  const [checking, setChecking] = useState(false);
  return (
    <Card>
      <Text variant="heading">Your landlord adds you</Text>
      <Text muted>
        Renter accounts are linked by your landlord or when you reserve a unit. Ask them to add you using the
        same details you signed in with:
      </Text>
      {email ? <Text variant="bodyStrong">{email}</Text> : null}
      {phone ? <Text variant="bodyStrong">{phone}</Text> : null}
      <Text muted>Once they have, check again below.</Text>
      <Button
        label="Check again"
        kind="secondary"
        loading={checking}
        onPress={async () => {
          setChecking(true);
          await onRefresh();
          await qc.invalidateQueries({ queryKey: [scope, 'access'] });
          setChecking(false);
          router.replace('/');
        }}
      />
    </Card>
  );
}
