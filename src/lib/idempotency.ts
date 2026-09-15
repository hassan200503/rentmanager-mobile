import * as Crypto from 'expo-crypto';

/**
 * One key per logical submission (a single "Record payment" intent), reused
 * for every retry of that same submission. The backend stores it with the
 * transaction (V98) and refuses a second insert with the same key, so a
 * double tap, or a retry after a timeout whose first request actually
 * succeeded, cannot record the same cash twice.
 *
 * Create a new key only when the person starts a NEW submission.
 */
export function newIdempotencyKey(prefix = 'mobile'): string {
  return `${prefix}-${Crypto.randomUUID()}`;
}
