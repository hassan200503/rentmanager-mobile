import * as Linking from 'expo-linking';
import React from 'react';

import { userMessage } from '../../src/api/errors';
import { useRenterLease } from '../../src/features/renter/queries';
import { formatLocalDate } from '../../src/lib/dates';
import { formatMoney } from '../../src/lib/money';
import { formatPhone, toE164 } from '../../src/lib/phone';
import { Badge, Button, Card, ErrorState, KeyValue, LoadingState, Screen, SectionTitle, Text } from '../../src/ui/primitives';

export default function RenterLease() {
  const q = useRenterLease();

  if (q.isPending) {
    return (
      <Screen>
        <LoadingState label="Loading your lease" />
      </Screen>
    );
  }
  if (q.isError) {
    return (
      <Screen>
        <ErrorState message={userMessage(q.error)} onRetry={() => void q.refetch()} />
      </Screen>
    );
  }

  const l = q.data;
  const contactPhone = toE164(l.managerPhone) ?? toE164(l.landlordPhone);
  const emergency = toE164(l.emergencyContactPhone);

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      <Text variant="title" accessibilityRole="header">
        Your lease
      </Text>
      <Card>
        <Text variant="heading">{l.propertyName ?? 'Your home'}</Text>
        <Text muted>{[l.unitLabel ?? l.unitNumber, l.propertyAddress].filter(Boolean).join(' · ')}</Text>
        {l.status ? <Badge label={l.status.replace(/_/g, ' ').toLowerCase()} tone={l.status === 'ACTIVE' ? 'success' : 'neutral'} /> : null}
        <KeyValue label="Lease number" value={l.leaseNumber ?? '—'} />
        <KeyValue label="Starts" value={formatLocalDate(l.startDate)} />
        <KeyValue label="Ends" value={l.endDate ? formatLocalDate(l.endDate) : 'No fixed end'} />
        <KeyValue label="Monthly rent" value={formatMoney(l.monthlyRent)} />
        <KeyValue label="Deposit" value={formatMoney(l.depositAmount)} />
      </Card>

      <SectionTitle>Contacts</SectionTitle>
      <Card>
        <KeyValue label="Landlord" value={l.landlordName ?? 'Not provided'} />
        {l.managerName ? <KeyValue label="Manager" value={l.managerName} /> : null}
        {contactPhone ? (
          <Button label={`Call ${formatPhone(contactPhone)}`} kind="secondary" onPress={() => void Linking.openURL(`tel:${contactPhone}`)} />
        ) : (
          <Text muted>No contact number provided.</Text>
        )}
        {emergency ? (
          <Button
            label={`Emergency line${l.emergencyContact24h ? ' (24h)' : ''}`}
            kind="danger"
            onPress={() => void Linking.openURL(`tel:${emergency}`)}
          />
        ) : null}
      </Card>

      {l.terms ? (
        <>
          <SectionTitle>Terms</SectionTitle>
          <Card>
            <Text selectable>{l.terms}</Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
