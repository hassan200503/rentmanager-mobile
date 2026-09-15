import type { components } from './schema';

/**
 * Aliases over the generated OpenAPI schema. Features import from here, never
 * hand-write a backend DTO. If a type is wrong, fix the backend contract and
 * regenerate (`npm run api:types`) — do not cast around it.
 *
 * Naming trap, carried over from the backend: `tenant` means the LANDLORD
 * ORGANISATION. The renter is a "tenant profile".
 */
type S = components['schemas'];

export type SessionAccess = S['SessionAccessResponse'];
export type CurrentUser = S['UserResponse'];

// Renter (tenant portal)
export type RenterDashboard = S['TenantDashboardResponse'];
export type RenterLease = S['TenantLeaseResponse'];
export type PaymentHistoryItem = S['PaymentHistoryItem'];
export type RenterPaymentHistory = S['TenantPaymentHistoryResponse'];
export type RentPaymentRequest = S['RentPaymentRequestResponse'];
export type InitiatePortalPayment = S['InitiatePortalPaymentRequest'];
export type RenterAnnouncement = S['RenterAnnouncementResponse'];

// Maintenance (shared shape for renter and landlord)
export type MaintenanceRequest = S['MaintenanceRequestResponse'];
export type SubmitMaintenance = S['SubmitMaintenanceRequest'];
export type MaintenanceStatus = NonNullable<MaintenanceRequest['status']>;
export type MaintenanceCategory = NonNullable<SubmitMaintenance['category']>;
export type MaintenancePriority = NonNullable<SubmitMaintenance['priority']>;

// Landlord
export type LedgerSummary = S['RentLedgerSummaryResponse'];
export type UnitSummary = S['UnitSummaryResponse'];
export type LeaseSummary = S['LeaseSummaryResponse'];
export type LeaseStatus = NonNullable<LeaseSummary['status']>;
export type LeaseDetail = S['LeaseDetailResponse'];
export type OnboardingProgress = S['OnboardingProgressResponse'];

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// Added with the production-gap work (backend V98–V102)
export type LeaseAction = NonNullable<LeaseDetail['allowedActions']>[number];
export type Attachment = S['AttachmentView'];
export type NotificationPreferences = S['NotificationPreferencesResponse'];
export type AccountDeletionResult = S['AccountDeletionResponse'];
export type MobileAppConfig = S['MobileAppConfigResponse'];
export type Property = S['PropertyResponse'];
export type Unit = S['UnitResponse'];
export type CreateProperty = S['CreatePropertyRequest'];
export type CreateUnit = S['CreateUnitRequest'];
export type CreateLandlordMaintenance = S['CreateMaintenanceRequest'];
export type RecordRentTransaction = S['RecordRentTransactionRequest'];
export type LeaseActionRequest = S['LeaseActionRequest'];

/** Spring Data Page shape used by /properties and /units endpoints. */
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}
