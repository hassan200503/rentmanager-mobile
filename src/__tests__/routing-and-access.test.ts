import type { SessionAccess } from '../api/types';
import { scopeFor } from '../auth/session';
import { can, resolveExperiences } from '../features/access/use-access';
import { destinationFor } from '../notifications/routes';
import { scrubUrl } from '../observability/monitoring';

jest.mock('@sentry/react-native', () => ({}));
jest.mock('@clerk/expo', () => ({}));

const access = (over: Partial<SessionAccess>): SessionAccess =>
  ({ userId: 'u', landlordRole: undefined, renter: false, pendingOnboarding: false, platformAdmin: false, ...over }) as SessionAccess;

describe('experience resolution (from backend authorities, never claims)', () => {
  it('landlord and renter are additive, landlord first', () => {
    expect(resolveExperiences(access({ landlordRole: 'MANAGER', renter: true }))).toEqual(['landlord', 'renter']);
  });
  it('renter only', () => {
    expect(resolveExperiences(access({ renter: true }))).toEqual(['renter']);
  });
  it('neither → onboarding', () => {
    expect(resolveExperiences(access({ pendingOnboarding: true }))).toEqual(['onboarding']);
  });
  it('platform admin with nothing else → web-only notice', () => {
    expect(resolveExperiences(access({ platformAdmin: true }))).toEqual(['admin_only']);
  });
  it('role hints mirror backend gates', () => {
    expect(can.changeLeaseState('STAFF')).toBe(false);
    expect(can.updateMaintenance('STAFF')).toBe(true);
    expect(can.assignMaintenance('STAFF')).toBe(false);
    expect(can.completeOnboarding('MANAGER')).toBe(false);
  });
});

describe('cache scope', () => {
  it('differs per person and per organisation', () => {
    const a = scopeFor('user_1', 'org_A');
    expect(scopeFor('user_1', 'org_B')).not.toBe(a);
    expect(scopeFor('user_2', 'org_A')).not.toBe(a);
    expect(scopeFor(null, 'org_A')).toBe('signed-out');
  });
});

describe('push deep links', () => {
  const id = '3527cff1-cd39-42fc-9817-402b353278c0';
  it('maps known types to the right experience', () => {
    expect(destinationFor({ type: 'landlord_maintenance_submitted', id })).toEqual({
      experience: 'landlord',
      href: `/(landlord)/maintenance/${id}`,
    });
    expect(destinationFor({ type: 'rent_payment_recorded', id })?.experience).toBe('renter');
  });
  it('ignores unknown types and non-uuid ids (no path injection)', () => {
    expect(destinationFor({ type: 'something_else', id })).toBeNull();
    expect(destinationFor({ type: 'landlord_maintenance_submitted', id: '../../admin' })).toBeNull();
    expect(destinationFor(null)).toBeNull();
  });
});

describe('monitoring scrubbing', () => {
  it('drops query strings and ids from URLs', () => {
    expect(scrubUrl(`https://api/x/leases/${'3527cff1-cd39-42fc-9817-402b353278c0'}?keyword=Jane`)).toBe('https://api/x/leases/:id');
  });
});
