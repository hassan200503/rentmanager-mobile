import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { userMessage } from '../../../src/api/errors';
import { can, useAccess } from '../../../src/features/access/use-access';
import { useCreateUnit } from '../../../src/features/landlord/queries';
import { parseAmountInput } from '../../../src/lib/money';
import { Button, Card, Field, Notice, Screen } from '../../../src/ui/primitives';

export default function NewUnit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const access = useAccess();
  const create = useCreateUnit(id ?? '');
  const [unitNumber, setUnitNumber] = useState('');
  const [label, setLabel] = useState('');
  const [floor, setFloor] = useState('');
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [errors, setErrors] = useState<{ unitNumber?: string; rent?: string; deposit?: string }>({});

  if (!can.managePortfolio(access.data?.landlordRole)) {
    return (
      <Screen>
        <Notice tone="info">Only owners and managers can add units.</Notice>
      </Screen>
    );
  }

  function submit() {
    if (create.isPending) return;
    const next: typeof errors = {};
    if (!unitNumber.trim()) next.unitNumber = 'Enter the unit number, e.g. A3.';
    const rentParsed = parseAmountInput(rent);
    if (!rentParsed.ok) next.rent = rentParsed.reason;
    const depositParsed = deposit.trim() ? parseAmountInput(deposit) : null;
    if (depositParsed && !depositParsed.ok) next.deposit = depositParsed.reason;
    setErrors(next);
    if (Object.keys(next).length || !rentParsed.ok) return;
    create.mutate(
      {
        propertyId: id ?? '',
        unitNumber: unitNumber.trim(),
        label: label.trim() || undefined,
        floor: floor.trim() || undefined,
        rentAmount: rentParsed.value,
        depositAmount: depositParsed && depositParsed.ok ? depositParsed.value : undefined,
      },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['left', 'right']}>
        <Card>
          <Field label="Unit number" value={unitNumber} onChangeText={setUnitNumber} error={errors.unitNumber} autoCapitalize="characters" maxLength={30} />
          <Field label="Label (optional)" value={label} onChangeText={setLabel} placeholder="e.g. 2 bedroom" maxLength={60} />
          <Field label="Floor (optional)" value={floor} onChangeText={setFloor} maxLength={10} />
          <Field label="Monthly rent (KSh)" value={rent} onChangeText={setRent} error={errors.rent} keyboardType="decimal-pad" />
          <Field label="Deposit (KSh, optional)" value={deposit} onChangeText={setDeposit} error={errors.deposit} keyboardType="decimal-pad" />
          {create.isError ? <Notice tone="danger">{userMessage(create.error)}</Notice> : null}
          <Button label="Add unit" onPress={submit} loading={create.isPending} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
