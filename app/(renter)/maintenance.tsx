import { router } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { userMessage } from '../../src/api/errors';
import type { MaintenanceRequest } from '../../src/api/types';
import { CATEGORY_LABEL, MaintenanceStatusBadge, PriorityBadge } from '../../src/components/maintenance-badges';
import { useRenterMaintenance } from '../../src/features/renter/queries';
import { formatInstant, formatLocalDate } from '../../src/lib/dates';
import { Button, Card, EmptyState, ErrorState, LoadingState, Row, Text } from '../../src/ui/primitives';
import { useTheme } from '../../src/ui/theme';

export default function RenterMaintenance() {
  const q = useRenterMaintenance();
  const t = useTheme();

  const header = (
    <View style={{ gap: t.space(3), marginBottom: t.space(3) }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="title" accessibilityRole="header">
          Repairs
        </Text>
        <Button label="Report" onPress={() => router.push('/(renter)/report-issue')} />
      </Row>
      {q.isPending ? <LoadingState label="Loading repairs" /> : null}
      {q.isError ? <ErrorState message={userMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.color.background }}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(r) => r.id ?? ''}
        contentContainerStyle={{ padding: t.space(4), gap: t.space(3) }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          q.isSuccess ? (
            <EmptyState
              title="No repair requests"
              body="When something in your home needs fixing, report it here. Your landlord is notified straight away."
              actionLabel="Report an issue"
              onAction={() => router.push('/(renter)/report-issue')}
            />
          ) : null
        }
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.color.primary} />}
        renderItem={({ item }) => <RequestCard r={item} />}
      />
    </SafeAreaView>
  );
}

function RequestCard({ r }: { r: MaintenanceRequest }) {
  return (
    <Card
      accessibilityLabel={`${r.title}. ${r.status}`}
      accessibilityHint="Opens the request"
      onPress={() => router.push(`/(renter)/request/${r.id}`)}
    >
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text variant="bodyStrong" style={{ flex: 1 }}>
          {r.title}
        </Text>
        <MaintenanceStatusBadge status={r.status} />
      </Row>
      <Row>
        {r.category ? <Text muted variant="caption">{CATEGORY_LABEL[r.category]}</Text> : null}
        <PriorityBadge priority={r.priority} />
      </Row>
      {r.description ? <Text muted numberOfLines={3}>{r.description}</Text> : null}
      {r.scheduledDate ? <Text>{`Scheduled for ${formatLocalDate(r.scheduledDate)}`}</Text> : null}
      {r.notes ? (
        <View>
          <Text variant="caption" muted>
            Latest from your landlord
          </Text>
          <Text>{r.notes}</Text>
        </View>
      ) : null}
      <Text muted variant="caption">
        {`Reported ${formatInstant(r.createdAt)}${r.updatedAt && r.updatedAt !== r.createdAt ? ` · updated ${formatInstant(r.updatedAt)}` : ''}`}
      </Text>
    </Card>
  );
}
