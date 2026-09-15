import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { ApiError, userMessage } from '../../../src/api/errors';
import type { LeaseAction, LeaseActionRequest } from '../../../src/api/types';
import { LeaseStatusBadge } from '../../../src/components/lease-badges';
import { can, useAccess } from '../../../src/features/access/use-access';
import {
  useLease,
  useLeaseAction,
  useLeaseLedger,
  useRecordCashPayment,
  type LedgerEntry,
} from '../../../src/features/landlord/queries';
import { formatLocalDate } from '../../../src/lib/dates';
import { newIdempotencyKey } from '../../../src/lib/idempotency';
import { compareDecimal, formatMoney, isPositive, parseAmountInput } from '../../../src/lib/money';
import { formatPhone, toE164 } from '../../../src/lib/phone';
import {
  Badge,
  Button,
  Card,
  ChoiceChips,
  ErrorState,
  Field,
  KeyValue,
  LoadingState,
  Notice,
  Row,
  Screen,
  SectionTitle,
  Sheet,
  Text,
} from '../../../src/ui/primitives';
import { useTheme } from '../../../src/ui/theme';

/**
 * Lease detail for someone on site: who lives here, how to reach them, what
 * they owe, and — for owners and managers — the lease actions the backend says
 * are valid right now (allowedActions). The app never decides which
 * transitions exist; it renders what the backend offers and shows the
 * backend's refusal if the lease changed in the meantime.
 */

type TerminationType = NonNullable<LeaseActionRequest['terminationType']>;

const ACTION_COPY: Record<LeaseAction, { label: string; confirm: string; destructive?: boolean }> = {
  APPROVE: { label: 'Approve', confirm: 'Approve this lease? It moves on to deposit collection.' },
  AWAITING_DEPOSIT: { label: 'Request deposit', confirm: 'Mark this lease as waiting for the deposit?' },
  ACTIVATE: {
    label: 'Activate',
    confirm: 'Activate this lease? The renter moves in and rent starts being charged. The deposit must already be recorded.',
  },
  REJECT: { label: 'Reject', confirm: 'Reject this lease application?', destructive: true },
  CANCEL: { label: 'Cancel lease', confirm: 'Cancel this lease before it starts?', destructive: true },
  TERMINATE: { label: 'End tenancy', confirm: 'End this tenancy? Rent stops being charged.', destructive: true },
  RENEW: { label: 'Renew', confirm: 'Renew this lease for another 12 months?' },
  EXPIRE: { label: 'Expire', confirm: 'Expire this lease?' },
};

const TERMINATION_OPTIONS: { value: TerminationType; label: string }[] = [
  { value: 'TENANT_REQUEST', label: 'Renter asked' },
  { value: 'MUTUAL_AGREEMENT', label: 'Mutual agreement' },
  { value: 'LANDLORD_REQUEST', label: 'Landlord decision' },
  { value: 'NON_PAYMENT', label: 'Non-payment' },
  { value: 'BREACH_OF_CONTRACT', label: 'Breach of contract' },
];

export default function LeaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lease = useLease(id ?? '');
  const ledger = useLeaseLedger(id ?? '');
  const access = useAccess();
  const t = useTheme();
  const [pendingAction, setPendingAction] = useState<LeaseAction | null>(null);
  const [payingEntry, setPayingEntry] = useState<LedgerEntry | null>(null);

  if (lease.isPending) {
    return (
      <Screen edges={['left', 'right']}>
        <LoadingState />
      </Screen>
    );
  }
  if (lease.isError) {
    const gone = lease.error instanceof ApiError && (lease.error.kind === 'not_found' || lease.error.kind === 'forbidden');
    return (
      <Screen edges={['left', 'right']}>
        <ErrorState message={gone ? "This lease isn't available." : userMessage(lease.error)} onRetry={gone ? undefined : () => void lease.refetch()} />
      </Screen>
    );
  }

  const l = lease.data;
  const role = access.data?.landlordRole;
  const phone = toE164(l.tenantPhone);
  const actions = (l.allowedActions ?? []).filter((a) => a !== 'EXPIRE');
  const canAct = can.changeLeaseState(role);
  const owing = (ledger.data ?? []).filter((e) => isPositive(e.balanceOwed));
  const recent = [...(ledger.data ?? [])].sort((a, b) => String(b.dueDate).localeCompare(String(a.dueDate))).slice(0, 6);

  return (
    <Screen
      edges={['left', 'right']}
      refreshing={lease.isRefetching || ledger.isRefetching}
      onRefresh={() => {
        void lease.refetch();
        void ledger.refetch();
      }}
    >
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="heading" style={{ flex: 1 }}>
            {l.tenantFullName ?? 'Renter'}
          </Text>
          <LeaseStatusBadge status={l.status} />
        </Row>
        <Text muted>{l.leaseNumber}</Text>
        {phone ? (
          <Row>
            <Button label={`Call ${formatPhone(phone)}`} kind="secondary" onPress={() => void Linking.openURL(`tel:${phone}`)} style={{ flex: 1 }} />
            <Button label="SMS" kind="ghost" onPress={() => void Linking.openURL(`sms:${phone}`)} />
          </Row>
        ) : (
          <Text muted>No phone number on file.</Text>
        )}
      </Card>

      <Card>
        <KeyValue label="Rent" value={`${formatMoney(l.rentAmount)} · ${l.billingCycle?.toLowerCase() ?? ''}`} />
        <KeyValue label="Deposit" value={formatMoney(l.securityDeposit)} />
        <KeyValue label="Starts" value={formatLocalDate(l.startDate)} />
        <KeyValue label="Ends" value={l.endDate ? formatLocalDate(l.endDate) : 'No fixed end'} />
        {l.gracePeriodDays ? <KeyValue label="Grace period" value={`${l.gracePeriodDays} days`} /> : null}
        {l.terminationReason ? <KeyValue label="Reason ended" value={l.terminationReason} /> : null}
      </Card>

      {canAct && actions.length > 0 ? (
        <>
          <SectionTitle>Lease actions</SectionTitle>
          <Card>
            {actions.map((action) => (
              <Button
                key={action}
                label={ACTION_COPY[action].label}
                kind={ACTION_COPY[action].destructive ? 'secondary' : 'primary'}
                onPress={() => setPendingAction(action)}
              />
            ))}
          </Card>
        </>
      ) : null}

      <SectionTitle>Rent account</SectionTitle>
      {ledger.isPending ? (
        <LoadingState label="Loading rent account" />
      ) : ledger.isError ? (
        <ErrorState message={userMessage(ledger.error)} onRetry={() => void ledger.refetch()} />
      ) : recent.length === 0 ? (
        <Card>
          <Text muted>No rent has been charged on this lease yet.</Text>
        </Card>
      ) : (
        <View style={{ gap: t.space(2) }}>
          {owing.length === 0 ? (
            <Card>
              <Badge label="Nothing owed" tone="success" />
            </Card>
          ) : null}
          {recent.map((e) => (
            <Card key={e.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="bodyStrong">{`${formatLocalDate(e.billingPeriodStart)} – ${formatLocalDate(e.billingPeriodEnd)}`}</Text>
                <Badge
                  label={String(e.status ?? '').replace(/_/g, ' ').toLowerCase()}
                  tone={e.status === 'PAID' || e.status === 'OVERPAID' ? 'success' : e.status === 'OVERDUE' ? 'danger' : 'warning'}
                />
              </Row>
              <KeyValue label="Due" value={`${formatMoney(e.amountDue)} by ${formatLocalDate(e.dueDate)}`} />
              <KeyValue label="Paid" value={formatMoney(e.amountPaid)} />
              {isPositive(e.balanceOwed) ? (
                <>
                  <KeyValue label="Still owed" value={formatMoney(e.balanceOwed)} />
                  {can.viewLedger(role) ? (
                    <Button label="Record cash payment" kind="secondary" onPress={() => setPayingEntry(e)} />
                  ) : null}
                </>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      {pendingAction ? (
        <LeaseActionSheet
          leaseId={l.id ?? ''}
          action={pendingAction}
          currentEnd={l.endDate}
          onClose={() => setPendingAction(null)}
        />
      ) : null}

      {payingEntry ? <CashPaymentSheet leaseId={l.id ?? ''} entry={payingEntry} onClose={() => setPayingEntry(null)} /> : null}
    </Screen>
  );
}

function addDays(localDate: string, days: number): string {
  const [y, m, d] = localDate.split('-').map((n) => parseInt(n, 10));
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function todayInNairobi(): string {
  return new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
}

function LeaseActionSheet({
  leaseId,
  action,
  currentEnd,
  onClose,
}: {
  leaseId: string;
  action: LeaseAction;
  currentEnd?: string;
  onClose: () => void;
}) {
  const mutation = useLeaseAction(leaseId);
  const [reason, setReason] = useState('');
  const [terminationType, setTerminationType] = useState<TerminationType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = ACTION_COPY[action];

  const needsReason = action === 'REJECT' || action === 'CANCEL' || action === 'TERMINATE';
  const renewStart = currentEnd ? addDays(currentEnd, 1) : todayInNairobi();

  function submit() {
    if (mutation.isPending) return;
    if (needsReason && reason.trim().length < 3) {
      setError('Give a short reason — it is kept on the lease record.');
      return;
    }
    if (action === 'TERMINATE' && !terminationType) {
      setError('Choose why the tenancy is ending.');
      return;
    }
    setError(null);
    mutation.mutate(
      {
        action,
        reason: needsReason ? reason.trim() : undefined,
        terminationType: action === 'TERMINATE' ? (terminationType ?? undefined) : undefined,
        actionDate: action === 'RENEW' ? renewStart : action === 'ACTIVATE' ? todayInNairobi() : undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Sheet visible title={copy.label} onClose={onClose} busy={mutation.isPending}>
      <Text>{copy.confirm}</Text>
      {action === 'RENEW' ? (
        <Notice tone="info">{`The renewed term starts ${formatLocalDate(renewStart)} and runs for 12 months.`}</Notice>
      ) : null}
      {action === 'TERMINATE' ? (
        <ChoiceChips label="Why is it ending?" value={terminationType} onChange={setTerminationType} options={TERMINATION_OPTIONS} />
      ) : null}
      {needsReason ? (
        <Field
          label="Reason"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
          maxLength={500}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
      ) : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {mutation.isError ? <Notice tone="danger">{userMessage(mutation.error)}</Notice> : null}
      <Button label={copy.label} kind={copy.destructive ? 'danger' : 'primary'} onPress={submit} loading={mutation.isPending} />
    </Sheet>
  );
}

function CashPaymentSheet({ leaseId, entry, onClose }: { leaseId: string; entry: LedgerEntry; onClose: () => void }) {
  const mutation = useRecordCashPayment(leaseId);
  // One key for this whole submission, reused if the person taps again after a
  // failure or timeout: the backend then records the cash at most once.
  const [idempotencyKey] = useState(() => newIdempotencyKey('cash'));
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmOverpay, setConfirmOverpay] = useState(false);

  function submit() {
    if (mutation.isPending) return;
    const parsed = parseAmountInput(amount);
    if (!parsed.ok) {
      setError(parsed.reason);
      return;
    }
    const owed = String(entry.balanceOwed ?? '0');
    if (compareDecimal(parsed.value, owed) > 0 && !confirmOverpay) {
      setConfirmOverpay(true);
      setError(`That is more than the ${formatMoney(owed)} still owed. Tap Record again to record it anyway — the extra is held as an overpayment.`);
      return;
    }
    setError(null);
    mutation.mutate(
      { entryId: entry.id ?? '', amount: parsed.value, reference, idempotencyKey },
      { onSuccess: onClose },
    );
  }

  return (
    <Sheet visible title="Record cash payment" onClose={onClose} busy={mutation.isPending}>
      <KeyValue label="Period" value={`${formatLocalDate(entry.billingPeriodStart)} – ${formatLocalDate(entry.billingPeriodEnd)}`} />
      <KeyValue label="Still owed" value={formatMoney(entry.balanceOwed)} />
      <Field
        label="Amount received (KSh)"
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          setConfirmOverpay(false);
        }}
        keyboardType="decimal-pad"
        autoFocus
      />
      <Field
        label="Receipt or note (optional)"
        value={reference}
        onChangeText={setReference}
        maxLength={100}
        hint="A receipt book number helps match this later."
      />
      <Text muted variant="caption">Only record money you have actually received. This entry is permanent — a mistake is corrected with a reversal on the web.</Text>
      {error ? <Notice tone="warning">{error}</Notice> : null}
      {mutation.isError ? <Notice tone="danger">{userMessage(mutation.error)}</Notice> : null}
      <Button label="Record" onPress={submit} loading={mutation.isPending} />
    </Sheet>
  );
}
