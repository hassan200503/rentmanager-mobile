import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';

import { ApiError, userMessage } from '../../../src/api/errors';
import type { MaintenanceStatus } from '../../../src/api/types';
import { CATEGORY_LABEL, MaintenanceStatusBadge, PriorityBadge, STATUS_LABEL } from '../../../src/components/maintenance-badges';
import { can, useAccess } from '../../../src/features/access/use-access';
import { useMaintenanceDetail, useUpdateMaintenanceStatus } from '../../../src/features/landlord/queries';
import { formatInstant, formatLocalDate } from '../../../src/lib/dates';
import { RepairPhotos } from '../../../src/components/repair-photos';
import { Button, Card, ChoiceChips, ErrorState, Field, KeyValue, LoadingState, Notice, Row, Screen, Text } from '../../../src/ui/primitives';

/**
 * Review and respond. The reply ("note") travels to the renter with the
 * status change by SMS and by push — so the copy asks the landlord to write
 * something a renter can act on.
 *
 * The statuses offered are exactly the backend's allowedNextStatuses for this
 * request (TD-132); the backend re-checks on submit and its refusal is shown
 * if the request moved on in the meantime. A 404 means the request is gone or
 * belongs to another organisation — the screen shows nothing else.
 */

export default function MaintenanceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useMaintenanceDetail(id ?? '');
  const access = useAccess();
  const update = useUpdateMaintenanceStatus(id ?? '');
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  if (q.isPending) {
    return (
      <Screen edges={['left', 'right']}>
        <LoadingState />
      </Screen>
    );
  }
  if (q.isError) {
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState
          message={
            q.error instanceof ApiError && (q.error.kind === 'not_found' || q.error.kind === 'forbidden')
              ? "This request isn't available."
              : userMessage(q.error)
          }
          onRetry={() => void q.refetch()}
        />
      </Screen>
    );
  }

  const r = q.data;
  const current = r.status ?? 'SUBMITTED';
  // Cancelling is kept off the phone: it closes the request for the renter
  // without an answer, which deserves the fuller context of the web view.
  const options = (r.allowedNextStatuses ?? []).filter((s) => s !== 'CANCELLED');
  const allowed = can.updateMaintenance(access.data?.landlordRole);

  function send() {
    if (update.isPending) return;
    const target = status ?? current;
    if (target === current && !note.trim()) return;
    const go = () =>
      update.mutate(
        { status: target, note: note.trim() || undefined },
        {
          onSuccess: () => {
            setSent(true);
            setNote('');
            setStatus(null);
          },
        },
      );
    if (target === 'COMPLETED') {
      Alert.alert('Mark as completed?', 'The renter will be told the repair is done.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark completed', onPress: go },
      ]);
    } else {
      go();
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <Screen edges={['left', 'right']} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}>
        <Card>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text variant="heading" style={{ flex: 1 }}>
              {r.title}
            </Text>
            <PriorityBadge priority={r.priority} />
          </Row>
          <MaintenanceStatusBadge status={r.status} />
          {r.description ? <Text selectable>{r.description}</Text> : <Text muted>No details given.</Text>}
          <KeyValue label="Where" value={[r.propertyName, r.unitNumber].filter(Boolean).join(' · ') || '—'} />
          <KeyValue label="Reported by" value={r.renterName ?? r.createdBy ?? '—'} />
          <KeyValue label="Category" value={r.category ? CATEGORY_LABEL[r.category] : '—'} />
          <KeyValue label="Reported" value={formatInstant(r.createdAt)} />
          {r.scheduledDate ? <KeyValue label="Scheduled" value={formatLocalDate(r.scheduledDate)} /> : null}
          {r.assignedTo ? <KeyValue label="Assigned to" value={r.assignedTo} /> : null}
          {r.notes ? (
            <>
              <Text muted variant="caption">
                Last reply to renter
              </Text>
              <Text>{r.notes}</Text>
            </>
          ) : null}
        </Card>

        <Card>
          <RepairPhotos experience="landlord" requestId={r.id ?? ''} canAdd={allowed && current !== 'CANCELLED'} />
        </Card>

        {allowed && current !== 'CANCELLED' ? (
          <Card>
            <Text variant="heading">Respond</Text>
            {options.length ? (
              <ChoiceChips
                label="Move to (optional)"
                value={status}
                onChange={(v) => setStatus(v === status ? null : v)}
                options={options.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
              />
            ) : null}
            <Field
              label="Message to the renter"
              value={note}
              onChangeText={setNote}
              placeholder="e.g. A plumber is coming Thursday morning"
              multiline
              numberOfLines={3}
              style={{ minHeight: 88, textAlignVertical: 'top' }}
              maxLength={500}
              hint="Sent to the renter with the update."
            />
            {update.isError ? <Notice tone="danger">{userMessage(update.error)}</Notice> : null}
            {sent && !update.isPending ? <Notice tone="success">Update sent.</Notice> : null}
            <Button
              label={status ? `Update to ${STATUS_LABEL[status]}` : 'Send reply'}
              onPress={send}
              loading={update.isPending}
              disabled={!status && !note.trim()}
            />
          </Card>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
