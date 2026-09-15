import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, View } from 'react-native';

import { userMessage } from '../../src/api/errors';
import { canStartPayment, UNCERTAIN_RETRY_AFTER_MS, type PaymentState } from '../../src/features/renter/payment-flow';
import { useRenterDashboard, useRenterLease } from '../../src/features/renter/queries';
import { useRentPayment } from '../../src/features/renter/use-rent-payment';
import { formatMoney, isPositive, parseShillingInput } from '../../src/lib/money';
import { maskPhone, toE164 } from '../../src/lib/phone';
import { Button, Card, ErrorState, Field, KeyValue, LoadingState, Notice, Screen, Text } from '../../src/ui/primitives';
import { useTheme } from '../../src/ui/theme';

/**
 * Pay rent by M-Pesa STK push. Money settles into the LANDLORD's own
 * Till/Paybill (direct collection) — RentManager records the payment and
 * never holds it, so the copy says "to your landlord", not "to RentManager".
 */
export default function Pay() {
  const dashboard = useRenterDashboard();
  const lease = useRenterLease();
  const payment = useRentPayment();
  const t = useTheme();

  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<{ phone?: string; amount?: string }>({});
  const [now, setNow] = useState(Date.now());

  // Prefill once from the backend: the renter's phone and the whole-shilling balance.
  useEffect(() => {
    const d = dashboard.data;
    if (!d) return;
    if (!phone && d.tenantPhone) setPhone(d.tenantPhone);
    if (!amount && isPositive(d.currentBalance)) {
      const whole = String(d.currentBalance).split('.')[0];
      const hasCents = /\.\d*[1-9]/.test(String(d.currentBalance));
      // M-Pesa takes whole shillings; round UP so the balance is fully cleared.
      setAmount(hasCents ? String(BigInt(whole) + 1n) : whole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard.data]);

  // Tick for the uncertain-send cooldown.
  useEffect(() => {
    if (payment.state.tag !== 'uncertain_send') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [payment.state.tag]);

  function submit() {
    const nextErrors: typeof errors = {};
    const e164 = toE164(phone);
    if (!e164) nextErrors.phone = 'Enter an M-Pesa number, e.g. 0712 345 678 or 0112 345 678.';
    const parsed = parseShillingInput(amount);
    if (!parsed.ok) nextErrors.amount = parsed.reason;
    setErrors(nextErrors);
    if (!e164 || !parsed.ok) return;
    void payment.pay(parsed.value, e164);
  }

  if (dashboard.isPending) {
    return (
      <Screen>
        <LoadingState label="Loading your balance" />
      </Screen>
    );
  }
  if (dashboard.isError) {
    return (
      <Screen>
        <ErrorState message={userMessage(dashboard.error)} onRetry={() => void dashboard.refetch()} />
      </Screen>
    );
  }

  const d = dashboard.data;
  const busy = payment.state.tag === 'sending' || payment.state.tag === 'awaiting';
  const formLocked = busy || payment.state.tag === 'paid' || payment.state.tag === 'unconfirmed';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Text variant="title" accessibilityRole="header">
          Pay rent
        </Text>

        <Card>
          <KeyValue label="Balance" value={formatMoney(d.currentBalance)} />
          {isPositive(d.overdueAmount) ? <KeyValue label="Overdue" value={formatMoney(d.overdueAmount)} /> : null}
          <KeyValue label="Paid to" value={lease.data?.landlordName ?? 'Your landlord'} />
          <Text muted variant="caption">
            Payments go straight to your landlord's M-Pesa account. RentManager records them for you.
          </Text>
        </Card>

        {!formLocked ? (
          <Card>
            <Field
              label="M-Pesa number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              error={errors.phone}
              hint="You'll get a prompt on this phone to enter your M-Pesa PIN."
              editable={!busy}
            />
            <Field
              label="Amount (KSh)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              error={errors.amount}
              hint="Whole shillings. You can pay part of your balance."
              editable={!busy}
            />
            <Button
              label={amount && parseShillingInput(amount).ok ? `Pay ${formatMoney(parseShillingInput(amount).ok ? amount : '0')}` : 'Pay'}
              onPress={submit}
              disabled={!canStartPayment(payment.state, now)}
              accessibilityHint="Sends an M-Pesa prompt to your phone"
            />
          </Card>
        ) : null}

        <PaymentStatus state={payment.state} phone={phone} now={now} onRecheck={payment.recheck} onDone={() => {
          payment.reset();
          router.replace('/(renter)');
        }} onTryAgain={payment.reset} />

        {busy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space(2) }}>
            <ActivityIndicator color={t.color.primary} />
            <Text muted>Don't close the app until this finishes.</Text>
          </View>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function PaymentStatus({
  state,
  phone,
  now,
  onRecheck,
  onDone,
  onTryAgain,
}: {
  state: PaymentState;
  phone: string;
  now: number;
  onRecheck: () => void;
  onDone: () => void;
  onTryAgain: () => void;
}) {
  switch (state.tag) {
    case 'idle':
      return null;
    case 'sending':
      return <Notice tone="info">Sending the M-Pesa prompt…</Notice>;
    case 'awaiting':
      return (
        <Card>
          <Text variant="heading" accessibilityLiveRegion="polite">
            Check your phone
          </Text>
          <Text>{`Enter your M-Pesa PIN on the prompt sent to ${maskPhone(phone)}.`}</Text>
          <Text muted>We'll confirm here as soon as M-Pesa tells us. This usually takes a few seconds.</Text>
        </Card>
      );
    case 'paid':
      return (
        <Card>
          <Text variant="heading" tone="success" accessibilityLiveRegion="polite">
            Payment received
          </Text>
          {state.receipt ? <KeyValue label="M-Pesa receipt" value={state.receipt} /> : null}
          <Text muted>Your balance has been updated.</Text>
          <Button label="Done" onPress={onDone} />
        </Card>
      );
    case 'failed':
      return (
        <Card>
          <Text variant="heading" tone="danger" accessibilityLiveRegion="polite">
            Payment not completed
          </Text>
          <Text muted>M-Pesa reported that this payment didn't complete — the prompt may have been cancelled, timed out, or the PIN was wrong.</Text>
          <Button label="Try again" onPress={onTryAgain} />
        </Card>
      );
    case 'unconfirmed':
      return (
        <Card>
          <Text variant="heading" tone="warning">
            Waiting for M-Pesa
          </Text>
          <Text>
            We haven't had a confirmation yet. Please don't pay again. Check your M-Pesa messages — if money left your
            account, it will appear here once M-Pesa confirms it.
          </Text>
          <Button label="Check again" kind="secondary" onPress={onRecheck} />
        </Card>
      );
    case 'uncertain_send': {
      const wait = Math.max(0, Math.ceil((UNCERTAIN_RETRY_AFTER_MS - (now - state.at)) / 1000));
      return (
        <Notice tone="warning">
          {`We lost the connection while sending your prompt, so we can't tell whether it arrived. Check your phone for an M-Pesa prompt before trying again.${
            wait > 0 ? ` You can try again in ${wait}s.` : ''
          }`}
        </Notice>
      );
    }
    case 'rejected':
      return <Notice tone="danger">{state.message}</Notice>;
  }
}
