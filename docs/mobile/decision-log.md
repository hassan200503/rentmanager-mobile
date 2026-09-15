# RentManager Mobile — decision log

Each entry: problem, options, decision, reason, trade-offs, where it lives, how
it was verified. Newest decisions are appended; superseded ones are marked, not
deleted.

---

## D-01 · Framework: Expo (React Native), managed workflow with dev builds

**Problem.** Choose the mobile stack for a product whose backend is Spring Boot
and whose only client today is a Next.js/TypeScript app using React Query and
Clerk.

**Options.** Expo managed + EAS · bare React Native · Flutter · native Kotlin/Swift.

**Decision.** Expo SDK 57, expo-router, EAS Build/Submit, development builds
(`expo-dev-client`) rather than Expo Go.

**Reason.**
- Same language and libraries as the web client: TypeScript, React Query,
  Clerk's first-party Expo SDK (`@clerk/expo`). The team maintaining the web
  app can maintain this without learning Dart, Kotlin and Swift.
- Types generated from the backend's OpenAPI with the same tool the web repo
  already depends on (`openapi-typescript`).
- Every native capability needed is covered by maintained Expo modules:
  SecureStore (Keychain/Keystore), Notifications (APNs/FCM via Expo Push),
  config plugins for permissions and deep links. No custom native code.
- EAS gives reproducible cloud builds and credential management for both
  stores without a Mac on this team.

**Trade-offs.** A JS runtime on low-end Android (mitigated: Hermes, virtualised
lists, no animation libraries, no disk cache). Native builds require EAS or a
local Android SDK/Xcode — neither is on the development machine today.

**Not chosen.** Flutter would duplicate every DTO in Dart and lose Clerk's
first-party SDK. Native would double the client code for a small team.

---

## D-02 · Authentication: Clerk hosted Account Portal (`useHostedAuth`)

**Problem.** Sign-in must reach the same Clerk instance as the web and produce
the same `backend` JWT template the Spring resource server verifies.

**Options.** Custom email/password + OTP screens (`useSignIn`) · Clerk native
components · hosted Account Portal in the system browser.

**Decision.** Hosted Account Portal for sign-in and sign-up; tokens cached in
SecureStore via `@clerk/expo/token-cache`; API calls use
`getToken({ template: 'backend' })`.

**Reason.** The app never handles a password or one-time code; every method
configured on the web (email, phone, social, MFA) works with no second
implementation; Clerk owns bot protection and account recovery. It is also the
smallest attack surface we can ship.

**Trade-offs.** A browser hop at sign-in. Android requires the `@clerk/expo`
config plugin and a native rebuild for the redirect intent filter.

---

## D-03 · Persona comes from backend authorities, not claims

**Problem.** The web decides landlord/renter/admin from Clerk `publicMetadata`
and JWT claims, with a documented migration-window fail-open. A mobile client
copying that logic inherits the same drift.

**Decision.** New endpoint `GET /api/v1/users/me/access` returns the
authorities the backend actually granted (landlord role, renter, pending
onboarding, platform admin). The entry gate routes on that alone.

**Reason.** The UI can never disagree with what `@PreAuthorize` will do. It is
a hint only; every endpoint still enforces its own gate.

**Verified.** `SessionAccessResolverTest` (7 cases, additive roles included).

---

## D-04 · Money in the OpenAPI contract is a decimal string

**Problem.** `JacksonConfig` serialises every `BigDecimal` as a JSON string;
springdoc described them as `number`. A generated client would be lied to —
the exact defect TD-102 fixed by hand on the web.

**Decision.** `OpenApiMoneySchemaConfig` maps `BigDecimal` to
`type: string, format: decimal` in the published contract.

**Mobile rule.** No business arithmetic on money. `formatMoney` formats the
string digit-by-digit (no float), totals come from the backend.

**Verified.** Regenerated schema; `lib.test.ts` covers rounding and values
beyond double precision.

---

## D-05 · Cache isolation by clearing, not invalidating

**Problem.** Switching organisation, signing out, or a second person signing in
on a shared phone must never show the previous scope's data, even for a frame.

**Decision.** Every query key starts with `scope = <clerkUserId>:<orgId>`.
`SessionProvider` renders nothing when the scope changes, calls
`queryClient.clear()` in a layout effect, then remounts the tree keyed by the
new scope.

**Reason.** Invalidation keeps stale rows on screen while refetching —
precisely the leak to prevent.

**Trade-off.** A brief reload after switching. Acceptable.

---

## D-06 · No server state persisted to disk (v1)

**Problem.** Offline access vs. privacy on phones that are often shared.

**Decision.** React Query cache in memory only. Offline shows whatever was last
loaded in this app session plus a persistent offline banner. Only three small
values are stored on disk, all in SecureStore: Clerk's session token, the push
token (to unregister it), and an in-flight payment request id.

**Reason.** Persisting would write renter names, phone numbers, balances and
lease terms into unencrypted AsyncStorage. SecureStore is not suited to large
payloads. The mobile workflows that matter offline (seeing what you owe, a
unit's renter) are also the most sensitive.

**Revisit when.** Field feedback shows landlords need portfolio data with no
signal. The path then is encrypted SQLite keyed from SecureStore, scoped and
wiped per `scope`.

---

## D-07 · Retry classification

- Reads: React Query retries up to 2× on offline/timeout/network/5xx/429 only.
- One silent token refresh and re-send on 401 — **GET only**.
- Mutations: never retried automatically.
- Payment initiation after a timeout is an *uncertain send*: the renter is told
  to check their phone and retry is gated for 30s. The backend separately reuses
  a PENDING request for the same entry for 3 minutes (ADR-0016) and rate-limits
  STK pushes per renter to one per 20s.

---

## D-08 · Push: Expo Push Service over the existing notification outbox

**Problem.** No push channel existed. Must be tenant-safe, survive a phone
changing hands, and put nothing sensitive on a lock screen.

**Decision.**
- `push_devices` table (V97) keyed by Clerk user id; a token has one owner;
  registering it under a new person moves ownership.
- `NotificationChannel.PUSH` rows in the existing `notification_deliveries`
  outbox, one per device, reusing retry/backoff/give-up.
- Ownership re-checked at send time; a delivery queued for a previous owner is
  dropped.
- Lock-screen copy is generic; payload is `{type, id}` only. The app fetches
  the real content after authentication, and the backend authorises it.
- Triggers: `RentPaymentApplied` (renter), `MaintenanceRequestStatusChanged`
  (renter), `MaintenanceRequestSubmitted` (landlord org members), all
  `AFTER_COMMIT`.

**Reason for Expo Push.** The backend holds no APNs/FCM credentials; those live
in the Expo project per environment.

**Receipts (added later, V99).** Ticket ids are stored and `PushReceiptService`
polls Expo receipts every 15 minutes, revoking tokens reported as
`DeviceNotRegistered`; tickets are discarded after Expo's 24h retention.

**Preferences (V100).** Per-person push on/off for RENT_PAYMENTS and
MAINTENANCE, default on, checked at enqueue. SMS/email/WhatsApp unaffected.

**Verified.** `PushDeviceServiceTest`, `PushNotificationServiceTest`,
`ExpoPushSenderInterpretTest`.

---

## D-09 · Analytics: allow-listed, property-free seam; no vendor yet

Event names only, no properties, so nothing sensitive can be attached by
accident. Choosing a vendor is a product/privacy decision (data processing
terms, Kenya Data Protection Act 2019 registration) and is left open.

---

## D-10 · Lease actions on mobile, driven by backend `allowedActions` (superseded v1 "web only")

**Change.** `LeaseDetailResponse.allowedActions` is computed by
`LeaseActionPolicy` from the lease status; `LeaseActionPolicyTest` executes
every offered action (and every refused one) against a real `Lease` aggregate
for all 10 statuses, so the list cannot drift from the domain guards. The app
renders exactly those actions, each with its own confirmation (reason for
reject/cancel/terminate, termination type, renewal start date).

**Defects fixed on the way.**
- `Lease.cancel()` refused only ACTIVE, so an occupied RENEWED lease, or one
  already TERMINATED/EXPIRED/CANCELLED, could be cancelled. Now only leases
  that never went live are cancellable (reservation compensation still works).
- Terminate/renew recorded the actor as `"SYSTEM"`; the controller now sets the
  authenticated user's email and ignores any client-supplied actor.
- `performedBy` was required but unused; no longer required.

Cross-organisation lease ids still return 403 (asserted by `LeaseApiTest`);
404 would avoid confirming existence — left as is rather than change a
security test's contract.

---

## D-11 · Maintenance photos: private storage, served through the API (superseded "no photos")

**Backend (V102).** `maintenance_attachments`; photos stored as Cloudinary
`authenticated` assets and streamed by the API after authorisation — the
organisation that owns the request, or the renter who raised it. No public or
shareable URL exists. Content is validated by magic bytes (not the declared
type), ≤5 MB, ≤5 per request; responses are `private, no-store`.
Also fixed: Spring's 1 MB multipart default silently blocked the existing
5 MB property/unit uploads (now 5 MB, with a 413 handler).

**Mobile.** Pick or take a photo only when the person asks (permission at
point of use, EXIF dropped), resize to 1600 px JPEG q0.7 on device, upload with
progress via XHR, per-photo retry; a failed photo never loses the report.

**Verified.** `MaintenanceAttachmentServiceTest` (6), real-Postgres
`MaintenanceAttachmentIntegrationTest` (renter/other renter/other org/wrong
request, DB CHECK constraint).

---

## D-12 · Maintenance status rules (TD-132, resolved when asked to close all gaps)

Nothing moves back to SUBMITTED; CANCELLED is terminal (not even a note);
COMPLETED can only reopen to IN_PROGRESS; the working states move freely and
can close. Same status + note is still a reply. Refused moves return 409 with
readable copy. `MaintenanceRequestResponse.allowedNextStatuses` publishes the
options; both the web dropdown and the mobile screen render from it.
`MaintenanceStatusTransitionTest` (16). Mobile keeps Cancel off the phone.

---

## D-13 · Kenyan mobile numbers include the 01XX range

Backend validation and three web helpers accepted only `07…`. Safaricom's
`0110–0115` lines are M-Pesa capable; renters on them could not pay rent or
reserve. Fixed in one shared rule (`KenyanMsisdn`, `lib/mpesa/phone.ts`, mobile
`lib/phone.ts`) with tests on all three.

---

## D-14 · Idempotent manual rent transactions (V98)

A cash payment has no external reference, so the V33 duplicate guard never
applied and each POST minted a new correlation id: a double tap or a retry
after a timeout recorded the cash twice in an append-only ledger. Clients send
`Idempotency-Key`; it is stored on `rent_transactions` with a unique partial
index per organisation (the database refuses the race), included in the V81
append-only trigger, and a key reused for a different entry is refused.
Mobile creates one key per "Record payment" sheet and reuses it on retry.
Verified: `RentLedgerIdempotencyTest` (4), two real-Postgres tests in
`RentLedgerPersistenceIntegrationTest`, `RentLedgerCommandControllerSecurityTest`.

## D-15 · Renter portal served the wrong tenancy, or crashed

- A renter with profiles under two landlords (they moved) made
  `findByClerkUserId` (Optional) throw — the whole portal failed. Now the
  current tenancy is chosen deterministically (live lease, then pending, then
  most recent) from `findAllByClerkUserId`; the Optional finder was removed.
- RENEWED leases are billed by `RentChargeScheduler` but portal payment,
  auto-pay and next-due projection required ACTIVE — renewed renters could not
  pay. Current = ACTIVE or RENEWED everywhere in `TenantPortalService`.
Verified: `TenantPortalCurrentTenancyTest`, existing portal suites.

## D-16 · Landlord maintenance creation trusted body ids

`POST /api/v1/maintenance` stored unit/property/renter/lease ids from the body
unchecked, so another organisation's renter could be attached (and then shown
by name). `LandlordMaintenanceSubmissionGuard` requires every id to belong to
the caller's organisation and to agree with each other; `createdBy` comes from
the token. `LandlordMaintenanceSubmissionGuardTest` (5).

## D-17 · Account deletion (V101)

In-app deletion for store compliance. Owners of a landlord organisation get a
recorded PENDING_REVIEW (the organisation and its renters depend on them).
Everyone else: Clerk user deleted strictly (a refusal changes nothing), then in
one transaction devices revoked, preferences deleted, the account row's Clerk
id/email/name tombstoned, renter profiles unlinked. Landlords' tenancy and
payment records are kept — **legal review needed** on whether any renter data
must also be erased on request under the Kenya Data Protection Act 2019.
Clerk `user.deleted` webhook runs the same local erasure.
`AccountDeletionServiceTest` (4).

## D-18 · Minimum supported version

`GET /api/v1/public/mobile/config` (MOBILE_MINIMUM_VERSION etc.). The app
blocks below the floor with a store link and fails open if the config is
unreachable, so an outage never locks everyone out.
