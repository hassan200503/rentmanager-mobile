import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { userMessage } from '../../src/api/errors';
import { useRenterPaymentHistory } from '../../src/features/renter/queries';
import { formatInstant, formatLocalDate } from '../../src/lib/dates';
import { formatMoney } from '../../src/lib/money';
import { Badge, Card, EmptyState, ErrorState, LoadingState, Row, Text } from '../../src/ui/primitives';
import { useTheme } from '../../src/ui/theme';

/** The renter's append-only payment record, as the ledger holds it. */
export default function Payments() {
  const q = useRenterPaymentHistory();
  const t = useTheme();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.color.background }}>
      <FlatList
        data={q.data?.content ?? []}
        keyExtractor={(p) => p.id ?? `${p.occurredAt}-${p.externalReference}`}
        contentContainerStyle={{ padding: t.space(4), gap: t.space(3) }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.color.primary} />}
        ListHeaderComponent={
          <View style={{ gap: t.space(3), marginBottom: t.space(2) }}>
            <Text variant="title" accessibilityRole="header">
              Payment history
            </Text>
            {q.isPending ? <LoadingState label="Loading payments" /> : null}
            {q.isError ? <ErrorState message={userMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          q.isSuccess ? <EmptyState title="No payments yet" body="Payments you make appear here with their M-Pesa receipt." /> : null
        }
        ListFooterComponent={
          q.data && !q.data.last ? (
            <Text muted variant="caption" style={{ textAlign: 'center' }}>
              Showing your most recent payments. The full history is on the web portal.
            </Text>
          ) : null
        }
        renderItem={({ item: p }) => (
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="bodyStrong">{formatMoney(p.amount)}</Text>
              {p.type ? <Badge label={p.type.replace(/_/g, ' ').toLowerCase()} tone={p.type === 'PAYMENT' ? 'success' : 'neutral'} /> : null}
            </Row>
            <Text muted variant="caption">
              {formatInstant(p.occurredAt)}
              {p.source ? ` · ${p.source}` : ''}
            </Text>
            {p.externalReference ? <Text variant="caption" selectable>{`Receipt ${p.externalReference}`}</Text> : null}
            {p.billingPeriodStart ? (
              <Text muted variant="caption">{`For ${formatLocalDate(p.billingPeriodStart)} – ${formatLocalDate(p.billingPeriodEnd)}`}</Text>
            ) : null}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
