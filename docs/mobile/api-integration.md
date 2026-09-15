# API integration

## Contract pipeline

```
Spring controllers + DTOs
   └─ springdoc  /v3/api-docs   (BigDecimal published as string/decimal)
        └─ npm run api:types    → openapi/rentmanager.json (committed snapshot)
                                → src/api/schema.d.ts      (generated)
             └─ src/api/types.ts aliases → features
```

- Regenerate after any backend DTO change: start the backend, `npm run api:types`,
  review the diff of both files.
- CI runs `npm run api:check` (types match snapshot) and `contract.test.ts`
  (every path the app calls exists with that method).
- Never hand-write a DTO or cast around a type error. Fix the backend contract.

## Conventions the client relies on

- Envelope: `{ success, message, data, errorCode, timestamp }`. Exceptions:
  `POST /onboarding/tenant` returns a bare object (`unwrapped: true`).
- Money: decimal strings. Format only; never add.
- `LocalDate` fields (`dueDate`, `startDate`) vs `Instant` fields
  (`createdAt`) are formatted by different functions (`lib/dates.ts`).
- Pagination: `/leases` is paged (`page`, `size`, `PageResponse`); renter
  history is paged (Spring `Page` shape). `/maintenance` and
  `/rent-ledger/entries/status/{status}` return full lists today — acceptable
  at current portfolio sizes, flagged as a scaling item.

## Endpoints used

Renter: `/tenant-portal/dashboard`, `/lease`, `/payments/history`,
`/rent-payments/initiate`, `/rent-payment-requests/{id}/status`,
`/maintenance` (GET, POST), `/announcements`, `/announcements/{id}/read`.

Landlord: `/rent-ledger/summary`, `/rent-ledger/entries/status/OVERDUE`,
`/rent-ledger/leases/{id}/entries`, `/units/summary`, `/maintenance`,
`/maintenance/{id}`, `/maintenance/{id}/status`, `/maintenance/unviewed-count`,
`/leases`, `/leases/{id}`, `/onboarding/progress`.

Shared: `/users/me/access`, `/onboarding/tenant`, `/devices/push`,
`/devices/push/unregister`.
