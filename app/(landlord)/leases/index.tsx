import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { userMessage } from '../../../src/api/errors';
import type { LeaseStatus, LeaseSummary } from '../../../src/api/types';
import { LeaseStatusBadge } from '../../../src/components/lease-badges';
import { useLeases } from '../../../src/features/landlord/queries';
import { formatLocalDate } from '../../../src/lib/dates';
import { formatMoney } from '../../../src/lib/money';
import { Card, ChoiceChips, EmptyState, ErrorState, Field, LoadingState, Row, Text } from '../../../src/ui/primitives';
import { useTheme } from '../../../src/ui/theme';

const FILTERS: { value: LeaseStatus | 'ALL'; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ALL', label: 'All' },
  { value: 'PENDING_APPROVAL', label: 'Pending' },
  { value: 'EXPIRED', label: 'Expired' },
];

/** Debounced by 350ms so typing a name is one request, not one per key. */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function Leases() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LeaseStatus | 'ALL'>('ACTIVE');
  const keyword = useDebounced(search.trim(), 350);
  const q = useLeases(keyword, filter === 'ALL' ? null : filter);
  const t = useTheme();
  const page = q.data;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.color.background }}>
      <FlatList
        data={page?.content ?? []}
        keyExtractor={(l) => l.id ?? ''}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: t.space(4), gap: t.space(3) }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.color.primary} />}
        initialNumToRender={12}
        windowSize={7}
        ListHeaderComponent={
          <View style={{ gap: t.space(3), marginBottom: t.space(2) }}>
            <Text variant="title" accessibilityRole="header">
              Renters
            </Text>
            <Field
              label="Search"
              value={search}
              onChangeText={setSearch}
              placeholder="Name, phone, unit or lease number"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            <ChoiceChips label="Lease status" value={filter} onChange={setFilter} options={FILTERS} />
            {q.isPending ? <LoadingState label="Loading renters" /> : null}
            {q.isError ? <ErrorState message={userMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          q.isSuccess ? (
            <EmptyState
              title={keyword ? 'No matches' : 'No leases'}
              body={keyword ? `Nothing matches "${keyword}".` : 'Leases you create on the web appear here.'}
            />
          ) : null
        }
        ListFooterComponent={
          page && page.totalElements > (page.content?.length ?? 0) ? (
            <Text muted variant="caption" style={{ textAlign: 'center' }}>
              {`Showing ${page.content.length} of ${page.totalElements}. Search to narrow it down.`}
            </Text>
          ) : null
        }
        renderItem={({ item }) => <LeaseCard l={item} />}
      />
    </SafeAreaView>
  );
}

function LeaseCard({ l }: { l: LeaseSummary }) {
  return (
    <Card onPress={() => router.push(`/(landlord)/leases/${l.id}`)} accessibilityLabel={`${l.tenantFullName}, ${l.propertyName} ${l.unitLabel ?? ''}`}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
          {l.tenantFullName ?? 'Renter'}
        </Text>
        <LeaseStatusBadge status={l.status} />
      </Row>
      <Text muted variant="caption" numberOfLines={1}>
        {[l.propertyName, l.unitLabel].filter(Boolean).join(' · ')}
      </Text>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text>{formatMoney(l.rentAmount)}/mo</Text>
        <Text muted variant="caption">
          {l.endDate ? `Ends ${formatLocalDate(l.endDate)}` : `Since ${formatLocalDate(l.startDate)}`}
        </Text>
      </Row>
    </Card>
  );
}
