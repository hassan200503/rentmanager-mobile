import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { userMessage } from '../../../src/api/errors';
import type { MaintenanceRequest, MaintenanceStatus } from '../../../src/api/types';
import { MaintenanceStatusBadge, PriorityBadge } from '../../../src/components/maintenance-badges';
import { useMaintenanceList } from '../../../src/features/landlord/queries';
import { formatRelative } from '../../../src/lib/dates';
import { Card, ChoiceChips, EmptyState, ErrorState, LoadingState, Row, Text } from '../../../src/ui/primitives';
import { useTheme } from '../../../src/ui/theme';

type Filter = 'open' | MaintenanceStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'SUBMITTED', label: 'New' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Done' },
];

export default function LandlordMaintenance() {
  const [filter, setFilter] = useState<Filter>('open');
  const q = useMaintenanceList(filter === 'open' ? null : filter);
  const t = useTheme();

  const rows =
    filter === 'open'
      ? (q.data ?? []).filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED')
      : (q.data ?? []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.color.background }}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id ?? ''}
        contentContainerStyle={{ padding: t.space(4), gap: t.space(3) }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.color.primary} />}
        initialNumToRender={12}
        windowSize={7}
        ListHeaderComponent={
          <View style={{ gap: t.space(3), marginBottom: t.space(2) }}>
            <Text variant="title" accessibilityRole="header">
              Repairs
            </Text>
            <ChoiceChips label="Show" value={filter} onChange={setFilter} options={FILTERS} />
            {q.isPending ? <LoadingState label="Loading repairs" /> : null}
            {q.isError ? <ErrorState message={userMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          q.isSuccess ? (
            <EmptyState
              title={filter === 'open' ? 'No open repairs' : 'Nothing here'}
              body={filter === 'open' ? 'When a renter reports a problem it appears here, and you get a notification.' : 'No requests with this status.'}
            />
          ) : null
        }
        renderItem={({ item }) => <Row_ r={item} />}
      />
    </SafeAreaView>
  );
}

function Row_({ r }: { r: MaintenanceRequest }) {
  const waiting = r.status === 'SUBMITTED' && !r.firstLandlordResponseAt;
  return (
    <Card
      onPress={() => router.push(`/(landlord)/maintenance/${r.id}`)}
      accessibilityLabel={`${r.title}. ${r.priority} priority. ${r.status}. ${r.unitNumber ?? ''}`}
      accessibilityHint="Opens the request"
    >
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>
          {r.title}
        </Text>
        <PriorityBadge priority={r.priority} />
      </Row>
      <Text muted variant="caption" numberOfLines={1}>
        {[r.propertyName, r.unitNumber, r.renterName].filter(Boolean).join(' · ')}
      </Text>
      <Row style={{ justifyContent: 'space-between' }}>
        <MaintenanceStatusBadge status={r.status} />
        <Text muted variant="caption" tone={waiting ? 'warning' : undefined}>
          {waiting ? `Waiting since ${formatRelative(r.createdAt).toLowerCase()}` : formatRelative(r.updatedAt ?? r.createdAt)}
        </Text>
      </Row>
    </Card>
  );
}
