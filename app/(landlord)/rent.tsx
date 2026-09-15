import { router } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { userMessage } from '../../src/api/errors';
import { useOverdueEntries, type LedgerEntry } from '../../src/features/landlord/queries';
import { daysUntilLocalDate, formatLocalDate } from '../../src/lib/dates';
import { formatMoney, isPositive } from '../../src/lib/money';
import { Card, EmptyState, ErrorState, KeyValue, LoadingState, Row, Text } from '../../src/ui/primitives';
import { useTheme } from '../../src/ui/theme';

/**
 * Overdue rent, as the ledger marks it (the 02:30 overdue sweep), oldest
 * first. "Balance owed" is the ledger's figure for what is still unpaid —
 * not the monthly rent — so a partial payer is never chased for the full
 * amount.
 */
export default function Rent() {
  const q = useOverdueEntries();
  const t = useTheme();
  const rows = [...(q.data ?? [])].sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.color.background }}>
      <FlatList
        data={rows}
        keyExtractor={(e) => e.id ?? ''}
        contentContainerStyle={{ padding: t.space(4), gap: t.space(3) }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.color.primary} />}
        initialNumToRender={10}
        windowSize={7}
        ListHeaderComponent={
          <View style={{ gap: t.space(3), marginBottom: t.space(2) }}>
            <Text variant="title" accessibilityRole="header">
              Overdue rent
            </Text>
            {q.isPending ? <LoadingState label="Loading overdue rent" /> : null}
            {q.isError ? <ErrorState message={userMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          q.isSuccess ? <EmptyState title="No overdue rent" body="Every renter is up to date on rent that has fallen due." /> : null
        }
        renderItem={({ item }) => <OverdueCard e={item} />}
      />
    </SafeAreaView>
  );
}

function OverdueCard({ e }: { e: LedgerEntry }) {
  const days = daysUntilLocalDate(e.dueDate);
  const late = days !== null && days < 0 ? -days : null;
  return (
    <Card
      onPress={e.leaseId ? () => router.push(`/(landlord)/leases/${e.leaseId}`) : undefined}
      accessibilityLabel={`${e.tenantFullName}, owes ${formatMoney(e.balanceOwed)}`}
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
          {e.tenantFullName ?? 'Renter'}
        </Text>
        <Text variant="bodyStrong" tone="danger">
          {formatMoney(e.balanceOwed)}
        </Text>
      </Row>
      <Text muted variant="caption">
        {[e.propertyName, e.unitNumber].filter(Boolean).join(' · ')}
      </Text>
      <KeyValue label="Due" value={`${formatLocalDate(e.dueDate)}${late ? ` · ${late} day${late === 1 ? '' : 's'} late` : ''}`} />
      {isPositive(e.amountPaid) ? (
        <KeyValue label="Paid so far" value={formatMoney(e.amountPaid)} />
      ) : null}
    </Card>
  );
}
