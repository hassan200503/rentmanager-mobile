# Authentication

**Provider:** the same Clerk instance as the web app. **SDK:** `@clerk/expo`
(Core 3; `@clerk/clerk-expo` is deprecated). **Method:** Clerk hosted Account
Portal via `useHostedAuth` in the system browser (decision D-02).

## Lifecycle

| Stage | Implementation |
|---|---|
| Sign in / sign up | `app/sign-in.tsx` → `startHostedAuth({ mode })` |
| Session storage | `tokenCache` from `@clerk/expo/token-cache` (SecureStore) |
| Session restore | Clerk loads the cached session at launch; `isLoaded` gates the splash |
| Backend token | `getToken({ template: 'backend' })` per request (short-lived, cached by Clerk) |
| Expired token | client refreshes once (`skipCache`) and re-sends **GET** only |
| Revoked / rejected session | second 401 → `SessionRejectedBanner` → clean sign-out |
| Organisation | `setActive({ organization })`; the new token's `tenant_id` claim changes the backend scope |
| Sign out | `signOutEverywhere`: unregister push → clear local markers → Clerk `signOut` |

## Routing after sign-in

`app/index.tsx` calls `GET /users/me/access` and redirects to `(landlord)`,
`(renter)`, `onboarding` or `no-access`. Route groups re-check access and
redirect to `/` if it no longer holds. Signed-out, only `sign-in` is a
registered route (`Stack.Protected`).

## Onboarding handshake (shared with web)

1. Reuse the user's existing Clerk organisation or create one; `setActive`.
2. Refresh the token so it carries `tenant_id`.
3. `POST /onboarding/tenant` (bare response, not the envelope). A 403 means the
   organisation already exists (e.g. finished on the web) and is treated as done.
4. Refresh the token again — the one used in step 3 still carried
   `ROLE_PENDING_ONBOARDING` — then invalidate access and return to the gate.

## Clerk dashboard requirements

- Native applications enabled for each bundle id / package (`app.config.ts`).
- The `backend` JWT template must include `tenant_id` (org id), `email` and
  `platformRole`, exactly as the web uses.
- Android: the `@clerk/expo` config plugin is present; a native rebuild is
  required for the hosted-auth redirect intent filter.
