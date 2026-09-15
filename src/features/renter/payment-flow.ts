import type { ApiErrorKind } from '../../api/errors';
import type { RentPaymentRequest } from '../../api/types';

/**
 * The renter's M-Pesa payment as an explicit state machine. Pure, so every
 * transition is unit-tested without a device.
 *
 * The rule the whole machine exists to keep: the app NEVER says "paid"
 * because a button was tapped or a prompt was sent. Only the backend's
 * payment request reaching PAID — which happens when Safaricom's callback
 * is recorded in the ledger — produces the success state.
 *
 * And its twin: after a prompt MAY have been sent, the app never invites
 * the renter to "try again" until it knows the first attempt is over. An
 * uncertain outcome is shown as uncertain, with a way to check.
 */

export type PaymentState =
  | { tag: 'idle' }
  | { tag: 'sending' }
  /** Backend accepted the request and Safaricom is prompting the phone. */
  | { tag: 'awaiting'; requestId: string; startedAt: number; checks: number }
  | { tag: 'paid'; requestId: string; receipt: string | null; transactionId: string | null }
  | { tag: 'failed'; requestId: string }
  /** No answer from M-Pesa within the watch window. Outcome unknown. */
  | { tag: 'unconfirmed'; requestId: string }
  /** Initiation itself had an unknown outcome (timeout/network mid-request). */
  | { tag: 'uncertain_send'; at: number }
  /** Initiation definitively rejected by the backend (validation, conflict…). */
  | { tag: 'rejected'; kind: ApiErrorKind; message: string };

export type PaymentEvent =
  | { type: 'SEND' }
  | { type: 'SENT'; request: RentPaymentRequest; now: number }
  | { type: 'SEND_FAILED'; kind: ApiErrorKind; message: string; now: number }
  | { type: 'STATUS'; request: RentPaymentRequest; now: number }
  | { type: 'CHECK_FAILED' }
  | { type: 'RESUME'; requestId: string; startedAt: number }
  | { type: 'RESET' };

/** STK prompts expire on the handset after about a minute; allow for a slow callback. */
export const WATCH_WINDOW_MS = 2 * 60_000;
/**
 * After an uncertain send, the backend reuses any PENDING request for the
 * same rent entry for 3 minutes (ADR-0016), so a retry inside that window
 * cannot produce a second prompt. Still, the app asks the renter to check
 * their phone first and waits out the platform cooldown before enabling it.
 */
export const UNCERTAIN_RETRY_AFTER_MS = 30_000;

const UNKNOWN_OUTCOME: ApiErrorKind[] = ['timeout', 'network', 'offline', 'server', 'invalid_response'];

export function paymentReducer(state: PaymentState, event: PaymentEvent): PaymentState {
  switch (event.type) {
    case 'SEND':
      // Only from a state where no prompt can be in flight.
      // (uncertain_send is time-gated by canStartPayment before SEND is dispatched.)
      if (state.tag === 'idle' || state.tag === 'rejected' || state.tag === 'failed' || state.tag === 'uncertain_send') {
        return { tag: 'sending' };
      }
      return state;

    case 'SENT':
      if (state.tag !== 'sending') return state;
      return fromRequest(event.request, event.now, { tag: 'awaiting', requestId: event.request.id ?? '', startedAt: event.now, checks: 0 });

    case 'SEND_FAILED':
      if (state.tag !== 'sending') return state;
      if (UNKNOWN_OUTCOME.includes(event.kind)) {
        return { tag: 'uncertain_send', at: event.now };
      }
      return { tag: 'rejected', kind: event.kind, message: event.message };

    case 'STATUS': {
      if (state.tag !== 'awaiting' && state.tag !== 'unconfirmed') return state;
      if (event.request.id !== state.requestId) return state;
      const next = fromRequest(event.request, event.now, state.tag === 'awaiting'
        ? { ...state, checks: state.checks + 1 }
        : { tag: 'awaiting', requestId: state.requestId, startedAt: event.now - WATCH_WINDOW_MS, checks: 0 });
      if (next.tag === 'awaiting' && event.now - next.startedAt >= WATCH_WINDOW_MS) {
        return { tag: 'unconfirmed', requestId: next.requestId };
      }
      return next;
    }

    case 'CHECK_FAILED':
      // A failed status check says nothing about the payment. Stay put.
      return state;

    case 'RESUME':
      if (state.tag !== 'idle') return state;
      return { tag: 'awaiting', requestId: event.requestId, startedAt: event.startedAt, checks: 0 };

    case 'RESET':
      // Never allowed to erase an in-flight prompt.
      if (state.tag === 'sending' || state.tag === 'awaiting') return state;
      return { tag: 'idle' };
  }
}

function fromRequest(request: RentPaymentRequest, _now: number, pending: PaymentState): PaymentState {
  const id = request.id ?? '';
  switch (request.status) {
    case 'PAID':
      return { tag: 'paid', requestId: id, receipt: request.mpesaReceiptNumber ?? null, transactionId: request.transactionId ?? null };
    case 'FAILED':
      return { tag: 'failed', requestId: id };
    default:
      return pending;
  }
}

export function canStartPayment(state: PaymentState, now: number): boolean {
  if (state.tag === 'idle' || state.tag === 'rejected' || state.tag === 'failed') return true;
  if (state.tag === 'uncertain_send') return now - state.at >= UNCERTAIN_RETRY_AFTER_MS;
  return false;
}

/** Poll quickly at first (most prompts are answered in seconds), then back off. */
export function nextPollDelay(checks: number): number {
  if (checks < 6) return 3_000;
  if (checks < 12) return 5_000;
  return 10_000;
}
