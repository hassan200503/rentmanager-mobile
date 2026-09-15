# Security

The binary is assumed hostile: anything in it is public, and any request it can
make can be replayed or modified. Every control below is either enforced by the
backend or limits what a lost or shared phone exposes.

## Identity and isolation

- The organisation is derived **only** from the verified Clerk JWT
  (`tenant_id` claim → `tenants.clerk_org_id`). The app sends no tenant or
  organisation id in any header or body; `client.test.ts` asserts no
  `X-Tenant-Id` is sent.
- Renter endpoints (`/tenant-portal/**`) take no renter id at all — the renter
  is the token subject.
- Landlord endpoints carry `@PreAuthorize` and repository scoping by
  `TenantContext`. A UUID for another organisation's lease or request returns
  404/403; the app renders "not available" and nothing else.
- Role-gated UI (`can.*`) mirrors backend gates as a hint only.

**Verified live (2026-09-15):** `/users/me/access`, `/devices/push`,
`/devices/push/unregister`, `/tenant-portal/dashboard`, `/maintenance` return
401 with no token and with a forged unsigned (`alg: none`) token that claims a
victim organisation.

**Not yet verified end-to-end:** two real Clerk accounts in two organisations
exercising each resource by manipulated id through the app. This needs test
accounts and a device; see testing.md §Manual acceptance.

## Storage

| Data | Store | Notes |
|---|---|---|
| Clerk session | SecureStore (Keychain / Keystore) | via `@clerk/expo/token-cache` |
| Push token | SecureStore | needed to unregister on sign-out |
| In-flight payment request id | SecureStore | resumes after OS kills app |
| Server data | memory only | cleared on any scope change (D-05, D-06) |

Android `allowBackup: false` keeps app data out of cloud backups.

## Cross-user leakage on shared phones

- Sign-out order: unregister push → clear local payment marker → Clerk sign-out
  → `SessionProvider` clears the whole query cache.
- A push token registered by a new person moves to them (backend); queued
  deliveries are re-checked against the owner at send time and dropped if the
  device changed hands.
- Lock-screen notification text is generic; payload is `{type, id}`; Android
  channel visibility is PRIVATE.

## Secrets

No secret is compiled into the app. CI greps both platform bundles for secret
key patterns (`sk_…`, `whsec_…`, Daraja, Cloudinary) and fails if found. Last
local run: clean. The Sentry DSN and Clerk publishable key are public by design.

## Transport

`env.ts` refuses a non-HTTPS API URL for staging and production builds.
Certificate pinning is not implemented (open: see risks).

## Logging and monitoring

- No `console.log` of tokens, phone numbers or bodies; analytics events carry
  no properties.
- Sentry: `sendDefaultPii: false`, user = opaque Clerk id only, request data,
  headers and query strings removed, UUIDs in URLs replaced with `:id`.

## Permissions

`POST_NOTIFICATIONS` when the person taps "Turn on notifications"; camera when
they tap "Take photo"; photos through the system picker. Nothing at launch.
Microphone, overlay and external storage are blocked.

## Private photos

Repair photos are never publicly addressable: stored as Cloudinary
`authenticated` assets, streamed by the API after an organisation/renter check,
`Cache-Control: private, no-store`. Uploads are validated by magic bytes, EXIF
(including location) is dropped on the phone before upload.

## Backend defects closed while building mobile

Cross-organisation ids on landlord maintenance creation (D-16); client-supplied
lease actor (D-10); duplicate cash recording (D-14); renter portal crash for
people with two landlords and renewed-lease payment refusal (D-15); 07-only
phone validation (D-13); unconstrained repair statuses (D-12).
