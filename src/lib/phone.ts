/**
 * Kenyan mobile numbers for M-Pesa prompts. Mirrors the backend rule
 * (`KenyanMsisdn`): both the 07XX and the newer 01XX ranges are valid.
 * The backend re-validates; this only saves a round trip and gives a clear
 * message before anyone taps Pay.
 */

const MOBILE_NATIONAL = /^(?:7\d{8}|1[01]\d{7})$/;

/** Normalises to +254XXXXXXXXX, or returns null when not a Kenyan mobile. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  let national: string | null = null;
  if (digits.length === 9) national = digits;
  else if (digits.length === 10 && digits.startsWith('0')) national = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith('254')) national = digits.slice(3);
  return national && MOBILE_NATIONAL.test(national) ? `+254${national}` : null;
}

/** "+254 712 345 678" for display. Falls back to the input. */
export function formatPhone(raw: string | null | undefined): string {
  const e164 = toE164(raw);
  if (!e164) return raw ?? '—';
  const n = e164.slice(4);
  return `+254 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}

/** Masks all but the last three digits, for confirmations on shared screens. */
export function maskPhone(raw: string | null | undefined): string {
  const e164 = toE164(raw);
  if (!e164) return '—';
  return `+254 ••• ••${e164.slice(-4, -3)} ${e164.slice(-3)}`;
}
