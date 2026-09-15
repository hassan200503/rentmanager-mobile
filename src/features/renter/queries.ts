import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  MaintenanceRequest,
  RenterAnnouncement,
  RenterDashboard,
  RenterLease,
  RenterPaymentHistory,
  SubmitMaintenance,
} from '../../api/types';
import { useSession } from '../../auth/session';

/**
 * Renter (tenant portal) data. Every endpoint here is ROLE_TENANT on the
 * backend and derives the renter from the verified token — there is no id in
 * any of these URLs that a client could change to read someone else's data.
 */

export const renterKeys = {
  all: (scope: string) => [scope, 'renter'] as const,
  dashboard: (scope: string) => [scope, 'renter', 'dashboard'] as const,
  lease: (scope: string) => [scope, 'renter', 'lease'] as const,
  history: (scope: string) => [scope, 'renter', 'payments', 'history'] as const,
  maintenance: (scope: string) => [scope, 'renter', 'maintenance'] as const,
  announcements: (scope: string) => [scope, 'renter', 'announcements'] as const,
  unread: (scope: string) => [scope, 'renter', 'announcements', 'unread'] as const,
};

export function useRenterDashboard() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: renterKeys.dashboard(scope),
    queryFn: ({ signal }) => api.get<RenterDashboard>('/tenant-portal/dashboard', { signal }),
  });
}

export function useRenterLease() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: renterKeys.lease(scope),
    queryFn: ({ signal }) => api.get<RenterLease>('/tenant-portal/lease', { signal }),
    staleTime: 5 * 60_000,
  });
}

export function useRenterPaymentHistory() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: renterKeys.history(scope),
    queryFn: ({ signal }) =>
      api.get<RenterPaymentHistory>('/tenant-portal/payments/history', { signal, query: { page: 0, size: 30 } }),
  });
}

export function useRenterMaintenance() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: renterKeys.maintenance(scope),
    queryFn: ({ signal }) => api.get<MaintenanceRequest[]>('/tenant-portal/maintenance', { signal }),
  });
}

export function useSubmitMaintenance() {
  const { api, scope } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitMaintenance) => api.post<MaintenanceRequest>('/tenant-portal/maintenance', body),
    onSuccess: (created) => {
      qc.setQueryData<MaintenanceRequest[]>(renterKeys.maintenance(scope), (prev) =>
        prev ? [created, ...prev.filter((r) => r.id !== created.id)] : [created],
      );
      void qc.invalidateQueries({ queryKey: renterKeys.maintenance(scope) });
    },
  });
}

export function useRenterAnnouncements() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: renterKeys.announcements(scope),
    queryFn: ({ signal }) => api.get<RenterAnnouncement[]>('/tenant-portal/announcements', { signal }),
  });
}

export function useMarkAnnouncementRead() {
  const { api, scope } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<RenterAnnouncement>(`/tenant-portal/announcements/${encodeURIComponent(id)}/read`),
    onSuccess: (updated) => {
      qc.setQueryData<RenterAnnouncement[]>(renterKeys.announcements(scope), (prev) =>
        prev?.map((a) => (a.id === updated.id ? updated : a)),
      );
      void qc.invalidateQueries({ queryKey: renterKeys.unread(scope) });
    },
  });
}
