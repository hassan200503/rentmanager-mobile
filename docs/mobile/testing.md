# Testing

## Automated (run on every CI build)

| Command | What it proves |
|---|---|
| `npm run typecheck` | app compiles against the generated backend contract |
| `npm run api:check` | `schema.d.ts` matches the committed OpenAPI snapshot |
| `npm run test:ci` | 119 unit tests (below) |
| `expo export` (android, ios) | Metro/Hermes bundles build; imports resolve |
| bundle secret grep | no secret key patterns shipped |
| `expo-doctor` | SDK/dependency/config consistency (21/21) |

Unit suites:
- `payment-flow.test.ts` — paid only on PAID, uncertain send, unconfirmed,
  late PAID, double tap, reset safety, resume after kill, polling back-off.
- `client.test.ts` — envelope, no tenant header, GET-only 401 refresh, no POST
  replay, error mapping, 5xx bodies never shown, fail-closed without token.
- `lib.test.ts` — money exactness (beyond double precision), LocalDate vs
  Instant in Nairobi time, Kenyan phone rules, cash amount parsing, decimal
  comparison, semver (minimum-version gate).
- `routing-and-access.test.ts` — experience from authorities, cache scope,
  deep-link validation, monitoring URL scrubbing.
- `contract.test.ts` — every path the app calls exists in the contract, with
  negative controls.

Backend (Maven, `mvn clean test -pl .`): 1,585 tests, 0 failures, 0 errors on
2026-09-15. Added for mobile: `SessionAccessResolverTest` (7),
`PushDeviceServiceTest` (6), `PushNotificationServiceTest` (9),
`ExpoPushSenderInterpretTest` (4), `PushReceiptServiceTest` (3),
`PushPersistenceIntegrationTest` (4, real Postgres), `KenyanMsisdnTest` (21),
`RentLedgerIdempotencyTest` (4) + 2 persistence ITs, `MaintenanceStatusTransitionTest`
(16), `LeaseActionPolicyTest` (16), `TenantPortalCurrentTenancyTest` (2),
`LandlordMaintenanceSubmissionGuardTest` (5), `AccountDeletionServiceTest` (4),
`MaintenanceAttachmentServiceTest` (6), `MaintenanceAttachmentIntegrationTest`
(2, real Postgres). V97–V102 were applied to the local dev database by booting
the packaged jar.

Integration tests share one reusable Postgres container: any IT that writes
rows must be `@Transactional` (or clean up), or suites that delete from
`tenants` fail on foreign keys.

Web (`rentmanager-frontend`): `tsc` 0 errors, 113 tests.

## Manual acceptance (requires a device build and test accounts)

Not yet performed — the development machine has no Android SDK, emulator or
EAS account configured. Run on a `development` EAS build:

1. **Landlord:** sign up → onboarding → dashboard figures match web → open
   repair from push → reply with note → renter receives SMS + push.
2. **Renter:** sign in → balance matches web → pay KSh 1 on Safaricom sandbox
   → PIN → "Payment received" with receipt → history shows it.
3. **Kill during PIN:** force-stop app while M-Pesa dialog is open, reopen →
   still awaiting the same request, no second prompt.
4. **Organisation switch:** member of Org A and B → switch → no A rows visible
   at any point (screen record it).
5. **Shared phone:** User A signs out, User B signs in on the same phone →
   trigger an event for A → B's phone must not receive it.
6. **Manipulated ids:** open `/(landlord)/leases/<uuid of other org>` via a
   crafted link → "This lease isn't available."
7. **Network:** airplane mode on each tab → offline banner, last data shown,
   Pay disabled from sending; reconnect → refetch.
8. **Session revoked:** revoke session in Clerk dashboard → next request shows
   "Your session has ended".
9. **Accessibility:** TalkBack/VoiceOver through Pay and Report issue; largest
   font size — nothing truncated off-screen.
