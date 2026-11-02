# 🏗️ Architecture Diagrams & Flowcharts

This document contains detailed architecture diagrams, data flow charts, and system interactions for the RentManager Mobile application.

---

## 📐 Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Authentication Flow](#authentication-flow)
3. [M-Pesa Payment State Machine](#m-pesa-payment-state-machine)
4. [Data Flow Patterns](#data-flow-patterns)
5. [Component Hierarchy](#component-hierarchy)
6. [API Integration Architecture](#api-integration-architecture)
7. [Navigation Structure](#navigation-structure)
8. [Push Notification Flow](#push-notification-flow)
9. [Cache Isolation Strategy](#cache-isolation-strategy)
10. [Offline Handling](#offline-handling)

---

## System Architecture Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          USER DEVICE (iOS/Android)                         │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                    REACT NATIVE APPLICATION                          │ │
│  │                                                                      │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐   │ │
│  │  │  Expo Router   │  │  React Query   │  │  Clerk Auth SDK    │   │ │
│  │  │  (Navigation)  │  │  (Cache Layer) │  │  (Session Mgmt)    │   │ │
│  │  └───────┬────────┘  └───────┬────────┘  └──────────┬─────────┘   │ │
│  │          │                    │                       │             │ │
│  │          └────────────────────┴───────────────────────┘             │ │
│  │                               │                                     │ │
│  │          ┌────────────────────▼────────────────────┐               │ │
│  │          │      Feature Modules                    │               │ │
│  │          │  - Landlord Queries (19 hooks)          │               │ │
│  │          │  - Renter Queries (7 hooks)             │               │ │
│  │          │  - Shared Utilities                     │               │ │
│  │          └────────────────────┬────────────────────┘               │ │
│  │                               │                                     │ │
│  │          ┌────────────────────▼────────────────────┐               │ │
│  │          │      API Client                         │               │ │
│  │          │  - HTTP Client (openapi-fetch)          │               │ │
│  │          │  - Error Handling                       │               │ │
│  │          │  - Request/Response Interceptors        │               │ │
│  │          └────────────────────┬────────────────────┘               │ │
│  │                               │                                     │ │
│  └───────────────────────────────┼─────────────────────────────────────┘ │
│                                  │                                        │
│  ┌───────────────────────────────▼─────────────────────────────────────┐ │
│  │                       EXPO SECURE STORE                              │ │
│  │  - Clerk Tokens (JWT)        - Push Token                           │ │
│  │  - Session Data              - Payment Idempotency Keys             │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────┬───────────────────────────────────────────┘
                                 │
                                 │ HTTPS (TLS 1.2+)
                                 │ Authorization: Bearer <JWT>
                                 │
┌────────────────────────────────▼───────────────────────────────────────────┐
│                          BACKEND SERVICES                                   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     SPRING BOOT REST API                             │  │
│  │                         /api/v1/*                                    │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  Authentication Layer                                          │ │  │
│  │  │  - JWKS Verification (Clerk public keys)                       │ │  │
│  │  │  - tenant_id claim → tenants.clerk_org_id mapping             │ │  │
│  │  │  - @PreAuthorize checks (LANDLORD_OWNER, TENANT, etc.)       │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  Business Logic Layer                                          │ │  │
│  │  │  - Rent Calculations          - Lease Management               │ │  │
│  │  │  - Payment Processing         - Maintenance Tracking           │ │  │
│  │  │  - M-Pesa Integration         - Notification Dispatch          │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │  Data Access Layer (JPA/Hibernate)                             │ │  │
│  │  │  - Repositories               - Query Optimization              │ │  │
│  │  │  - Tenant Isolation           - Audit Logging                  │ │  │
│  │  └──────────────────┬───────────────────────────────────────────┬─┘ │  │
│  │                     │                                           │   │  │
│  └─────────────────────┼───────────────────────────────────────────┼───┘  │
│                        │                                           │      │
│         ┌──────────────▼──────────┐              ┌────────────────▼────┐ │
│         │    PostgreSQL           │              │   M-Pesa API        │ │
│         │    - Tenants            │              │   (Safaricom)       │ │
│         │    - Properties         │              │   - STK Push        │ │
│         │    - Leases             │              │   - Callbacks       │ │
│         │    - Payments           │              └─────────────────────┘ │
│         │    - Maintenance        │                                      │
│         └─────────────────────────┘                                      │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │                  NOTIFICATION SERVICES                               │ │
│  │                                                                      │ │
│  │  ┌──────────────────┐         ┌──────────────────┐                 │ │
│  │  │  Expo Push API   │────────▶│   APNs (iOS)     │                 │ │
│  │  │                  │         │   FCM (Android)  │                 │ │
│  │  └──────────────────┘         └──────────────────┘                 │ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

### Complete Sign-In Flow

```
┌─────────────┐
│   User      │
│ Opens App   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│ App Entry Point                 │
│ app/index.tsx                   │
│ - Checks Clerk session          │
└──────┬──────────────────────────┘
       │
       ├─── Session exists? ───┐
       │                       │
       ▼ NO                    ▼ YES
┌─────────────────┐     ┌──────────────────────────┐
│ app/sign-in.tsx │     │ GET /api/v1/users/me/access│
│                 │     │ - Returns authorities      │
│ Shows           │     │ - LANDLORD_OWNER/MANAGER   │
│ "Sign In"       │     │ - TENANT                   │
│ button          │     │ - PENDING                  │
└──────┬──────────┘     └──────┬───────────────────┘
       │                       │
       │                       ├─── Has account? ───┐
       ▼                       │                     │
┌─────────────────────────────┐│ YES                │ NO (PENDING)
│ Clerk.useHostedAuth()       ││                    │
│                             ││                    ▼
│ Opens system browser:       │▼             ┌───────────────────┐
│ accounts.clerk.dev          │              │ app/onboarding.tsx│
└──────┬──────────────────────┘              │ Landlord setup    │
       │                       ┌────────────▶│ flow              │
       ▼                       │             └───────────────────┘
┌─────────────────────────────┐│
│ User enters credentials     ││
│ - Email/Phone               ││
│ - Password/OTP              ││
│ - MFA (if enabled)          ││
└──────┬──────────────────────┘│
       │                       │
       ▼                       │
┌─────────────────────────────┐│
│ Clerk validates identity    ││
│ - JWKS signature check      ││
│ - Issues session token      ││
└──────┬──────────────────────┘│
       │                       │
       ▼                       │
┌─────────────────────────────┐│
│ Browser redirects:          ││
│ rentmanager://auth-callback ││
└──────┬──────────────────────┘│
       │                       │
       ▼                       │
┌─────────────────────────────┐│
│ @clerk/expo handles redirect││
│ - Caches tokens in          ││
│   Expo SecureStore          ││
│   (Keychain/Keystore)       ││
└──────┬──────────────────────┘│
       │                       │
       ▼                       │
┌─────────────────────────────┐│
│ SessionProvider initialized ││
│ - Creates API client        ││
│ - Sets cache scope:         ││
│   <userId>:<orgId>          ││
└──────┬──────────────────────┘│
       │                       │
       ▼                       │
┌─────────────────────────────┐│
│ Every API call includes:    ││
│ Authorization: Bearer <JWT> ││
│                             ││
│ JWT payload:                ││
│ {                           ││
│   sub: "<clerk_user_id>",   ││
│   tenant_id: "<org_id>",    ││
│   authorities: [            ││
│     "LANDLORD_OWNER",       ││
│     "TENANT"                ││
│   ]                         ││
│ }                           ││
└──────┬──────────────────────┘│
       │                       │
       ▼                       │
┌─────────────────────────────┐│
│ Backend validates JWT       ││
│ - JWKS public key check     ││
│ - Tenant isolation          ││
│ - Permission enforcement    ││
└──────┬──────────────────────┘│
       │                       │
       └───────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Route to appropriate        │
│ experience:                 │
│ - app/(landlord)/ OR        │
│ - app/(renter)/             │
└─────────────────────────────┘
```

### Token Refresh Flow

```
┌──────────────┐
│ API Request  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│ getToken({              │
│   template: 'backend'   │
│ })                      │
└──────┬───────────────────┘
       │
       ├─── Token expired? ───┐
       │                      │
       ▼ NO                   ▼ YES
┌──────────────┐      ┌────────────────────┐
│ Use cached   │      │ Clerk SDK silently │
│ token        │      │ refreshes:         │
└──────┬───────┘      │ - Calls Clerk API  │
       │              │ - Gets new JWT     │
       │              │ - Updates cache    │
       │              └────────┬───────────┘
       │                       │
       ▼                       ▼
┌─────────────────────────────────┐
│ Attach to request:              │
│ Authorization: Bearer <JWT>     │
└─────────────────────────────────┘
```

---

## M-Pesa Payment State Machine

### State Diagram

```
                    ┌────────────────────────────────────┐
                    │          IDLE                      │
                    │  - User on payment screen          │
                    │  - Can enter amount                │
                    └───────────┬────────────────────────┘
                                │
                                │ User taps "Pay Now"
                                │ Trigger: SEND event
                                │
                                ▼
                    ┌────────────────────────────────────┐
                    │        SENDING                     │
                    │  - HTTP POST /rent-payments        │
                    │  - Shows loading spinner           │
                    └───────────┬────────────────────────┘
                                │
                 ┌──────────────┼──────────────┬─────────────────┐
                 │              │              │                 │
                 │              │              │                 │
      Backend    │   Network   │   Backend    │    Network      │
      accepts    │   timeout   │   rejects    │    error        │
      (201)      │   (no HTTP  │   (400/409)  │    (mid-req)    │
                 │   response) │              │                 │
                 ▼              ▼              ▼                 ▼
    ┌────────────────┐  ┌─────────────┐  ┌──────────┐  ┌────────────────┐
    │   AWAITING     │  │ UNCERTAIN_  │  │ REJECTED │  │ UNCERTAIN_     │
    │                │  │   SEND      │  │          │  │   SEND         │
    │ - STK sent     │  │             │  │ - Shows  │  │                │
    │ - requestId    │  │ - Wait 30s  │  │   error  │  │ - Wait 30s     │
    │ - Poll every   │  │   before    │  │ - Can    │  │   before retry │
    │   3 seconds    │  │   retry     │  │   retry  │  │                │
    └────┬───────────┘  └─────────────┘  └──────────┘  └────────────────┘
         │
         │ Poll: GET /rent-payments/:id every 3s
         │ Trigger: STATUS event
         │
    ┌────┴─────┬────────────┬────────────┬──────────────┐
    │          │            │            │              │
    │ Status:  │ Status:    │ Status:    │ No status    │
    │ PAID     │ FAILED     │ CANCELED   │ after 2 min  │
    │          │            │            │              │
    ▼          ▼            ▼            ▼              │
┌────────┐ ┌────────┐  ┌──────────┐ ┌─────────────┐   │
│  PAID  │ │ FAILED │  │ CANCELED │ │ UNCONFIRMED │   │
│        │ │        │  │          │ │             │   │
│ - Show │ │ - Show │  │ - User   │ │ - Outcome   │   │
│   ✓    │ │   ✗    │  │   cancel │ │   unknown   │   │
│ - Rcpt │ │ - Can  │  │ - Can    │ │ - Show help │   │
│ - Tx#  │ │   retry│  │   retry  │ │ - Can check │   │
└────────┘ └────────┘  └──────────┘ └─────────────┘   │
                                                       │
   ┌───────────────────────────────────────────────────┘
   │
   │ All terminal states:
   │ User taps "Done" or "Retry"
   │ Trigger: RESET event
   │
   ▼
┌────────────────────────────────────┐
│          IDLE                      │
│  (back to start)                   │
└────────────────────────────────────┘
```

### State Transition Table

| Current State | Event | Next State | Side Effects |
|--------------|-------|------------|--------------|
| **IDLE** | SEND | SENDING | - Call `POST /rent-payments`<br>- Show spinner |
| **SENDING** | SENT (201) | AWAITING | - Store `requestId`<br>- Start polling timer<br>- Show "Check your phone" |
| **SENDING** | SEND_FAILED (timeout) | UNCERTAIN_SEND | - Clear spinner<br>- Show uncertain message<br>- Disable retry for 30s |
| **SENDING** | SEND_FAILED (400/409) | REJECTED | - Show error message<br>- Enable retry immediately |
| **AWAITING** | STATUS (PAID) | PAID | - Stop polling<br>- Show success<br>- Display receipt |
| **AWAITING** | STATUS (FAILED) | FAILED | - Stop polling<br>- Show failure reason<br>- Enable retry |
| **AWAITING** | STATUS (CANCELED) | FAILED | - Stop polling<br>- User cancelled prompt<br>- Enable retry |
| **AWAITING** | CHECK_FAILED | AWAITING | - Continue polling<br>- Increment check count |
| **AWAITING** | (timeout 2min) | UNCONFIRMED | - Stop polling<br>- Show "outcome unknown"<br>- Offer manual check |
| **PAID** | RESET | IDLE | - Clear state<br>- Return to payment screen |
| **FAILED** | RESET | IDLE | - Clear state<br>- Allow new payment |
| **REJECTED** | RESET | IDLE | - Clear error<br>- Allow new payment |
| **UNCONFIRMED** | RESUME | AWAITING | - Resume polling from saved requestId |
| **UNCERTAIN_SEND** | (wait 30s) | IDLE | - Re-enable pay button |

### Polling Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   AWAITING STATE                             │
│                                                              │
│  Start: when backend accepts request (SENT event)           │
│  Stop:  when terminal status reached or timeout             │
│                                                              │
│  ┌────────┐      ┌────────┐      ┌────────┐                │
│  │ Check  │ 3s   │ Check  │ 3s   │ Check  │ ... up to 2min │
│  │ #1     │─────▶│ #2     │─────▶│ #3     │                │
│  └────┬───┘      └────┬───┘      └────┬───┘                │
│       │               │               │                     │
│       ▼               ▼               ▼                     │
│  GET /rent-payments/:id                                     │
│                                                              │
│  Response status → State transition:                        │
│  - PENDING:    Stay in AWAITING, schedule next poll         │
│  - PAID:       Transition to PAID (SUCCESS)                 │
│  - FAILED:     Transition to FAILED                         │
│  - CANCELED:   Transition to FAILED                         │
│                                                              │
│  Error handling:                                            │
│  - Network error: Stay in AWAITING, retry poll              │
│  - 404 Not Found: Transition to UNCONFIRMED (data loss)     │
│  - 401 Unauthorized: Transition to REJECTED (session issue) │
│                                                              │
│  Timeout: After 2 minutes (40 checks), stop polling         │
│           → Transition to UNCONFIRMED                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Idempotency Handling

```
┌──────────────────────────────────────────────────────────────┐
│              Idempotency Key Generation                       │
│                                                               │
│  On app launch:                                               │
│  - Generate: UUID v4 (crypto.randomUUID())                    │
│  - Store in: Expo SecureStore                                 │
│  - Lifetime: Until payment succeeds or explicitly cleared     │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ POST /api/v1/rent-payments                              │  │
│  │                                                         │  │
│  │ Headers:                                                │  │
│  │   Idempotency-Key: <UUID>                               │  │
│  │   Authorization: Bearer <JWT>                           │  │
│  │                                                         │  │
│  │ Body:                                                   │  │
│  │   {                                                     │  │
│  │     "leaseId": "123",                                   │  │
│  │     "amount": "5000.00",                                │  │
│  │     "phone": "254712345678"                             │  │
│  │   }                                                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  Backend behavior (within 3-minute window):                   │
│  - First request:  Process normally, store key               │
│  - Duplicate:      Return existing request (200/201)         │
│  - Benefit:        No double STK prompts on network retry    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow Patterns

### Query Flow (GET Requests)

```
┌────────────────┐
│   Component    │
│   renders      │
└───────┬────────┘
        │
        ▼
┌────────────────────────────┐
│ useQuery Hook              │
│ (e.g., useRenterDashboard) │
└───────┬────────────────────┘
        │
        ├─── Cache hit? ───┐
        │                  │
        ▼ NO               ▼ YES
┌───────────────┐   ┌──────────────┐
│ API Client    │   │ Return       │
│ GET /endpoint │   │ cached data  │
└───────┬───────┘   └──────────────┘
        │
        ▼
┌───────────────────────────┐
│ Backend processes         │
│ - Validates JWT           │
│ - Applies tenant filter   │
│ - Queries database        │
└───────┬───────────────────┘
        │
        ├─── Success? ───┬─────────┐
        │                │         │
        ▼ YES            ▼ NO      │
┌───────────────┐  ┌──────────────┴─────┐
│ Cache data    │  │ ApiError           │
│ (React Query) │  │ - Network error    │
└───────┬───────┘  │ - Auth error       │
        │          │ - Server error     │
        │          └────────┬───────────┘
        ▼                   │
┌───────────────────────────▼───┐
│ Component receives:           │
│ - data (if success)           │
│ - error (if failure)          │
│ - isLoading, isRefetching     │
└───────────────────────────────┘
```

### Mutation Flow (POST/PUT/DELETE Requests)

```
┌────────────────┐
│   User action  │
│   (button tap) │
└───────┬────────┘
        │
        ▼
┌────────────────────────────┐
│ useMutation Hook           │
│ (e.g., useSubmitMaintenance│
└───────┬────────────────────┘
        │
        ▼
┌────────────────────────────┐
│ Optimistic update          │
│ (optional, for UI feedback)│
└───────┬────────────────────┘
        │
        ▼
┌───────────────────────────┐
│ API Client                │
│ POST/PUT/DELETE /endpoint │
└───────┬───────────────────┘
        │
        ▼
┌───────────────────────────┐
│ Backend processes         │
│ - Validates request       │
│ - Persists changes        │
│ - Returns updated entity  │
└───────┬───────────────────┘
        │
        ├─── Success? ───┬─────────┐
        │                │         │
        ▼ YES            ▼ NO      │
┌───────────────┐  ┌──────────────┴─────┐
│ Invalidate    │  │ Rollback optimistic│
│ related       │  │ update (if any)    │
│ queries       │  │                    │
└───────┬───────┘  └────────┬───────────┘
        │                   │
        ▼                   ▼
┌───────────────────────────────────────┐
│ Component receives mutation result:   │
│ - onSuccess: Update UI, show toast    │
│ - onError: Show error, allow retry    │
└───────────────────────────────────────┘
```

### Cache Invalidation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                  React Query Invalidation                    │
│                                                              │
│  Mutation                        Invalidates Queries         │
│  ────────────────────────────    ──────────────────────────  │
│                                                              │
│  submitMaintenance()       →     renterMaintenance           │
│                                  maintenanceList (landlord)  │
│                                                              │
│  recordCashPayment()       →     ledgerSummary               │
│                                  renterDashboard             │
│                                  renterPaymentHistory        │
│                                                              │
│  createProperty()          →     properties                  │
│                                  unitSummary                 │
│                                                              │
│  updateLeaseStatus()       →     leases                      │
│                                  lease (specific)            │
│                                  renterLease                 │
│                                                              │
│  markAnnouncementRead()    →     announcements               │
│                                  (updates unread count)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

### App Root Structure

```
App
└── _layout.tsx (Root Layout)
    ├── <SessionProvider>
    │   └── Provides: api, scope, userId, orgId
    │
    ├── <QueryClientProvider>
    │   └── React Query cache with offline handling
    │
    ├── <ClerkProvider tokenCache={secureTokenCache}>
    │   └── Authentication state
    │
    ├── <SafeAreaProvider>
    │   └── Device safe areas (notch, status bar)
    │
    ├── <ErrorBoundary>
    │   └── Catches unhandled errors
    │
    ├── <VersionGate>
    │   └── Enforces minimum app version
    │
    ├── <OfflineBanner />
    │   └── Shows network status
    │
    ├── <SessionRejectedBanner />
    │   └── Prompts re-authentication
    │
    └── <Stack> (Expo Router navigation)
        ├── index.tsx (Entry gate)
        ├── sign-in.tsx
        ├── onboarding.tsx
        ├── (landlord)/
        │   └── <Stack>
        │       ├── index.tsx
        │       ├── rent.tsx
        │       ├── maintenance/
        │       └── leases/
        └── (renter)/
            └── <Stack>
                ├── index.tsx
                ├── pay.tsx
                ├── payments.tsx
                └── maintenance.tsx
```

### Screen Component Pattern

```
Screen Component (e.g., RenterHome)
│
├── <Screen> (Primitive)
│   ├── Pull-to-refresh handler
│   ├── Keyboard avoiding view
│   └── Safe area insets
│
├── <Text variant="title">
│   └── Screen title
│
├── Data Fetching Hooks
│   ├── const dashboard = useRenterDashboard()
│   ├── const maintenance = useRenterMaintenance()
│   └── const announcements = useRenterAnnouncements()
│
├── Loading States
│   ├── {dashboard.isPending ? <LoadingState /> : ...}
│   └── Skeleton screens
│
├── Error States
│   ├── {dashboard.isError ? <ErrorState onRetry={...} /> : ...}
│   └── User-friendly error messages
│
├── Content (when loaded)
│   ├── <Card> components
│   │   ├── <KeyValue> pairs
│   │   ├── <Badge> indicators
│   │   └── <Button> actions
│   │
│   └── <FlatList> / <ScrollView>
│       └── Mapped data items
│
└── Actions
    ├── <Button> for primary actions
    └── Navigation (router.push)
```

---

## API Integration Architecture

### OpenAPI Type Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Spring Boot)                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  SpringDoc OpenAPI                                     │ │
│  │  - Scans @RestController annotations                  │ │
│  │  - Generates OpenAPI 3.0 spec                         │ │
│  │  - Publishes: GET /api/v1/openapi.json               │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        │ Copy to repo
                        ▼
┌─────────────────────────────────────────────────────────────┐
│               Mobile Repo (rentmanager-mobile)               │
│                                                              │
│  openapi/rentmanager.json                                   │
│  - Committed snapshot                                        │
│  - Version controlled                                        │
│  - CI validates against live API                            │
│                                                              │
│        │                                                     │
│        │ npm run api:types                                   │
│        ▼                                                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  scripts/generate-api-types.mjs                        │ │
│  │                                                        │ │
│  │  - Uses openapi-typescript                            │ │
│  │  - Generates TypeScript definitions                   │ │
│  │  - Validates schema correctness                       │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│                       ▼                                      │
│                                                              │
│  src/api/schema.d.ts (GENERATED - DO NOT EDIT)             │
│  - 357k LOC of TypeScript types                            │
│  - Type-safe request/response definitions                   │
│  - Enum definitions                                          │
│                                                              │
│        │                                                     │
│        │ import { paths } from './schema'                   │
│        ▼                                                     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  src/api/types.ts                                      │ │
│  │                                                        │ │
│  │  - Type aliases for common entities                   │ │
│  │  - Domain model types                                 │ │
│  │  - Example:                                           │ │
│  │    export type RenterDashboard =                      │ │
│  │      paths['/renters/me/dashboard']['get']            │ │
│  │        ['responses'][200]['content']                  │ │
│  │        ['application/json']['data']                   │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│                       ▼                                      │
│                                                              │
│  Feature code uses type-safe types                          │
│  - Auto-complete in IDE                                      │
│  - Compile-time error detection                             │
│  - Refactoring safety                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### API Request/Response Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   API Client Request Flow                    │
│                                                              │
│  Component calls hook:                                       │
│  const { data } = useRenterDashboard()                      │
│                                                              │
│         │                                                    │
│         ▼                                                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Query Hook (src/features/renter/queries.ts)          │ │
│  │                                                        │ │
│  │  export function useRenterDashboard() {                │ │
│  │    const { api, scope } = useSession()                │ │
│  │    return useQuery({                                  │ │
│  │      queryKey: [scope, 'renterDashboard'],           │ │
│  │      queryFn: () => api.request<RenterDashboard>(     │ │
│  │        '/renters/me/dashboard'                        │ │
│  │      )                                                │ │
│  │    })                                                 │ │
│  │  }                                                    │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│                       ▼                                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Client (src/api/client.ts)                       │ │
│  │                                                        │ │
│  │  request<T>(path, options) {                          │ │
│  │    1. Get Clerk JWT token                             │ │
│  │    2. Build URL with query params                     │ │
│  │    3. Add headers:                                    │ │
│  │       - Authorization: Bearer <JWT>                   │ │
│  │       - X-App-Name, X-App-Version                     │ │
│  │    4. Set timeout (15s default)                       │ │
│  │    5. Execute fetch()                                 │ │
│  │    6. Handle response envelope                        │ │
│  │    7. Throw ApiError on failure                       │ │
│  │    8. Return typed data                               │ │
│  │  }                                                    │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│                       │ HTTPS                                │
│                       ▼                                      │
│                                                              │
│  Backend: GET /api/v1/renters/me/dashboard                  │
│                                                              │
│         │                                                    │
│         ▼                                                    │
│                                                              │
│  Response envelope:                                          │
│  {                                                           │
│    "success": true,                                          │
│    "data": {                                                 │
│      "currentBalance": "2500.00",                            │
│      "currency": "KES",                                      │
│      "nextDueDate": "2026-11-10",                           │
│      "daysUntilDue": 8                                      │
│    },                                                        │
│    "message": null,                                          │
│    "errorCode": null                                         │
│  }                                                           │
│                                                              │
│         │                                                    │
│         ▼                                                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Client unwraps envelope:                              │ │
│  │  - Checks success field                                │ │
│  │  - Extracts data                                       │ │
│  │  - Throws on error                                     │ │
│  └────────────────────┬───────────────────────────────────┘ │
│                       │                                      │
│                       ▼                                      │
│                                                              │
│  React Query caches result:                                  │
│  - Key: ["<userId>:<orgId>", "renterDashboard"]            │
│  - TTL: 5 minutes (staleTime)                               │
│  - Refetch on: Focus, reconnect, interval                   │
│                                                              │
│         │                                                    │
│         ▼                                                    │
│                                                              │
│  Component re-renders with data                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Navigation Structure

### Route Tree

```
rentmanager-mobile/
└── app/
    ├── _layout.tsx                    # Root: Providers + auth gate
    │
    ├── index.tsx                      # Entry: GET /users/me/access → route
    │   ├─ LANDLORD_* → /(landlord)/
    │   ├─ TENANT → /(renter)/
    │   └─ PENDING → /onboarding
    │
    ├── sign-in.tsx                    # Clerk hosted auth
    ├── onboarding.tsx                 # Landlord setup
    ├── no-access.tsx                  # Platform admin (no account)
    ├── notifications.tsx              # Notification center
    ├── delete-account.tsx             # GDPR account deletion
    ├── log-repair.tsx                 # Universal repair logging
    │
    ├── (landlord)/                    # Landlord route group
    │   ├── _layout.tsx                # Tabs: Home | Rent | Repairs | Renters | More
    │   │
    │   ├── index.tsx                  # 🏠 Home: Dashboard
    │   ├── rent.tsx                   # 💰 Rent: Collection & overdue
    │   ├── more.tsx                   # ⚙️ More: Settings
    │   │
    │   ├── maintenance/
    │   │   ├── _layout.tsx
    │   │   ├── index.tsx              # 🔧 Repairs: List (all statuses)
    │   │   └── [id].tsx               # Repair detail + status updates
    │   │
    │   └── leases/
    │       ├── _layout.tsx
    │       ├── index.tsx              # 👥 Renters: Active leases
    │       └── [id].tsx               # Lease detail + ledger
    │
    ├── (renter)/                      # Renter route group
    │   ├── _layout.tsx                # Tabs: Home | Pay | Repairs | Lease | More
    │   │
    │   ├── index.tsx                  # 🏠 Home: Balance & announcements
    │   ├── pay.tsx                    # 💳 Pay: M-Pesa payment flow
    │   ├── payments.tsx               # 📊 Payment history
    │   ├── more.tsx                   # ⚙️ More: Settings
    │   │
    │   ├── report-issue.tsx           # 🔨 Report maintenance issue
    │   ├── maintenance.tsx            # 🔧 Active repair requests
    │   ├── lease.tsx                  # 📋 Lease details
    │   ├── announcements.tsx          # 📢 Landlord announcements
    │   │
    │   └── request/
    │       └── [id].tsx               # Single repair request detail
    │
    └── properties/                    # Property management (landlord)
        ├── _layout.tsx
        ├── index.tsx                  # Property list
        ├── new.tsx                    # Create property
        └── [id]/
            ├── index.tsx              # Property detail
            └── edit.tsx               # Edit property
```

### Deep Link Mapping

```
┌─────────────────────────────────────────────────────────────┐
│                  Deep Link → Screen Routing                  │
│                                                              │
│  Scheme: rentmanager:// (dev), rentmanager-staging://       │
│                                                              │
│  Examples:                                                   │
│                                                              │
│  rentmanager://sign-in                                      │
│  → app/sign-in.tsx                                          │
│                                                              │
│  rentmanager://maintenance/123                              │
│  → app/(landlord)/maintenance/[id].tsx (landlord)           │
│  → app/(renter)/request/[id].tsx (renter)                   │
│                                                              │
│  rentmanager://pay                                          │
│  → app/(renter)/pay.tsx                                     │
│                                                              │
│  rentmanager://announcements                                │
│  → app/(renter)/announcements.tsx                           │
│                                                              │
│  rentmanager://leases/456                                   │
│  → app/(landlord)/leases/[id].tsx                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Push Notification Flow

```
┌─────────────────────────────────────────────────────────────┐
│                Registration Flow (App Launch)                │
│                                                              │
│  ┌────────────┐                                              │
│  │ App starts │                                              │
│  └──────┬─────┘                                              │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────┐                       │
│  │ Check notification permissions   │                       │
│  │ (Expo.Notifications)              │                       │
│  └──────┬───────────────────────────┘                       │
│         │                                                    │
│         ├─── Granted? ───┬───────────┐                      │
│         │                │           │                      │
│         ▼ YES            ▼ NO        │                      │
│  ┌────────────┐   ┌──────────────┐  │                      │
│  │ Get token  │   │ Skip         │  │                      │
│  └──────┬─────┘   │ registration │  │                      │
│         │         └──────────────┘  │                      │
│         ▼                           │                      │
│  ┌────────────────────────────────┐ │                      │
│  │ Expo.getExpoPushTokenAsync()   │ │                      │
│  │ → ExponentPushToken[xxxxxx]    │ │                      │
│  └──────┬─────────────────────────┘ │                      │
│         │                           │                      │
│         ▼                           │                      │
│  ┌────────────────────────────────┐ │                      │
│  │ POST /api/v1/devices/push      │ │                      │
│  │ {                              │ │                      │
│  │   "token": "ExponentPushToken",│ │                      │
│  │   "deviceName": "iPhone 14"    │ │                      │
│  │ }                              │ │                      │
│  └──────┬─────────────────────────┘ │                      │
│         │                           │                      │
│         ▼                           │                      │
│  ┌────────────────────────────────┐ │                      │
│  │ Backend stores token           │ │                      │
│  │ - Linked to user session       │ │                      │
│  │ - Tenant-scoped                │ │                      │
│  └────────────────────────────────┘ │                      │
│                                     │                      │
└─────────────────────────────────────┴──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Notification Delivery Flow                      │
│                                                              │
│  Backend event occurs:                                       │
│  - Rent payment received                                     │
│  - Maintenance status changed                                │
│  - New announcement posted                                   │
│                                                              │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────────────────────┐                         │
│  │ NotificationService            │                         │
│  │ - Determines recipients        │                         │
│  │ - Formats message              │                         │
│  │ - Stores in outbox             │                         │
│  └──────┬─────────────────────────┘                         │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────────────────────┐                         │
│  │ ExpoNotificationListener       │                         │
│  │ - Fetches push tokens          │                         │
│  │ - Batches messages (100/req)   │                         │
│  └──────┬─────────────────────────┘                         │
│         │                                                    │
│         │ HTTPS POST                                         │
│         ▼                                                    │
│  ┌────────────────────────────────┐                         │
│  │ Expo Push API                  │                         │
│  │ https://exp.host/--/api/v2/... │                         │
│  └──────┬─────────────────────────┘                         │
│         │                                                    │
│    ┌────┴────┬──────────┐                                   │
│    │         │          │                                   │
│    ▼ iOS     ▼ Android  │                                   │
│  ┌──────┐ ┌──────┐      │                                   │
│  │ APNs │ │ FCM  │      │                                   │
│  └──┬───┘ └──┬───┘      │                                   │
│     │        │          │                                   │
│     └────┬───┴──────────┘                                   │
│          │                                                  │
│          ▼                                                  │
│  ┌────────────────────────────────┐                         │
│  │ User device                    │                         │
│  │ - Notification displayed       │                         │
│  └────────────────────────────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│            Notification Tap → Deep Link                      │
│                                                              │
│  User taps notification                                      │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────────────────────┐                         │
│  │ App launched / brought to fg   │                         │
│  └──────┬─────────────────────────┘                         │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────────────────────┐                         │
│  │ NotificationRouter component   │                         │
│  │ (src/notifications/            │                         │
│  │  notification-router.tsx)      │                         │
│  └──────┬─────────────────────────┘                         │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────────────────────┐                         │
│  │ Extract notification data:     │                         │
│  │ {                              │                         │
│  │   type: "MAINTENANCE_UPDATE",  │                         │
│  │   maintenanceId: "123"         │                         │
│  │ }                              │                         │
│  └──────┬─────────────────────────┘                         │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────────────────────┐                         │
│  │ destinationFor(notification)   │                         │
│  │ (src/notifications/routes.ts)  │                         │
│  │                                │                         │
│  │ Maps type → screen path:       │                         │
│  │ MAINTENANCE_UPDATE →           │                         │
│  │   /(landlord)/maintenance/123  │                         │
│  └──────┬─────────────────────────┘                         │
│         │                                                    │
│         ▼                                                    │
│  ┌────────────────────────────────┐                         │
│  │ router.push(destination)       │                         │
│  │ - Navigates to correct screen  │                         │
│  │ - Loads data for entity        │                         │
│  └────────────────────────────────┘                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Cache Isolation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 Scope-Based Cache Isolation                  │
│                                                              │
│  Problem: Prevent cross-tenant data leaks when:             │
│  - User switches organization                                │
│  - Different user signs in on same device                   │
│  - Session is revoked/expired                               │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  SessionProvider (src/auth/session.tsx)                │ │
│  │                                                        │ │
│  │  const scope = `${userId}:${orgId || 'none'}`         │ │
│  │  const [readyScope, setReadyScope] = useState(scope)  │ │
│  │                                                        │ │
│  │  useLayoutEffect(() => {                              │ │
│  │    if (readyScope !== scope) {                        │ │
│  │      queryClient.clear()    // ← CLEAR ALL CACHE      │ │
│  │      setReadyScope(scope)   // ← RE-MOUNT TREE        │ │
│  │    }                                                  │ │
│  │  }, [scope])                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Query keys are scoped:                                      │
│                                                              │
│  useQuery({                                                  │
│    queryKey: [scope, 'renterDashboard'],                    │
│    //         ↑                                              │
│    //         Ensures isolation                             │
│  })                                                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Lifecycle Example:                                    │ │
│  │                                                        │ │
│  │  1. User A signs in (org: "org_abc")                  │ │
│  │     scope = "user_123:org_abc"                        │ │
│  │     cache keys: ["user_123:org_abc", "dashboard"]     │ │
│  │                                                        │ │
│  │  2. User A switches to org "org_xyz"                  │ │
│  │     New scope = "user_123:org_xyz"                    │ │
│  │     → queryClient.clear() called                      │ │
│  │     → All "org_abc" data removed                      │ │
│  │     → Tree re-mounts with new scope                   │ │
│  │                                                        │ │
│  │  3. User B signs in on same device                    │ │
│  │     New scope = "user_789:org_def"                    │ │
│  │     → queryClient.clear() called                      │ │
│  │     → All User A data removed                         │ │
│  │     → Fresh start for User B                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Why clear() instead of invalidateQueries()?                │
│  - Invalidation keeps stale data visible during refetch     │
│  - Clearing ensures NO cross-tenant data is ever shown      │
│  - Trade-off: Brief loading state vs. security guarantee    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Offline Handling

```
┌─────────────────────────────────────────────────────────────┐
│              Network State Detection & Handling              │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  NetInfo Listener (src/query/query-client.ts)         │ │
│  │                                                        │ │
│  │  NetInfo.addEventListener(state => {                  │ │
│  │    if (state.isConnected) {                           │ │
│  │      onlineManager.setOnline(true)                    │ │
│  │      queryClient.resumePausedMutations()              │ │
│  │      queryClient.invalidateQueries()                  │ │
│  │    } else {                                           │ │
│  │      onlineManager.setOnline(false)                   │ │
│  │    }                                                  │ │
│  │  })                                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Query Behavior (React Query Config)                  │ │
│  │                                                        │ │
│  │  Offline:                                             │ │
│  │  - Queries: Return cached data, mark as stale         │ │
│  │  - Mutations: Pause execution (queued)                │ │
│  │  - Retries: Suspended until reconnect                 │ │
│  │                                                        │ │
│  │  Online:                                               │ │
│  │  - Resume paused mutations (FIFO order)               │ │
│  │  - Refetch stale queries                              │ │
│  │  - Enable background refresh                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  UI Feedback:                                                │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  <OfflineBanner /> (always visible)                    │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ ⚠️ You're offline. Some features unavailable.    │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Component state:                                            │
│  const { isOnline } = useNetInfo()                          │
│                                                              │
│  {isOnline ? (                                              │
│    <Button onPress={submitPayment} />                       │
│  ) : (                                                       │
│    <Button disabled label="Connect to internet" />          │
│  )}                                                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Retry Strategy                                        │ │
│  │                                                        │ │
│  │  Failed query:                                         │ │
│  │  1st retry: Immediate                                  │ │
│  │  2nd retry: 1s delay                                   │ │
│  │  3rd retry: 2s delay (exponential backoff)             │ │
│  │  Give up after 3 attempts                              │ │
│  │                                                        │ │
│  │  Network errors: Retry                                 │ │
│  │  4xx errors: Don't retry (client error)                │ │
│  │  5xx errors: Retry with backoff                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**End of Architecture Diagrams Document**

For implementation details, refer to:
- `/docs/mobile/` - Architecture Decision Records
- `/src/` - Source code with inline documentation
- `README_NEW.md` - Project overview and setup

---

**Document Version**: 1.0  
**Last Updated**: November 2, 2026  
**Maintained By**: Hassan Mohamed (@hassan200503)
