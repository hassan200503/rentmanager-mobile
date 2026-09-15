import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { ApiError, userMessage } from '../../../src/api/errors';
import { can, useAccess } from '../../../src/features/access/use-access';
import { useProperty, usePropertyUnits } from '../../../src/features/landlord/queries';
import { formatMoney } from '../../../src/lib/money';
import { Badge, Button, Card, EmptyState, ErrorState, KeyValue, LoadingState, Row, Screen, SectionTitle, Text } from '../../../src/ui/primitives';
import { useTheme } from '../../../src/ui/theme';

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const property = useProperty(id ?? '');
  const units = usePropertyUnits(id ?? '');
  const access = useAccess();
  const t = useTheme();

  if (property.isPending) {
    return (
      <Screen edges={['left', 'right']}>
        <LoadingState />
      </Screen>
    );
  }
  if (property.isError) {
    const gone = property.error instanceof ApiError && (property.error.kind === 'not_found' || property.error.kind === 'forbidden');
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState message={gone ? "This property isn't available." : userMessage(property.error)} onRetry={gone ? undefined : () => void property.refetch()} />
      </Screen>
    );
  }

  const p = property.data;
  const list = units.data?.content ?? [];

  return (
    <Screen edges={['left', 'right']} refreshing={property.isRefetching || units.isRefetching} onRefresh={() => { void property.refetch(); void units.refetch(); }}>
      <Stack.Screen options={{ title: p.name ?? 'Property' }} />
      <Card>
        <Text variant="heading">{p.name}</Text>
        <KeyValue label="Type" value={p.propertyType?.replace(/_/g, ' ').toLowerCase() ?? '—'} />
        <KeyValue label="Address" value={[p.address?.streetAddress, p.address?.city].filter(Boolean).join(', ') || 'Not provided'} />
        <KeyValue label="Status" value={p.status?.toLowerCase() ?? '—'} />
      </Card>

      <SectionTitle
        action={can.managePortfolio(access.data?.landlordRole) ? <Button label="Add unit" kind="ghost" onPress={() => router.push(`/properties/${id}/new-unit`)} /> : undefined}
      >
        Units
      </SectionTitle>
      {units.isPending ? (
        <LoadingState label="Loading units" />
      ) : units.isError ? (
        <ErrorState message={userMessage(units.error)} onRetry={() => void units.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title="No units yet" body="Add the units renters live in so leases and rent can be tracked." />
      ) : (
        <View style={{ gap: t.space(2) }}>
          {list.map((u) => (
            <Card key={u.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="bodyStrong">{u.label || u.unitNumber}</Text>
                <Badge
                  label={(u.occupancyStatus ?? u.status ?? '').replace(/_/g, ' ').toLowerCase() || 'unknown'}
                  tone={u.occupancyStatus === 'OCCUPIED' ? 'success' : u.occupancyStatus === 'VACANT' ? 'warning' : 'neutral'}
                />
              </Row>
              <Text muted variant="caption">{[u.unitNumber, u.floor ? `Floor ${u.floor}` : null].filter(Boolean).join(' · ')}</Text>
              <KeyValue label="Rent" value={formatMoney(u.rentAmount)} />
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
