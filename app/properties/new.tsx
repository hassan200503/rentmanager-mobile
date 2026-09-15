import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { userMessage } from '../../src/api/errors';
import type { CreateProperty } from '../../src/api/types';
import { can, useAccess } from '../../src/features/access/use-access';
import { useCreateProperty } from '../../src/features/landlord/queries';
import { Button, Card, ChoiceChips, Field, Notice, Screen, Text } from '../../src/ui/primitives';

type PropertyType = NonNullable<CreateProperty['propertyType']>;

const TYPES: { value: PropertyType; label: string }[] = [
  { value: 'APARTMENT', label: 'Apartments' },
  { value: 'BEDSITTER', label: 'Bedsitters' },
  { value: 'STUDIO', label: 'Studios' },
  { value: 'MAISONETTE', label: 'Maisonettes' },
  { value: 'VILLA', label: 'Villa / house' },
  { value: 'HOSTEL', label: 'Hostel' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'OFFICE', label: 'Offices' },
];

/**
 * The essentials to start tracking a property from the phone: name, type and
 * where it is. Media, tax registration and detailed classification stay on
 * the web. The backend classifies residential/commercial from the type.
 */
export default function NewProperty() {
  const access = useAccess();
  const create = useCreateProperty();
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType | null>(null);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [errors, setErrors] = useState<{ name?: string; type?: string; city?: string }>({});

  if (!can.managePortfolio(access.data?.landlordRole)) {
    return (
      <Screen>
        <Notice tone="info">Only owners and managers can add properties.</Notice>
      </Screen>
    );
  }

  function submit() {
    if (create.isPending) return;
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'Enter the property name.';
    if (!type) next.type = 'Choose what kind of property it is.';
    if (city.trim().length < 2) next.city = 'Enter the town or city.';
    setErrors(next);
    if (Object.keys(next).length || !type) return;
    create.mutate(
      {
        name: name.trim(),
        propertyType: type,
        address: { streetAddress: street.trim() || undefined, city: city.trim(), country: 'Kenya' },
      },
      { onSuccess: (p) => router.replace(`/properties/${p.propertyId}`) },
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['left', 'right']}>
        <Card>
          <Field label="Property name" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" maxLength={120} />
          <ChoiceChips label="Type" value={type} onChange={setType} options={TYPES} />
          {errors.type ? <Text tone="danger" variant="caption">{errors.type}</Text> : null}
          <Field label="Street or area (optional)" value={street} onChangeText={setStreet} maxLength={200} />
          <Field label="Town or city" value={city} onChangeText={setCity} error={errors.city} autoCapitalize="words" maxLength={100} />
          {create.isError ? <Notice tone="danger">{userMessage(create.error)}</Notice> : null}
          <Button label="Add property" onPress={submit} loading={create.isPending} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
