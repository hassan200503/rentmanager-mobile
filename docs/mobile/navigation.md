# Navigation and product scope

Designed around what people do on a phone, not around the web sidebar.

## Renter — "what do I owe, pay it, get things fixed"

| Tab | Content | Primary action |
|---|---|---|
| Home | balance, overdue, next due date, unread announcements, open repairs | Pay with M-Pesa |
| Pay | amount (prefilled), M-Pesa number, live payment status | Pay |
| Repairs | own requests, landlord's latest reply, schedule | Report an issue |
| Lease | dates, rent, deposit, landlord/manager/emergency contacts | Call |
| More | account, switch to landlord view, notifications, sign out | — |

Hidden routes: payment history, announcements, report issue.

## Landlord — "what needs attention right now"

| Tab | Content | Primary action |
|---|---|---|
| Home | collected / outstanding / overdue (ledger), occupancy (SQL counts), new repairs urgent-first, M-Pesa setup warning | open item |
| Rent | ledger-marked overdue entries, balance still owed, days late | open lease |
| Repairs | filterable list, unviewed badge on tab | open → move status + message renter |
| Renters | debounced search over leases, status filter | open → call / SMS, rent account |
| More | account, organisation switch, switch to rental view, notification settings, properties & units, log a repair, delete account, sign out | — |

Landlord additions: lease actions from `allowedActions` (approve, request
deposit, activate, reject, cancel, end tenancy, renew) with confirmations;
"Record cash payment" on unpaid rent entries (idempotent); repair photos;
add property and add unit (OWNER/MANAGER); log a repair for a renter.

Renter additions: request detail with photos; photos when reporting.

## Still web-only, and why

| Workflow | Why |
|---|---|
| Creating leases and renter profiles | multi-step, identity documents, deposit set-up |
| Daraja credentials, payout destination | secrets and money routing; deliberately on a large screen |
| Adjustments, refunds, reversals, overpayment resolution, deposit refunds | money leaving or being rewritten; OWNER/MANAGER review |
| Subscription billing | app-store rules restrict selling digital subscriptions in-app outside IAP; RentManager bills landlords by M-Pesa |
| Tax, team invites, branding, reviews, platform admin | low frequency, large-screen workflows |
| Cancelling a repair request | closes it for the renter without an answer |

## Product gaps remaining

- Reservations are a public web funnel only; no authenticated renter
  reservation API exists to build a mobile flow on.
- Rent reminders are not delivered by push (reminder policies are SMS/email/WhatsApp).
