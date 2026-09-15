import { router } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { userMessage } from '../../src/api/errors';
import type { Property } from '../../src/api/types';
import { can, useAccess } from '../../src/features/access/use-access';
import { useProperties } from '../../src/features/landlord/queries';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, Row, Text } from '../../src/ui/primitives';
import { useTheme } from '../../src/ui/theme';

const OCCUPANCY: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  FULLY_OCCUPIED: { label: 'Full', tone: 'success' },
  PARTIALLY_OCCUPIED: { label: 'Some vacant', tone: 'warning' },
  VACANT: { label: 'Vacant', tone: 'warning' },
};

export default function Properties() {
  const q = useProperties();
  const access = useAccess();
  const t = useTheme();
  const canCreate = can.managePortfolio(access.data?.landlordRole);
  const page = q.data;

  return (
    <FlatList
      data={page?.content ?? []}
      keyExtractor={(p) => p.propertyId ?? ''}
      style={{ backgroundColor: t.color.background }}
      contentContainerStyle={{ padding: t.space(4), gap: t.space(3) }}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.color.primary} />}
      ListHeaderComponent={
        <View style={{ gap: t.space(3), marginBottom: t.space(2) }}>
          {canCreate ? <Button label="Add property" onPress={() => router.push('/properties/new')} /> : null}
          {q.isPending ? <LoadingState label="Loading properties" /> : null}
          {q.isError ? <ErrorState message={userMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
        </View>
      }
      ListEmptyComponent={
        q.isSuccess ? (
          <EmptyState
            title="No properties yet"
            body={canCreate ? 'Add your first property, then its units.' : 'Properties added by your team appear here.'}
          />
        ) : null
      }
      ListFooterComponent={
        page && !page.last ? (
          <Text muted variant="caption" style={{ textAlign: 'center' }}>
            {`Showing ${page.content.length} of ${page.totalElements}. The full list is on the web.`}
          </Text>
        ) : null
      }
      renderItem={({ item }) => <PropertyCard p={item} />}
    />
  );
}

function PropertyCard({ p }: { p: Property }) {
  const occupancy = p.occupancyStatus ? OCCUPANCY[p.occupancyStatus] : undefined;
  return (
    <Card onPress={() => router.push(`/properties/${p.propertyId}`)} accessibilityLabel={`${p.name}${occupancy ? `, ${occupancy.label}` : ''}`}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
          {p.name}
        </Text>
        {occupancy ? <Badge label={occupancy.label} tone={occupancy.tone} /> : null}
      </Row>
      <Text muted variant="caption" numberOfLines={1}>
        {[p.propertyType?.replace(/_/g, ' ').toLowerCase(), p.address?.streetAddress, p.address?.city].filter(Boolean).join(' · ')}
      </Text>
    </Card>
  );
}
