# Payments (M-Pesa STK push)

RentManager does not use Stripe. Rent is paid by M-Pesa STK push signed with
the **landlord's own Daraja credentials** and settles in the landlord's Till or
Paybill (`CollectionMode.DIRECT`). The platform records the payment; it never
holds the money. App copy says "paid to your landlord".

## Flow

```
Pay screen ── POST /tenant-portal/rent-payments/initiate {amount, mpesaPhone}
   │             backend: 20s per-renter rate limit, reuse PENDING request
   │             for same entry within 3 min (ADR-0016), Daraja STK push
   ▼
awaiting ── GET /tenant-portal/rent-payment-requests/{id}/status  (3s → 5s → 10s)
   │             renter enters PIN on the M-Pesa dialog
   │             Safaricom callback → ledger (append-only, duplicate-guarded)
   ▼
PAID (receipt)   │  FAILED   │  still PENDING after 2 min → "unconfirmed"
```

The state machine is `src/features/renter/payment-flow.ts`, fully unit-tested.

## Rules the code enforces

- "Payment received" appears **only** when the backend request is `PAID`.
- A timeout or network error while initiating is an **uncertain send**: the
  renter is told to check their phone, and "Pay" is disabled for 30s.
- Unconfirmed after the watch window: "please don't pay again", with a manual
  check. A late `PAID` still resolves it.
- Double taps cannot start a second payment while one is in flight.
- The in-flight request id is saved in SecureStore; if Android kills the app
  while the M-Pesa PIN dialog is in front, reopening resumes watching it.
- Returning to the foreground triggers an immediate status check.
- Amounts are whole shillings (M-Pesa). A balance with cents is rounded **up**
  for the prefill so the balance clears. The backend validates again.
- Phone numbers: `07…` and `01…` Kenyan mobiles (D-13).

## Not in the app, by design

Auto-pay settings, deposit refunds, overpayment resolution, manual payment
recording, and Daraja credential setup remain on the web.

## Tested against

Unit: state machine (13 cases), money formatting, phone rules, API client
non-retry of POST. **Not yet tested against Safaricom sandbox from a device** —
requires a dev build on a phone and a sandbox-configured landlord.
