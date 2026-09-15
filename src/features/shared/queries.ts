import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AccountDeletionResult, Attachment, NotificationPreferences } from '../../api/types';
import { useSession } from '../../auth/session';

/** Features used by both experiences: preferences, account deletion, repair photos. */

export function useNotificationPreferences() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: [scope, 'notification-preferences'],
    queryFn: ({ signal }) => api.get<NotificationPreferences>('/notification-preferences', { signal }),
  });
}

export function useUpdateNotificationPreferences() {
  const { api, scope } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: { rentPayments: boolean; maintenance: boolean }) =>
      api.put<NotificationPreferences>('/notification-preferences', prefs),
    onSuccess: (saved) => qc.setQueryData([scope, 'notification-preferences'], saved),
  });
}

export function useAccountDeletionStatus() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: [scope, 'account-deletion'],
    queryFn: ({ signal }) =>
      api.get<{ status?: string; requestedAt?: string } | null>('/account/deletion', { signal }),
  });
}

export function useRequestAccountDeletion() {
  const { api } = useSession();
  return useMutation({
    mutationFn: () => api.post<AccountDeletionResult>('/account/deletion', {}, { timeoutMs: 30_000 }),
  });
}

/** Base path of a request's photos for the given experience. */
export function attachmentsPath(experience: 'renter' | 'landlord', requestId: string): string {
  const id = encodeURIComponent(requestId);
  return experience === 'renter' ? `/tenant-portal/maintenance/${id}/attachments` : `/maintenance/${id}/attachments`;
}

export function useAttachments(experience: 'renter' | 'landlord', requestId: string) {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: [scope, experience, 'maintenance', requestId, 'attachments'],
    queryFn: ({ signal }) => api.get<Attachment[]>(attachmentsPath(experience, requestId), { signal }),
    enabled: !!requestId,
  });
}

export function useUploadAttachment(experience: 'renter' | 'landlord', requestId: string) {
  const { api, scope } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { photo: { uri: string; name: string; type: string }; onProgress?: (f: number) => void }) =>
      api.upload<Attachment>(attachmentsPath(experience, requestId), args.photo, args.onProgress),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [scope, experience, 'maintenance', requestId, 'attachments'] }),
  });
}
