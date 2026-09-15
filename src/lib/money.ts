/**
 * Money arrives from the backend as a decimal STRING (JacksonConfig serialises
 * every BigDecimal that way). The app never does business arithmetic on it:
 * totals, balances and amounts owed are the backend's to compute. This module
 * only validates and formats for display.
 *
 * Formatting is done on the string itself — splitting integer and fraction
 * digits — so a value like "1234567.89" is displayed exactly, with no trip
 * through a floating-point number.
 */

export type DecimalString = string;

const DECIMAL = /^-?\d+(\.\d+)?$/;

export function isDecimal(value: unknown): value is DecimalString {
  return typeof value === 'string' && DECIMAL.test(value.trim());
}

/**
 * Accepts the string the backend sends. Also tolerates a JSON number, which
 * older backend builds could still emit for a field, but formats it via its
 * exact string form rather than rounding it.
 */
export function formatMoney(value: string | number | null | undefined, currency = 'KES'): string {
  if (value === null || value === undefined) return '—';
  const raw = typeof value === 'number' ? (Number.isFinite(value) ? String(value) : '') : value.trim();
  if (!DECIMAL.test(raw)) return '—';

  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [intPartRaw, fracRaw = ''] = unsigned.split('.');
  const intPart = intPartRaw.replace(/^0+(?=\d)/, '');

  // Round half-up to 2dp using digits only.
  let frac = (fracRaw + '000').slice(0, 3);
  let cents = parseInt(frac.slice(0, 2), 10);
  let whole = intPart;
  if (parseInt(frac[2], 10) >= 5) {
    cents += 1;
    if (cents === 100) {
      cents = 0;
      whole = incrementDigits(whole);
    }
  }
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const centsText = String(cents).padStart(2, '0');
  const body = centsText === '00' ? grouped : `${grouped}.${centsText}`;
  const isZero = /^0+$/.test(whole) && cents === 0;
  return `${negative && !isZero ? '-' : ''}${currency === 'KES' ? 'KSh' : currency} ${body}`;
}

function incrementDigits(digits: string): string {
  const arr = digits.split('');
  let i = arr.length - 1;
  while (i >= 0) {
    if (arr[i] === '9') {
      arr[i] = '0';
      i -= 1;
    } else {
      arr[i] = String(parseInt(arr[i], 10) + 1);
      return arr.join('');
    }
  }
  return `1${arr.join('')}`;
}

/** True when the backend-provided amount is strictly greater than zero. */
export function isPositive(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  const raw = String(value).trim();
  if (!DECIMAL.test(raw) || raw.startsWith('-')) return false;
  return /[1-9]/.test(raw);
}

/**
 * Validates a user-typed amount for an M-Pesa payment and normalises it to a
 * decimal string. M-Pesa STK push accepts whole shillings only.
 * The backend re-validates; this only saves a round trip.
 */
export function parseShillingInput(input: string): { ok: true; value: DecimalString } | { ok: false; reason: string } {
  const cleaned = input.replace(/[,\s]/g, '');
  if (!/^\d+$/.test(cleaned)) {
    return { ok: false, reason: 'Enter a whole amount in shillings.' };
  }
  const normalised = cleaned.replace(/^0+(?=\d)/, '');
  if (normalised === '0') {
    return { ok: false, reason: 'Enter an amount greater than zero.' };
  }
  if (normalised.length > 7) {
    return { ok: false, reason: 'That amount is too large for a single M-Pesa payment.' };
  }
  return { ok: true, value: normalised };
}

/**
 * Validates a typed cash amount (shillings with up to 2 decimal places) and
 * returns the decimal string sent to the backend. No float conversion.
 */
export function parseAmountInput(input: string): { ok: true; value: DecimalString } | { ok: false; reason: string } {
  const cleaned = input.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { ok: false, reason: 'Enter an amount like 15000 or 15000.50.' };
  }
  const [whole, frac] = cleaned.split('.');
  const normalisedWhole = whole.replace(/^0+(?=\d)/, '');
  if (!/[1-9]/.test(normalisedWhole + (frac ?? ''))) {
    return { ok: false, reason: 'Enter an amount greater than zero.' };
  }
  if (normalisedWhole.length > 9) {
    return { ok: false, reason: 'That amount is too large.' };
  }
  return { ok: true, value: frac ? `${normalisedWhole}.${frac}` : normalisedWhole };
}

/** Compares two non-negative decimal strings exactly: -1, 0 or 1. */
export function compareDecimal(a: string, b: string): number {
  const [aw, af = ''] = a.trim().split('.');
  const [bw, bf = ''] = b.trim().split('.');
  const aWhole = aw.replace(/^0+(?=\d)/, '');
  const bWhole = bw.replace(/^0+(?=\d)/, '');
  if (aWhole.length !== bWhole.length) return aWhole.length > bWhole.length ? 1 : -1;
  if (aWhole !== bWhole) return aWhole > bWhole ? 1 : -1;
  const len = Math.max(af.length, bf.length);
  const aF = af.padEnd(len, '0');
  const bF = bf.padEnd(len, '0');
  if (aF === bF) return 0;
  return aF > bF ? 1 : -1;
}
