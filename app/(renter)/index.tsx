import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { userMessage } from '../../src/api/errors';
import type { RenterDashboard } from '../../src/api/types';
import { MaintenanceStatusBadge } from '../../src/components/maintenance-badges';
import { useRenterAnnouncements, useRenterDashboard, useRenterMaintenance } from '../../src/features/renter/queries';
import { daysUntilLocalDate, formatInstant, formatLocalDate } from '../../src/lib/dates';
import { formatMoney, isPositive } from '../../src/lib/money';
import { Badge, Button, Card, ErrorState, KeyValue, LoadingState, Row, Screen, SectionTitle, Text } from '../../src/ui/primitives';
import { useTheme } from '../../src/ui/theme';

/**
 * "What do I owe, and is anything happening?" Every figure comes straight
 * from the backend; if a query fails, the card says so — it never falls
 * back to a confident zero.
 */
export default function RenterHome() {
  const dashboard = useRenterDashboard();
  const maintenance = useRenterMaintenance();
  const announcements = useRenterAnnouncements();
  const t = useTheme();

  const refreshing = dashboard.isRefetching || maintenance.isRefetching || announcements.isRefetching;
  const refresh = () => {
    void dashboard.refetch();
    void maintenance.refetch();
    void announcements.refetch();
  };

  const open = maintenance.data?.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED') ?? [];
  const unread = announcements.data?.filter((a) => !a.read) ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Text variant="title" accessibilityRole="header">
        Home
      </Text>

      {dashboard.isPending ? (
        <LoadingState label="Loading your balance" />
      ) : dashboard.isError ? (
        <ErrorState message={userMessage(dashboard.error)} onRetry={() => void dashboard.refetch()} />
      ) : (
        <BalanceCard d={dashboard.data} />
      )}

      {unread.length > 0 ? (
        <Card onPress={() => router.push('/(renter)/announcements')} accessibilityLabel={`${unread.length} unread announcements`}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="bodyStrong">Announcements</Text>
            <Badge label={`${unread.length} new`} tone={unread.some((a) => a.priority === 'URGENT') ? 'danger' : 'info'} />
          </Row>
          <Text numberOfLines={2} muted>
            {unread[0].message}
          </Text>
        </Card>
      ) : null}

      <SectionTitle
        action={<Button label="Report an issue" kind="ghost" onPress={() => router.push('/(renter)/report-issue')} />}
      >
        Repairs
      </SectionTitle>
      {maintenance.isPending ? (
        <LoadingState label="Loading repairs" />
      ) : maintenance.isError ? (
        <ErrorState message={userMessage(maintenance.error)} onRetry={() => void maintenance.refetch()} />
      ) : open.length === 0 ? (
        <Card>
          <Text muted>No open repair requests. If something needs fixing, report it and your landlord is notified.</Text>
        </Card>
      ) : (
        <View style={{ gap: t.space(2) }}>
          {open.slice(0, 3).map((r) => (
            <Card key={r.id} onPress={() => router.push(`/(renter)/request/${r.id}`)} accessibilityLabel={`${r.title}, ${r.status}`}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {r.title}
                </Text>
                <MaintenanceStatusBadge status={r.status} />
              </Row>
              <Text muted variant="caption">
                Reported {formatInstant(r.createdAt, false)}
              </Text>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function BalanceCard({ d }: { d: RenterDashboard }) {
  const t = useTheme();
  const owes = isPositive(d.currentBalance);
  const overdue = isPositive(d.overdueAmount);
  const days = daysUntilLocalDate(d.nextDueDate);
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text muted>{d.propertyName ? `${d.propertyName} · ${d.unitNumber ?? ''}` : 'Your rent'}</Text>
        {overdue ? <Badge label="Overdue" tone="danger" /> : owes ? <Badge label="Due" tone="warning" /> : <Badge label="Up to date" tone="success" />}
      </Row>
      <Text muted>Balance</Text>
      <Text variant="figure" accessibilityLabel={`Balance ${formatMoney(d.currentBalance)}`}>
        {formatMoney(d.currentBalance)}
      </Text>
      {overdue ? <KeyValue label="Overdue" value={formatMoney(d.overdueAmount)} /> : null}
      {d.nextDueDate ? (
        <KeyValue
          label="Next due"
          value={`${formatMoney(d.nextDueAmount)} · ${formatLocalDate(d.nextDueDate)}${
            days !== null && days >= 0 && days <= 7 ? (days === 0 ? ' (today)' : ` (in ${days} d)`) : ''
          }`}
        />
      ) : null}
      {owes ? (
        <Button label="Pay with M-Pesa" onPress={() => router.push('/(renter)/pay')} style={{ marginTop: t.space(2) }} />
      ) : null}
      <Button label="Payment history" kind="ghost" onPress={() => router.push('/(renter)/payments')} />
    </Card>
  );
}
