import { useQuery } from '@tanstack/react-query';

import type { SessionAccess } from '../../api/types';
import { useSession } from '../../auth/session';

export type Experience = 'landlord' | 'renter' | 'onboarding' | 'admin_only';

/**
 * Which experience to show, from GET /users/me/access — the same authorities
 * the backend's @PreAuthorize evaluates. The app never infers a persona from
 * JWT claims or Clerk metadata, which can lag the database.
 *
 * Landlord and renter are additive on the backend. A person who is both
 * gets the landlord experience by default and can switch to "My rental"
 * from More; see resolveExperiences.
 */
export function useAccess() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: [scope, 'access'],
    queryFn: ({ signal }) => api.get<SessionAccess>('/users/me/access', { signal }),
    staleTime: 60_000,
  });
}

export function resolveExperiences(access: SessionAccess): Experience[] {
  const out: Experience[] = [];
  if (access.landlordRole) out.push('landlord');
  if (access.renter) out.push('renter');
  if (out.length === 0) {
    out.push(access.platformAdmin && !access.pendingOnboarding ? 'admin_only' : 'onboarding');
  }
  return out;
}

export type LandlordRole = 'OWNER' | 'MANAGER' | 'STAFF';

/** Mirrors the backend gates so the UI hides actions it would reject. Hint only. */
export const can = {
  changeLeaseState: (role: string | null | undefined) => role === 'OWNER' || role === 'MANAGER',
  assignMaintenance: (role: string | null | undefined) => role === 'OWNER' || role === 'MANAGER',
  updateMaintenance: (role: string | null | undefined) => role === 'OWNER' || role === 'MANAGER' || role === 'STAFF',
  viewLedger: (role: string | null | undefined) => role === 'OWNER' || role === 'MANAGER' || role === 'STAFF',
  completeOnboarding: (role: string | null | undefined) => role === 'OWNER',
  managePortfolio: (role: string | null | undefined) => role === 'OWNER' || role === 'MANAGER',
  logRepairForRenter: (role: string | null | undefined) => role === 'OWNER' || role === 'MANAGER' || role === 'STAFF',
};
