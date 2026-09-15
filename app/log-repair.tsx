import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { userMessage } from '../src/api/errors';
import type { LeaseSummary, MaintenanceCategory, MaintenancePriority } from '../src/api/types';
import { CATEGORY_LABEL, PRIORITY_LABEL } from '../src/components/maintenance-badges';
import { can, useAccess } from '../src/features/access/use-access';
import { useLeases, useLogRepairForRenter } from '../src/features/landlord/queries';
import { Button, Card, ChoiceChips, Field, LoadingState, Notice, Screen, Text } from '../src/ui/primitives';
import { useTheme } from '../src/ui/theme';

const CATEGORIES = Object.keys(CATEGORY_LABEL) as MaintenanceCategory[];
const PRIORITIES = Object.keys(PRIORITY_LABEL) as MaintenancePriority[];

/**
 * A caretaker logs a problem a renter reported in person. The unit, property,
 * renter and lease ids come from a lease the backend returned for this
 * organisation — never typed — and the backend re-verifies that they all
 * belong to the organisation and to each other before creating the request.
 */
export default function LogRepair() {
  const access = useAccess();
  const t = useTheme();
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [lease, setLease] = useState<LeaseSummary | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory | null>(null);
  const [priority, setPriority] = useState<MaintenancePriority>('MEDIUM');
  const [error, setError] = useState<string | null>(null);
  const leases = useLeases(keyword, 'ACTIVE');
  const create = useLogRepairForRenter();

  useEffect(() => {
    const handle = setTimeout(() => setKeyword(search.trim()), 350);
    return () => clearTimeout(handle);
  }, [search]);

  if (!can.logRepairForRenter(access.data?.landlordRole)) {
    return (
      <Screen>
        <Notice tone="info">Your role can't log repairs.</Notice>
      </Screen>
    );
  }

  function submit() {
    if (create.isPending || !lease) return;
    if (title.trim().length < 3) return setError('Say briefly what is wrong.');
    if (!category) return setError('Choose the closest category.');
    setError(null);
    create.mutate(
      {
        unitId: lease.unitId ?? '',
        propertyId: lease.propertyId ?? '',
        tenantProfileId: lease.tenantProfileId ?? '',
        leaseId: lease.id,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
      },
      { onSuccess: (r) => router.replace(`/(landlord)/maintenance/${r.id}`) },
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Log a repair' }} />
        {!lease ? (
          <Card>
            <Text variant="heading">Whose home is it?</Text>
            <Field label="Search renters" value={search} onChangeText={setSearch} placeholder="Name, phone or unit" autoCorrect={false} />
            {leases.isPending ? (
              <LoadingState />
            ) : leases.isError ? (
              <Notice tone="danger">{userMessage(leases.error)}</Notice>
            ) : (leases.data?.content ?? []).length === 0 ? (
              <Text muted>No active leases match.</Text>
            ) : (
              <View style={{ gap: t.space(2) }}>
                {(leases.data?.content ?? []).slice(0, 20).map((l) => (
                  <Button
                    key={l.id}
                    kind="secondary"
                    label={`${l.tenantFullName ?? 'Renter'} · ${[l.propertyName, l.unitLabel].filter(Boolean).join(' ')}`}
                    onPress={() => setLease(l)}
                  />
                ))}
              </View>
            )}
          </Card>
        ) : (
          <Card>
            <Text variant="bodyStrong">{lease.tenantFullName}</Text>
            <Text muted>{[lease.propertyName, lease.unitLabel].filter(Boolean).join(' · ')}</Text>
            <Button label="Choose a different renter" kind="ghost" onPress={() => setLease(null)} />
            <Field label="What's wrong?" value={title} onChangeText={setTitle} maxLength={120} />
            <ChoiceChips label="Category" value={category} onChange={setCategory} options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} />
            <ChoiceChips label="Priority" value={priority} onChange={setPriority} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))} />
            <Field
              label="Details (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top' }}
              maxLength={2000}
            />
            {error ? <Notice tone="warning">{error}</Notice> : null}
            {create.isError ? <Notice tone="danger">{userMessage(create.error)}</Notice> : null}
            <Button label="Log repair" onPress={submit} loading={create.isPending} />
            <Text muted variant="caption">You can add photos from the request once it's logged. If the renter has a phone number on file, they're sent an SMS confirmation.</Text>
          </Card>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
