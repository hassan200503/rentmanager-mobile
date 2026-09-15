import type { RentPaymentRequest } from '../../../api/types';
import {
  canStartPayment,
  nextPollDelay,
  paymentReducer,
  UNCERTAIN_RETRY_AFTER_MS,
  WATCH_WINDOW_MS,
  type PaymentState,
} from '../payment-flow';

const req = (status: 'PENDING' | 'PAID' | 'FAILED', extra: Partial<RentPaymentRequest> = {}): RentPaymentRequest =>
  ({ id: 'req-1', status, amount: '15000', ...extra }) as RentPaymentRequest;

const idle: PaymentState = { tag: 'idle' };

describe('payment state machine', () => {
  it('never reports paid just because the prompt was sent', () => {
    const sending = paymentReducer(idle, { type: 'SEND' });
    const afterSend = paymentReducer(sending, { type: 'SENT', request: req('PENDING'), now: 1000 });
    expect(afterSend.tag).toBe('awaiting');
  });

  it('reports paid only when the backend request is PAID, with the receipt', () => {
    let s = paymentReducer(paymentReducer(idle, { type: 'SEND' }), { type: 'SENT', request: req('PENDING'), now: 0 });
    s = paymentReducer(s, { type: 'STATUS', request: req('PAID', { mpesaReceiptNumber: 'QAB123', transactionId: 'tx-9' }), now: 5000 });
    expect(s).toEqual({ tag: 'paid', requestId: 'req-1', receipt: 'QAB123', transactionId: 'tx-9' });
  });

  it('moves to failed when M-Pesa reports failure', () => {
    let s = paymentReducer(paymentReducer(idle, { type: 'SEND' }), { type: 'SENT', request: req('PENDING'), now: 0 });
    s = paymentReducer(s, { type: 'STATUS', request: req('FAILED'), now: 3000 });
    expect(s.tag).toBe('failed');
  });

  it('becomes unconfirmed, not failed, when nothing arrives in the watch window', () => {
    let s = paymentReducer(paymentReducer(idle, { type: 'SEND' }), { type: 'SENT', request: req('PENDING'), now: 0 });
    s = paymentReducer(s, { type: 'STATUS', request: req('PENDING'), now: WATCH_WINDOW_MS + 1 });
    expect(s).toEqual({ tag: 'unconfirmed', requestId: 'req-1' });
    expect(canStartPayment(s, WATCH_WINDOW_MS + 2)).toBe(false);
  });

  it('a late PAID still resolves an unconfirmed payment', () => {
    const s = paymentReducer({ tag: 'unconfirmed', requestId: 'req-1' }, { type: 'STATUS', request: req('PAID'), now: 999_999 });
    expect(s.tag).toBe('paid');
  });

  it('ignores status for a different request id', () => {
    const awaiting: PaymentState = { tag: 'awaiting', requestId: 'req-1', startedAt: 0, checks: 0 };
    expect(paymentReducer(awaiting, { type: 'STATUS', request: req('PAID', { id: 'other' }), now: 10 })).toBe(awaiting);
  });

  it('a failed status CHECK changes nothing about the payment', () => {
    const awaiting: PaymentState = { tag: 'awaiting', requestId: 'req-1', startedAt: 0, checks: 2 };
    expect(paymentReducer(awaiting, { type: 'CHECK_FAILED' })).toBe(awaiting);
  });

  it.each(['timeout', 'network', 'offline', 'server'] as const)(
    'treats a %s during initiation as an uncertain send, not a rejection',
    (kind) => {
      const s = paymentReducer({ tag: 'sending' }, { type: 'SEND_FAILED', kind, message: 'x', now: 100 });
      expect(s.tag).toBe('uncertain_send');
      expect(canStartPayment(s, 100 + UNCERTAIN_RETRY_AFTER_MS - 1)).toBe(false);
      expect(canStartPayment(s, 100 + UNCERTAIN_RETRY_AFTER_MS)).toBe(true);
    },
  );

  it('treats validation and conflict as a definite rejection that can be retried', () => {
    const s = paymentReducer({ tag: 'sending' }, { type: 'SEND_FAILED', kind: 'validation', message: 'Bad number', now: 1 });
    expect(s).toEqual({ tag: 'rejected', kind: 'validation', message: 'Bad number' });
    expect(canStartPayment(s, 2)).toBe(true);
  });

  it('blocks a second SEND while a prompt is in flight (double tap)', () => {
    const sending = paymentReducer(idle, { type: 'SEND' });
    expect(paymentReducer(sending, { type: 'SEND' })).toBe(sending);
    const awaiting: PaymentState = { tag: 'awaiting', requestId: 'r', startedAt: 0, checks: 0 };
    expect(paymentReducer(awaiting, { type: 'SEND' })).toBe(awaiting);
    expect(canStartPayment(awaiting, 1)).toBe(false);
  });

  it('RESET cannot erase an in-flight prompt', () => {
    const awaiting: PaymentState = { tag: 'awaiting', requestId: 'r', startedAt: 0, checks: 0 };
    expect(paymentReducer(awaiting, { type: 'RESET' })).toBe(awaiting);
    expect(paymentReducer({ tag: 'paid', requestId: 'r', receipt: null, transactionId: null }, { type: 'RESET' })).toEqual(idle);
  });

  it('resumes watching a request after the app was killed', () => {
    const s = paymentReducer(idle, { type: 'RESUME', requestId: 'req-7', startedAt: 42 });
    expect(s).toEqual({ tag: 'awaiting', requestId: 'req-7', startedAt: 42, checks: 0 });
  });

  it('backs off polling', () => {
    expect(nextPollDelay(0)).toBe(3000);
    expect(nextPollDelay(8)).toBe(5000);
    expect(nextPollDelay(20)).toBe(10000);
  });
});
