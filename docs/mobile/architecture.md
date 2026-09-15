# Architecture

RentManager Mobile is a thin, first-class client of the existing Spring Boot
backend. It contains presentation, request orchestration, client-side
validation and device integration. It contains **no business rules**: balances,
lease state, payment state, permissions and organisation isolation are decided
by the backend on every request.

```
Phone ─ Clerk hosted auth (system browser) ─► Clerk session in SecureStore
  │
  │  Authorization: Bearer <Clerk "backend" JWT>   (no tenant header, ever)
  ▼
Spring Boot /api/v1  ─ JWKS verify ─ tenant_id claim → tenants.clerk_org_id
  │                    ─ authorities: LANDLORD_OWNER/MANAGER/STAFF, TENANT, PENDING
  ▼
PostgreSQL  ── notification_deliveries (outbox) ── Expo Push ── APNs / FCM ─► Phone
```

## Layout

```
app/                         expo-router routes (file = screen)
  _layout.tsx                providers, protected route groups, banners
  index.tsx                  entry gate: GET /users/me/access → experience
  sign-in.tsx                Clerk hosted auth
  onboarding.tsx             landlord setup (shared backend path with web)
  no-access.tsx              platform admin without landlord/renter account
  (renter)/                  Home · Pay · Repairs · Lease · More (+ hidden routes)
  (landlord)/                Home · Rent · Repairs[/:id] · Renters[/:id] · More
src/
  api/                       client.ts (fetch, timeouts, envelope), errors.ts,
                             schema.d.ts (GENERATED), types.ts (aliases)
  auth/                      session.tsx (API client + cache scope), sign-out.ts
  config/env.ts              public build config, validated at startup
  features/access            persona from backend authorities, role hints
  features/renter            queries, payment state machine + hook
  features/landlord          queries
  notifications/             push registration, tap routing, deep-link map
  observability/             Sentry (scrubbed), analytics seam
  query/query-client.ts      React Query defaults, NetInfo/AppState wiring
  lib/                       money, dates, phone — pure, tested
  ui/                        theme tokens, primitives
  components/                shared composite components
openapi/rentmanager.json     committed contract snapshot
scripts/generate-api-types   snapshot → schema.d.ts, --check for CI
```

## State

| Kind | Where | Why |
|---|---|---|
| Server state | React Query, keys prefixed by `scope` | cache, retries, invalidation |
| Session | Clerk (SecureStore via token cache) | never in JS globals or AsyncStorage |
| UI state | component state | nothing global |
| Persisted app state | SecureStore: push token, in-flight payment id, experience preference | small, non-sensitive ids |

There is no Redux/Zustand store and no local database (decision D-06).

## Backend changes made for mobile

All first-class, none mobile-specific in behaviour:

1. `GET /api/v1/users/me/access` — session authorities for routing (D-03).
2. OpenAPI publishes `BigDecimal` as a decimal string (D-04).
3. Push: `push_devices` (V97), `POST /api/v1/devices/push`, `POST
   /api/v1/devices/push/unregister`, `NotificationChannel.PUSH`,
   `PushNotificationListener` (D-08).
4. Kenyan `01XX` mobile numbers accepted for M-Pesa, reservations and payout
   (D-13) — also fixed in three web helpers.
