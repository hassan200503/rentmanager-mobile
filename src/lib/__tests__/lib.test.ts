import { daysUntilLocalDate, formatInstant, formatLocalDate } from '../dates';
import { formatMoney, isPositive, parseShillingInput } from '../money';
import { formatPhone, maskPhone, toE164 } from '../phone';

describe('formatMoney', () => {
  it.each([
    ['15000', 'KSh 15,000'],
    ['15000.00', 'KSh 15,000'],
    ['1234567.89', 'KSh 1,234,567.89'],
    ['0.005', 'KSh 0.01'],
    ['99.995', 'KSh 100'],
    ['-250.50', '-KSh 250.50'],
    ['0', 'KSh 0'],
  ])('formats %s exactly from the string', (input, expected) => {
    expect(formatMoney(input)).toBe(expected);
  });

  it('never shows a number for missing or garbage values', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney('abc')).toBe('—');
    expect(formatMoney('')).toBe('—');
  });

  it('does not lose precision beyond double range', () => {
    expect(formatMoney('90071992547409930.10')).toBe('KSh 90,071,992,547,409,930.10');
  });
});

describe('isPositive', () => {
  it.each([
    ['0', false],
    ['0.00', false],
    ['-5', false],
    ['0.01', true],
    ['12000', true],
    [null, false],
  ])('%s -> %s', (v, expected) => expect(isPositive(v as string | null)).toBe(expected));
});

describe('parseShillingInput', () => {
  it('accepts whole shillings with separators', () => {
    expect(parseShillingInput('15,000')).toEqual({ ok: true, value: '15000' });
  });
  it.each(['', '0', '12.50', '-5', 'abc', '12345678'])('rejects %s', (v) => {
    expect(parseShillingInput(v).ok).toBe(false);
  });
});

describe('dates', () => {
  it('formats a LocalDate without shifting the day', () => {
    expect(formatLocalDate('2026-09-30')).toBe('30 Sep 2026');
    expect(formatLocalDate('2026-01-01')).toBe('1 Jan 2026');
  });

  it('shows instants in Nairobi time', () => {
    // 21:30 UTC is 00:30 the next day in Nairobi.
    expect(formatInstant('2026-09-14T21:30:00Z')).toBe('15 Sep 2026, 00:30');
  });

  it('counts days to a due date from today in Nairobi', () => {
    const lateEveningUtc = new Date('2026-09-14T22:00:00Z'); // already 15 Sep in Nairobi
    expect(daysUntilLocalDate('2026-09-15', lateEveningUtc)).toBe(0);
    expect(daysUntilLocalDate('2026-09-10', lateEveningUtc)).toBe(-5);
  });

  it('rejects malformed input', () => {
    expect(formatLocalDate('15/09/2026')).toBe('—');
    expect(formatInstant('not a date')).toBe('—');
  });
});

describe('phone', () => {
  it.each([
    ['0712345678', '+254712345678'],
    ['0112 345 678', '+254112345678'],
    ['254712345678', '+254712345678'],
    ['+254 712 345 678', '+254712345678'],
    ['712345678', '+254712345678'],
  ])('normalises %s', (input, expected) => expect(toE164(input)).toBe(expected));

  it.each(['0212345678', '0122345678', '07123', '', '+255712345678'])('rejects %s', (v) => {
    expect(toE164(v)).toBeNull();
  });

  it('formats and masks', () => {
    expect(formatPhone('0712345678')).toBe('+254 712 345 678');
    expect(maskPhone('0712345678')).toBe('+254 ••• ••5 678');
  });
});

import { compareDecimal, parseAmountInput } from '../money';
import { compareVersions } from '../semver';

describe('parseAmountInput (cash)', () => {
  it.each([
    ['15,000', '15000'],
    ['15000.5', '15000.5'],
    ['0.50', '0.50'],
    ['007', '7'],
  ])('accepts %s', (input, expected) => expect(parseAmountInput(input)).toEqual({ ok: true, value: expected }));
  it.each(['', '0', '0.00', '1.234', '-5', 'abc', '1234567890'])('rejects %s', (v) => expect(parseAmountInput(v).ok).toBe(false));
});

describe('compareDecimal', () => {
  it('compares exactly without floats', () => {
    expect(compareDecimal('15000.01', '15000')).toBe(1);
    expect(compareDecimal('15000', '15000.00')).toBe(0);
    expect(compareDecimal('999.99', '1000')).toBe(-1);
    expect(compareDecimal('90071992547409930.10', '90071992547409930.09')).toBe(1);
  });
});

describe('compareVersions', () => {
  it('orders semver numerically', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.9.1', '1.0.0')).toBe(-1);
    expect(compareVersions('garbage', '1.0.0')).toBe(0);
  });
});
