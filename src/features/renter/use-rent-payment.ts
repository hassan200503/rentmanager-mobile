import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';

import { ApiError, userMessage } from '../../api/errors';
import type { RentPaymentRequest } from '../../api/types';
import { useSession } from '../../auth/session';
import { track } from '../../observability/analytics';
import { canStartPayment, nextPollDelay, paymentReducer, WATCH_WINDOW_MS, type PaymentState } from './payment-flow';
import { renterKeys } from './queries';

/**
 * Drives the payment state machine against the real backend.
 *
 * The in-flight request id is persisted (SecureStore, scoped to the session)
 * so that if the OS kills the app while the renter is typing their M-Pesa PIN
 * — common on low-memory Android phones, because the STK dialog takes the
 * foreground — reopening the app resumes watching the same request instead
 * of offering a second payment.
 */

const PENDING_KEY = 'rm.pendingRentPayment';

interface PendingRecord {
  scope: string;
  requestId: string;
  startedAt: number;
}

export function useRentPayment() {
  const { api, scope } = useSession();
  const qc = useQueryClient();
  const [state, dispatch] = useReducer(paymentReducer, { tag: 'idle' } as PaymentState);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resume a payment the app was killed during.
  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(PENDING_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const record = JSON.parse(raw) as PendingRecord;
        if (record.scope === scope && Date.now() - record.startedAt < 10 * 60_000) {
          dispatch({ type: 'RESUME', requestId: record.requestId, startedAt: record.startedAt });
        } else {
          void SecureStore.deleteItemAsync(PENDING_KEY);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const checkStatus = useCallback(
    async (requestId: string) => {
      try {
        const request = await api.get<RentPaymentRequest>(
          `/tenant-portal/rent-payment-requests/${encodeURIComponent(requestId)}/status`,
        );
        dispatch({ type: 'STATUS', request, now: Date.now() });
      } catch {
        dispatch({ type: 'CHECK_FAILED' });
      }
    },
    [api],
  );

  // Poll while awaiting; stop in every other state.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (state.tag !== 'awaiting') return;
    timer.current = setTimeout(() => void checkStatus(state.requestId), nextPollDelay(state.checks));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, checkStatus]);

  // The renter usually returns from the M-Pesa dialog; check immediately.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && (state.tag === 'awaiting' || state.tag === 'unconfirmed')) {
        void checkStatus(state.requestId);
      }
    });
    return () => sub.remove();
  }, [state, checkStatus]);

  // Settle side effects once the backend has an answer.
  useEffect(() => {
    if (state.tag === 'paid' || state.tag === 'failed') {
      void SecureStore.deleteItemAsync(PENDING_KEY);
      void qc.invalidateQueries({ queryKey: renterKeys.all(scope) });
      track(state.tag === 'paid' ? 'payment_completed' : 'payment_failed');
    }
  }, [state.tag, qc, scope]);

  const pay = useCallback(
    async (amount: string, mpesaPhone: string) => {
      if (!canStartPayment(state, Date.now())) return;
      dispatch({ type: 'SEND' });
      track('payment_started');
      try {
        const request = await api.post<RentPaymentRequest>(
          '/tenant-portal/rent-payments/initiate',
          { amount, mpesaPhone },
          // A slow Daraja token fetch plus STK call can exceed the default.
          { timeoutMs: 30_000 },
        );
        const now = Date.now();
        if (request.id) {
          const record: PendingRecord = { scope, requestId: request.id, startedAt: now };
          void SecureStore.setItemAsync(PENDING_KEY, JSON.stringify(record));
        }
        dispatch({ type: 'SENT', request, now });
      } catch (err) {
        const e = err instanceof ApiError ? err : new ApiError({ kind: 'network', status: 0, message: '' });
        dispatch({
          type: 'SEND_FAILED',
          kind: e.kind,
          message: userMessage(e, "We couldn't start the payment. Please try again."),
          now: Date.now(),
        });
      }
    },
    [api, scope, state],
  );

  const recheck = useCallback(() => {
    if (state.tag === 'awaiting' || state.tag === 'unconfirmed') void checkStatus(state.requestId);
  }, [state, checkStatus]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return { state, pay, recheck, reset, watchWindowMs: WATCH_WINDOW_MS };
}
