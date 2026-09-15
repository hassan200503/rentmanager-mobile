import React, { useEffect } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { userMessage } from '../../src/api/errors';
import { useMarkAnnouncementRead, useRenterAnnouncements } from '../../src/features/renter/queries';
import { formatInstant } from '../../src/lib/dates';
import { Badge, Card, EmptyState, ErrorState, LoadingState, Row, Text } from '../../src/ui/primitives';
import { useTheme } from '../../src/ui/theme';

export default function Announcements() {
  const q = useRenterAnnouncements();
  const markRead = useMarkAnnouncementRead();
  const t = useTheme();

  // Opening the list is reading it. Mark each unread one once, sequentially,
  // so a flaky network doesn't fire a burst of parallel writes.
  useEffect(() => {
    const unread = q.data?.filter((a) => !a.read && a.id) ?? [];
    let cancelled = false;
    (async () => {
      for (const a of unread) {
        if (cancelled) return;
        try {
          await markRead.mutateAsync(a.id!);
        } catch {
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.dataUpdatedAt]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.color.background }}>
      <FlatList
        data={q.data ?? []}
        keyExtractor={(a) => a.id ?? ''}
        contentContainerStyle={{ padding: t.space(4), gap: t.space(3) }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={t.color.primary} />}
        ListHeaderComponent={
          <View style={{ gap: t.space(3), marginBottom: t.space(2) }}>
            <Text variant="title" accessibilityRole="header">
              Announcements
            </Text>
            {q.isPending ? <LoadingState /> : null}
            {q.isError ? <ErrorState message={userMessage(q.error)} onRetry={() => void q.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={q.isSuccess ? <EmptyState title="No announcements" body="Messages from your landlord appear here." /> : null}
        renderItem={({ item: a }) => (
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text muted variant="caption">
                {formatInstant(a.createdAt)}
              </Text>
              {a.priority === 'URGENT' ? <Badge label="Urgent" tone="danger" /> : null}
            </Row>
            <Text selectable>{a.message}</Text>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
