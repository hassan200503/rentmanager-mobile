# Environments, builds and store release

## Environments

| | development | staging | production |
|---|---|---|---|
| `APP_ENV` | development | staging | production |
| App name | RentManager Dev | RentManager Staging | RentManager |
| Bundle / package id | `com.rentmanager.app.dev` | `com.rentmanager.app.staging` | `com.rentmanager.app` |
| URL scheme | `rentmanager-dev` | `rentmanager-staging` | `rentmanager` |
| API must be HTTPS | no | yes | yes |
| EAS profile | `development` (dev client) | `staging` (internal APK) | `production` (AAB / IPA) |

All three install side by side.

The backend and web stack are deployed with
`rentmanager-backend/deploy/README.md`. Mobile builds point at its
`https://api.<domain>/api/v1`. The `staging` profile reads the EAS **preview**
environment; `production` reads **production**.

## Values to supply (EAS environment variables — not the repo)

Public (compiled into the app):
- `EXPO_PUBLIC_API_BASE_URL` — e.g. `https://api.<domain>/api/v1`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — `pk_live_…` for production
- `EXPO_PUBLIC_CLERK_JWT_TEMPLATE` — `backend`
- `EXPO_PUBLIC_WEB_APP_URL`
- `EXPO_PUBLIC_SENTRY_DSN` (optional)

Build-time secrets / config:
- `EAS_PROJECT_ID`, `EXPO_OWNER`
- `SENTRY_AUTH_TOKEN` (secret), `SENTRY_ORG`, `SENTRY_PROJECT`
- GitHub secret `EXPO_TOKEN` for `release.yml`

Credentials managed by EAS:
- Android upload keystore; FCM v1 service account JSON
- Apple distribution certificate, provisioning profiles, APNs key

Clerk dashboard (production instance):
- Enable the native application for the iOS bundle id and Android package,
  so hosted auth redirects (`clerk://<id>.hosted-callback`) are allowed.

Backend:
- `PUSH_EXPO_ACCESS_TOKEN` if Expo enhanced push security is enabled.
- `MOBILE_MINIMUM_VERSION`, `MOBILE_LATEST_VERSION`, `MOBILE_ANDROID_STORE_URL`,
  `MOBILE_IOS_STORE_URL` (defaults 1.0.0 / none).
- Media storage (Cloudinary) configured — repair photos depend on it and use
  private `authenticated` delivery.
- Flyway V97–V102 apply on deploy (push devices, rent idempotency key, push
  tickets, notification preferences, account deletion requests, maintenance
  attachments). V98 replaces the `rent_transactions` append-only trigger
  function; it was applied to the local dev database with real rows.

## Versioning

- `version` (semver, user-visible) in `app.config.ts`.
- Build numbers are remote and auto-incremented by EAS
  (`appVersionSource: remote`, `autoIncrement` on production).
- The API is additive; older app versions keep working. If a release must be
  withdrawn, raise `MOBILE_MINIMUM_VERSION`: older apps show an update screen
  (fails open when the config can't be reached).

## Rollout

staging build → internal testers (Play internal track / TestFlight) → production
build → Play staged rollout (start 10%) / App Store phased release.

## Build locally

```bash
npx eas build --profile development --platform android
```

## Store listing items needing a human decision

Privacy policy URL, data-safety / App Privacy answers (data collected: name,
email, phone, rent and payment records, device push token, crash diagnostics),
account deletion (in-app now: More → Delete account; owners are routed to
review — the store listing also needs a web deletion URL, which does not exist
yet), support URL, screenshots, content rating. Declared permissions: camera
(repair photos), notifications; photo library via the system picker.
