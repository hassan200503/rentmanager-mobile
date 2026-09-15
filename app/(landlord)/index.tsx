import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { userMessage } from '../../src/api/errors';
import { MaintenanceStatusBadge, PriorityBadge } from '../../src/components/maintenance-badges';
import { useAccess } from '../../src/features/access/use-access';
import {
  useLedgerSummary,
  useMaintenanceList,
  useOnboardingProgress,
  useOverdueEntries,
  useUnitSummary,
} from '../../src/features/landlord/queries';
import { formatRelative } from '../../src/lib/dates';
import { formatMoney } from '../../src/lib/money';
import { Badge, Card, ErrorState, KeyValue, LoadingState, Notice, Row, Screen, SectionTitle, Text } from '../../src/ui/primitives';
import { useTheme } from '../../src/ui/theme';

/**
 * "What needs my attention right now?" — only figures the backend computes:
 * the ledger summary, SQL-counted occupancy, ledger-marked overdue entries,
 * and open repair requests. No trend arrows, no scores, no client arithmetic.
 */
export default function LandlordHome() {
  const access = useAccess();
  const ledger = useLedgerSummary();
  const units = useUnitSummary();
  const overdue = useOverdueEntries();
  const submitted = useMaintenanceList('SUBMITTED');
  const isOwnerOrManager = access.data?.landlordRole === 'OWNER' || access.data?.landlordRole === 'MANAGER';
  const onboarding = useOnboardingProgress(isOwnerOrManager);
  const t = useTheme();

  const refreshing = ledger.isRefetching || units.isRefetching || overdue.isRefetching || submitted.isRefetching;
  const refresh = () => {
    void ledger.refetch();
    void units.refetch();
    void overdue.refetch();
    void submitted.refetch();
    void onboarding.refetch();
  };

  const urgentFirst = [...(submitted.data ?? [])].sort((a, b) => rank(b.priority) - rank(a.priority));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Text variant="title" accessibilityRole="header">
        Home
      </Text>

      {onboarding.data && !onboarding.data.paymentConfigured ? (
        <Notice tone="warning">
          M-Pesa collection isn't set up yet, so renters can't pay through RentManager. Add your Daraja details under
          Payment settings on the web.
        </Notice>
      ) : null}

      <SectionTitle>Rent this month</SectionTitle>
      {ledger.isPending ? (
        <LoadingState label="Loading rent" />
      ) : ledger.isError ? (
        <ErrorState message={userMessage(ledger.error)} onRetry={() => void ledger.refetch()} />
      ) : (
        <Card onPress={() => router.push('/(landlord)/rent')} accessibilityHint="Opens overdue rent">
          <KeyValue label="Collected" value={formatMoney(ledger.data.collectedThisMonth, ledger.data.currency ?? 'KES')} />
          <KeyValue label="Outstanding" value={formatMoney(ledger.data.outstandingTotal, ledger.data.currency ?? 'KES')} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Text muted>Overdue</Text>
            <Row>
              <Text variant="bodyStrong" tone={Number(ledger.data.overdueEntryCount ?? 0) > 0 ? 'danger' : undefined}>
                {formatMoney(ledger.data.overdueTotal, ledger.data.currency ?? 'KES')}
              </Text>
              {Number(ledger.data.overdueEntryCount ?? 0) > 0 ? (
                <Badge label={`${ledger.data.overdueEntryCount} unpaid`} tone="danger" />
              ) : null}
            </Row>
          </Row>
        </Card>
      )}

      <SectionTitle>Occupancy</SectionTitle>
      {units.isPending ? (
        <LoadingState label="Loading units" />
      ) : units.isError ? (
        <ErrorState message={userMessage(units.error)} onRetry={() => void units.refetch()} />
      ) : Number(units.data.totalUnits ?? 0) === 0 ? (
        <Card>
          <Text muted>No units yet. Add your properties and units on the web to start tracking occupancy and rent.</Text>
        </Card>
      ) : (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Stat label="Occupied" value={units.data.occupiedUnits} />
            <Stat label="Vacant" value={units.data.vacantUnits} tone={Number(units.data.vacantUnits ?? 0) > 0 ? 'warning' : undefined} />
            <Stat label="Reserved" value={units.data.reservedUnits} />
            <Stat label="Total" value={units.data.totalUnits} />
          </Row>
        </Card>
      )}

      <SectionTitle>New repair requests</SectionTitle>
      {submitted.isPending ? (
        <LoadingState label="Loading repairs" />
      ) : submitted.isError ? (
        <ErrorState message={userMessage(submitted.error)} onRetry={() => void submitted.refetch()} />
      ) : urgentFirst.length === 0 ? (
        <Card>
          <Text muted>Nothing waiting for a first response.</Text>
        </Card>
      ) : (
        <View style={{ gap: t.space(2) }}>
          {urgentFirst.slice(0, 5).map((r) => (
            <Card
              key={r.id}
              onPress={() => router.push(`/(landlord)/maintenance/${r.id}`)}
              accessibilityLabel={`${r.title}, ${r.priority} priority, unit ${r.unitNumber ?? ''}`}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                  {r.title}
                </Text>
                <PriorityBadge priority={r.priority} />
              </Row>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text muted variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                  {[r.propertyName, r.unitNumber, r.renterName].filter(Boolean).join(' · ')}
                </Text>
                <Text muted variant="caption">
                  {formatRelative(r.createdAt)}
                </Text>
              </Row>
              <MaintenanceStatusBadge status={r.status} />
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function rank(p?: string) {
  return p === 'URGENT' ? 3 : p === 'HIGH' ? 2 : p === 'MEDIUM' ? 1 : 0;
}

function Stat({ label, value, tone }: { label: string; value: number | undefined; tone?: 'warning' }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 64 }} accessible accessibilityLabel={`${label}: ${value ?? 'unknown'}`}>
      <Text variant="heading" tone={tone}>
        {value ?? '—'}
      </Text>
      <Text muted variant="caption">
        {label}
      </Text>
    </View>
  );
}
