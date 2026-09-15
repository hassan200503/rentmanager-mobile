import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { userMessage } from '../../../src/api/errors';
import { CATEGORY_LABEL, MaintenanceStatusBadge, PriorityBadge } from '../../../src/components/maintenance-badges';
import { RepairPhotos } from '../../../src/components/repair-photos';
import { useRenterMaintenance } from '../../../src/features/renter/queries';
import { formatInstant, formatLocalDate } from '../../../src/lib/dates';
import { Card, ErrorState, KeyValue, LoadingState, Notice, Row, Screen, Text } from '../../../src/ui/primitives';

/**
 * One of the renter's own repair requests. Read from the renter's request
 * list (the backend exposes no per-id renter endpoint), so an id that is not
 * theirs simply is not found — there is nothing to look up by id elsewhere.
 */
export default function RenterRequestDetail() {
  const { id, photosFailed } = useLocalSearchParams<{ id: string; photosFailed?: string }>();
  // Present only when arriving straight from "Report an issue".
  const justSent = photosFailed !== undefined;
  const failedCount = parseInt(photosFailed ?? '0', 10) || 0;
  const q = useRenterMaintenance();

  if (q.isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (q.isError) {
    return (
      <Screen>
        <ErrorState message={userMessage(q.error)} onRetry={() => void q.refetch()} />
      </Screen>
    );
  }

  const r = q.data.find((x) => x.id === id);
  if (!r) {
    return (
      <Screen>
        <ErrorState message="This request isn't available." />
      </Screen>
    );
  }
  const open = r.status !== 'COMPLETED' && r.status !== 'CANCELLED';

  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
      {justSent ? <Notice tone="success">Your request was sent to your landlord.</Notice> : null}
      {failedCount > 0 ? (
        <Notice tone="warning">
          {`${failedCount} photo${failedCount === 1 ? '' : 's'} didn't upload. You can add ${failedCount === 1 ? 'it' : 'them'} again below.`}
        </Notice>
      ) : null}
      <Card>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text variant="heading" style={{ flex: 1 }} accessibilityRole="header">
            {r.title}
          </Text>
          <MaintenanceStatusBadge status={r.status} />
        </Row>
        <PriorityBadge priority={r.priority} />
        {r.description ? <Text selectable>{r.description}</Text> : null}
        <KeyValue label="Category" value={r.category ? CATEGORY_LABEL[r.category] : '—'} />
        <KeyValue label="Reported" value={formatInstant(r.createdAt)} />
        {r.scheduledDate ? <KeyValue label="Scheduled for" value={formatLocalDate(r.scheduledDate)} /> : null}
        {r.completedAt ? <KeyValue label="Completed" value={formatInstant(r.completedAt)} /> : null}
      </Card>

      {r.notes ? (
        <Card>
          <Text muted variant="caption">Latest from your landlord</Text>
          <Text selectable>{r.notes}</Text>
        </Card>
      ) : null}

      <Card>
        <RepairPhotos experience="renter" requestId={r.id ?? ''} canAdd={open} />
      </Card>
    </Screen>
  );
}
