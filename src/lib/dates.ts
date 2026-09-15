/**
 * The backend sends two kinds of time and they must never be confused:
 *
 * - `LocalDate` ("2026-09-30"): a calendar date with no time zone — a rent due
 *   date, a lease start. Parsing it with `new Date("2026-09-30")` treats it as
 *   UTC midnight, which some platforms then render as the previous day. So it
 *   is formatted from its parts, never converted to an instant.
 * - `Instant` ("2026-09-15T06:12:00Z"): a moment. Shown in Kenyan time, which
 *   is what the landlord and renter experience (EAT, UTC+3, no DST).
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DISPLAY_TIME_ZONE = 'Africa/Nairobi';

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatLocalDate(value: string | null | undefined): string {
  if (!value) return '—';
  const m = LOCAL_DATE.exec(value);
  if (!m) return '—';
  const month = MONTHS[parseInt(m[2], 10) - 1];
  if (!month) return '—';
  return `${parseInt(m[3], 10)} ${month} ${m[1]}`;
}

/** Whole days from today (in Nairobi) until a LocalDate; negative if past. */
export function daysUntilLocalDate(value: string | null | undefined, now: Date = new Date()): number | null {
  if (!value) return null;
  const m = LOCAL_DATE.exec(value);
  if (!m) return null;
  const today = nairobiDateParts(now);
  const target = Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  const base = Date.UTC(today.year, today.month - 1, today.day);
  return Math.round((target - base) / 86_400_000);
}

export function formatInstant(value: string | null | undefined, withTime = true): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const p = nairobiDateParts(date);
  const base = `${p.day} ${MONTHS[p.month - 1]} ${p.year}`;
  if (!withTime) return base;
  return `${base}, ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** "2 hours ago" style, for activity. Falls back to a date after a week. */
export function formatRelative(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return days === 1 ? 'Yesterday' : `${days} days ago`;
  return formatInstant(value, false);
}

/**
 * Nairobi is a fixed UTC+3 with no daylight saving, so this is exact without
 * depending on the device's Intl time-zone data (absent on some Android
 * builds of Hermes).
 */
function nairobiDateParts(date: Date) {
  const shifted = new Date(date.getTime() + 3 * 3_600_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}
