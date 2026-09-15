# Offline and network failure

## Classification

| Data / action | Offline behaviour |
|---|---|
| Dashboard, lease, repairs, overdue list, renters | show what was loaded this session, offline banner |
| Balance / amounts | shown with the banner; never replaced by a synthesised zero |
| Pay rent | online only; never queued |
| Report a repair / reply to renter | online only; form input is kept on failure for retry |
| Organisation switch, onboarding | online only |

No offline mutation queue: every write in scope either moves money, notifies a
person, or changes state someone else acts on. Silently replaying them later
is worse than asking the user to retry.

No disk persistence of server data in v1 (D-06): a cold start offline shows
loading → error with "Try again".

## Failure handling

| Case | Behaviour |
|---|---|
| No connectivity | NetInfo → React Query `onlineManager` pauses fetching; banner |
| Timeout (15s; 30s for STK initiation) | typed `timeout`; reads retried ≤2× with back-off |
| DNS / TLS / connection | typed `network`, same as above |
| 401 | one token refresh for GET; otherwise session-ended banner |
| 403 | "You don't have permission" / "not available" |
| 404 | "This item isn't available" — never reveals whether it exists elsewhere |
| 409 / 400 | backend-authored message shown (it is UI copy) |
| 5xx | generic message; body never shown; retry offered |
| Cancelled (screen left) | abort signal; no error shown |
| Duplicate submission | buttons disabled while pending; payment state machine blocks re-send; backend de-duplicates STK |
| App backgrounded / killed | React Query refetches on focus; in-flight payment resumes from SecureStore |
| Reconnect | `refetchOnReconnect` |
