import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CreateLandlordMaintenance,
  CreateProperty,
  CreateUnit,
  LeaseAction,
  LeaseActionRequest,
  LeaseDetail,
  LeaseSummary,
  LedgerSummary,
  MaintenanceRequest,
  MaintenancePriority,
  MaintenanceStatus,
  OnboardingProgress,
  Page,
  Property,
  SpringPage,
  Unit,
  UnitSummary,
} from '../../api/types';
import type { components } from '../../api/schema';
import { useSession } from '../../auth/session';
import { track } from '../../observability/analytics';

/**
 * Landlord-side data. The organisation is never passed by the client: the
 * backend scopes every one of these calls to the organisation bound to the
 * verified token. Query keys still start with `scope` so a switch of
 * organisation can never show a cached row from the previous one.
 */

export type LedgerEntry = components['schemas']['RentLedgerEntryResponse'];

export const landlordKeys = {
  all: (scope: string) => [scope, 'landlord'] as const,
  ledgerSummary: (scope: string) => [scope, 'landlord', 'ledger', 'summary'] as const,
  overdue: (scope: string) => [scope, 'landlord', 'ledger', 'overdue'] as const,
  units: (scope: string) => [scope, 'landlord', 'units', 'summary'] as const,
  maintenance: (scope: string, status?: MaintenanceStatus | null) =>
    [scope, 'landlord', 'maintenance', status ?? 'all'] as const,
  maintenanceDetail: (scope: string, id: string) => [scope, 'landlord', 'maintenance', 'detail', id] as const,
  unviewed: (scope: string) => [scope, 'landlord', 'maintenance', 'unviewed'] as const,
  leases: (scope: string, keyword: string, status: string | null) =>
    [scope, 'landlord', 'leases', keyword, status ?? 'all'] as const,
  lease: (scope: string, id: string) => [scope, 'landlord', 'lease', id] as const,
  onboarding: (scope: string) => [scope, 'landlord', 'onboarding'] as const,
};

export function useLedgerSummary() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: landlordKeys.ledgerSummary(scope),
    queryFn: ({ signal }) => api.get<LedgerSummary>('/rent-ledger/summary', { signal }),
  });
}

export function useUnitSummary() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: landlordKeys.units(scope),
    queryFn: ({ signal }) => api.get<UnitSummary>('/units/summary', { signal }),
  });
}

/** Entries the ledger itself marks OVERDUE — not a client-side date guess. */
export function useOverdueEntries() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: landlordKeys.overdue(scope),
    queryFn: ({ signal }) => api.get<LedgerEntry[]>('/rent-ledger/entries/status/OVERDUE', { signal }),
  });
}

export function useMaintenanceList(status: MaintenanceStatus | null, priority?: MaintenancePriority | null) {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: [...landlordKeys.maintenance(scope, status), priority ?? 'any'],
    queryFn: ({ signal }) =>
      api.get<MaintenanceRequest[]>('/maintenance', {
        signal,
        query: { status: status ?? undefined, priority: priority ?? undefined, sort: 'createdAt', direction: 'desc' },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useMaintenanceDetail(id: string) {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: landlordKeys.maintenanceDetail(scope, id),
    queryFn: ({ signal }) => api.get<MaintenanceRequest>(`/maintenance/${encodeURIComponent(id)}`, { signal }),
    enabled: !!id,
  });
}

export function useUnviewedMaintenance() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: landlordKeys.unviewed(scope),
    queryFn: ({ signal }) => api.get<{ count: number }>('/maintenance/unviewed-count', { signal }),
  });
}

export function useUpdateMaintenanceStatus(id: string) {
  const { api, scope } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: MaintenanceStatus; note?: string }) =>
      api.patch<MaintenanceRequest>(`/maintenance/${encodeURIComponent(id)}/status`, body),
    onSuccess: (updated) => {
      qc.setQueryData(landlordKeys.maintenanceDetail(scope, id), updated);
      void qc.invalidateQueries({ queryKey: [scope, 'landlord', 'maintenance'] });
      track('maintenance_status_updated');
    },
  });
}

export function useLeases(keyword: string, status: string | null) {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: landlordKeys.leases(scope, keyword, status),
    queryFn: ({ signal }) =>
      api.get<Page<LeaseSummary>>('/leases', {
        signal,
        query: { keyword: keyword || undefined, status: status ?? undefined, page: 0, size: 50 },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useLease(id: string) {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: landlordKeys.lease(scope, id),
    queryFn: ({ signal }) => api.get<LeaseDetail>(`/leases/${encodeURIComponent(id)}`, { signal }),
    enabled: !!id,
  });
}

export function useLeaseLedger(leaseId: string) {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: [scope, 'landlord', 'lease', leaseId, 'ledger'],
    queryFn: ({ signal }) =>
      api.get<LedgerEntry[]>(`/rent-ledger/leases/${encodeURIComponent(leaseId)}/entries`, { signal }),
    enabled: !!leaseId,
  });
}

export function useOnboardingProgress(enabled: boolean) {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: landlordKeys.onboarding(scope),
    queryFn: ({ signal }) => api.get<OnboardingProgress>('/onboarding/progress', { signal, unwrapped: false }),
    enabled,
  });
}

// ─── Lease actions, cash payments, properties, repairs on behalf ─────────────

export function useLeaseAction(leaseId: string) {
  const { api, scope } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      action: LeaseAction;
      reason?: string;
      terminationType?: LeaseActionRequest['terminationType'];
      actionDate?: string;
    }) => api.post<{ newStatus?: string }>(`/leases/${encodeURIComponent(leaseId)}/action`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: landlordKeys.lease(scope, leaseId) });
      void qc.invalidateQueries({ queryKey: [scope, 'landlord', 'leases'] });
      void qc.invalidateQueries({ queryKey: [scope, 'landlord', 'units'] });
    },
  });
}

/**
 * Records cash received against one rent entry. The caller supplies the
 * idempotency key for this submission and reuses it on retry, so the backend
 * (V98) records the payment at most once however many times it is sent.
 */
export function useRecordCashPayment(leaseId: string) {
  const { api, scope } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { entryId: string; amount: string; reference?: string; idempotencyKey: string }) =>
      api.post<LedgerEntry>(
        `/rent-ledger/entries/${encodeURIComponent(args.entryId)}/transactions`,
        {
          type: 'PAYMENT',
          source: 'CASH',
          amount: args.amount,
          externalReference: args.reference?.trim() || undefined,
        },
        { headers: { 'Idempotency-Key': args.idempotencyKey } },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [scope, 'landlord', 'lease', leaseId, 'ledger'] });
      void qc.invalidateQueries({ queryKey: [scope, 'landlord', 'ledger'] });
    },
  });
}

export function useProperties() {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: [scope, 'landlord', 'properties'],
    queryFn: ({ signal }) =>
      api.get<SpringPage<Property>>('/properties', { signal, query: { page: 0, size: 100, sort: 'name' } }),
  });
}

export function useProperty(propertyId: string) {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: [scope, 'landlord', 'property', propertyId],
    queryFn: ({ signal }) => api.get<Property>(`/properties/${encodeURIComponent(propertyId)}`, { signal }),
    enabled: !!propertyId,
  });
}

export function usePropertyUnits(propertyId: string) {
  const { api, scope } = useSession();
  return useQuery({
    queryKey: [scope, 'landlord', 'property', propertyId, 'units'],
    queryFn: ({ signal }) =>
      api.get<SpringPage<Unit>>(`/units/property/${encodeURIComponent(propertyId)}`, { signal, query: { page: 0, size: 200 } }),
    enabled: !!propertyId,
  });
}

export function useCreateProperty() {
  const { api, scope } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProperty) => api.post<Property>('/properties', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [scope, 'landlord', 'properties'] }),
  });
}

export function useCreateUnit(propertyId: string) {
  const { api, scope } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUnit) => api.post<Unit>('/units', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [scope, 'landlord', 'property', propertyId, 'units'] });
      void qc.invalidateQueries({ queryKey: [scope, 'landlord', 'units'] });
    },
  });
}

/** A repair logged by landlord staff for a renter; ids come from a lease the backend returned. */
export function useLogRepairForRenter() {
  const { api, scope } = useSession();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLandlordMaintenance) => api.post<MaintenanceRequest>('/maintenance', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [scope, 'landlord', 'maintenance'] }),
  });
}
