# RentManager Mobile

RentManager is a mobile app for landlords and renters in Kenya, built with Expo, React Native, and TypeScript. The app supports role-based workflows for both landlords and tenants, including rent tracking, maintenance requests, payment flows, announcements, and session-aware navigation.

## Overview

This repository contains the mobile client for the RentManager platform. It is structured around Expo Router screens and feature modules that connect to a backend API and use Clerk for authentication.

The app is split into two primary user experiences:

- Landlord experience: rent overview, occupancy status, maintenance triage, property and lease management screens
- Renter experience: home dashboard, balance and due dates, M-Pesa payment flow, maintenance reporting, announcements, and lease details

## Tech stack

- Expo SDK 57
- React Native
- React 19
- TypeScript
- Expo Router
- Clerk for Expo authentication
- TanStack React Query for query caching and data fetching
- OpenAPI-generated client and types
- Sentry for monitoring

## Key features

- Secure sign-in and session handling via Clerk
- Role-based navigation for landlords and renters
- Rent dashboard with collected/outstanding/overdue summaries
- Occupancy and property status tracking for landlords
- M-Pesa payment flow for renters
- Maintenance request creation and tracking
- Announcements and notifications
- Offline banner and session rejection handling
- Version gating for app compatibility

## Project structure

```text
.
├── app/                          # Expo Router screens and route groups
│   ├── (landlord)/              # Landlord-specific screens
│   ├── (renter)/                # Renter-specific screens
│   ├── _layout.tsx              # Root app layout and auth/navigation gate
│   ├── index.tsx                # App entry screen
│   ├── onboarding.tsx           # Onboarding flow
│   ├── sign-in.tsx              # Sign-in screen
│   ├── notifications.tsx       # Notifications screen
│   ├── delete-account.tsx       # Account deletion flow
│   ├── log-repair.tsx          # Repair reporting screen
│   ├── no-access.tsx            # Access denied flow
│   └── properties/              # Property-related routes
├── src/                         # Application source code
│   ├── api/                     # OpenAPI client and API helpers
│   ├── auth/                    # Clerk/session authentication helpers
│   ├── components/              # Shared components
│   ├── config/                  # Runtime config and environment utilities
│   ├── features/                # Feature modules (landlord/renter/queries)
│   ├── lib/                     # Date, money, utility helpers
│   ├── notifications/           # Notification router and notification handling
│   ├── observability/           # Sentry/monitoring setup
│   ├── query/                   # React Query client setup
│   └── ui/                      # Shared UI primitives, theme, style system
├── assets/                      # App images, icons, fonts, and static assets
├── openapi/                     # OpenAPI specs or generated API artifacts
├── scripts/                     # Utility scripts
├── .env.example                 # Sample environment variables
├── app.config.ts                # Expo app configuration
├── eas.json                     # EAS build config
├── package.json                 # Scripts and package metadata
├── tsconfig.json                # TypeScript configuration
├── jest.setup.ts                # Jest setup file
├── LICENSE                      # Project license
├── AGENTS.md                    # Repo instructions for agents
├── CLAUDE.md                   # Claude-specific repo notes
├── .gitignore                   # Git ignore rules
└── README.md                    # Project documentation
```

## App architecture

The app is organized around route groups and modular feature code:

- `app/(renter)` contains renter-facing screens such as home, lease, payments, maintenance, and announcements.
- `app/(landlord)` contains landlord-facing screens for rent collection, occupancy, overdue management, and repair requests.
- `src/features` contains feature-level queries and logic for both roles.
- `src/api` and the OpenAPI tooling provide typed server communication.
- `src/config/env.ts` enforces required environment values and validates that public runtime variables are safe for client-side usage.

## Prerequisites

Before running the app, ensure you have:

- Node.js 18+ (recommended LTS)
- npm
- Expo CLI (if needed for local development)
- A working Android or iOS emulator/device

## Environment variables

This project expects a client-safe environment file. Copy the sample file and fill in the required values:

```bash
cp .env.example .env
```

At minimum, the app expects values such as:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- optional: `EXPO_PUBLIC_CLERK_JWT_TEMPLATE`
- optional: `EXPO_PUBLIC_WEB_APP_URL`

The app validates these values at startup, and non-development builds require HTTPS for the API origin.

## Installation

```bash
npm install
```

## Running the app

Start the Expo development server:

```bash
npm run start
```

Run on Android:

```bash
npm run android
```

Run on iOS (macOS only):

```bash
npm run ios
```

## Useful scripts

From `package.json`:

```bash
npm run start
npm run android
npm run ios
npm run typecheck
npm test
npm run api:types
npm run api:check
npm run doctor
```

## API and types

The project uses OpenAPI-driven client generation. The scripts and dependencies are set up to generate types and validate them against the API contract:

```bash
npm run api:types
npm run api:check
```

This keeps the mobile app type-safe when backend contracts change.

## Testing

The repository uses Jest with the Expo preset:

```bash
npm test
```

## Observability and monitoring

The app integrates with Sentry through `@sentry/react-native` to capture runtime errors and monitor application health.

## Notes for contributors

- Keep changes aligned with existing Expo Router patterns.
- Prefer feature modules under `src/features` for logic grouped by domain.
- Reuse shared UI components from `src/ui` and `src/components` where possible.
- When the API contract changes, regenerate the client types before shipping changes.
- Keep environment variables public-safe and never add secrets into client-side code.

## License

This project includes an open-source license file in the repository root. Please review `LICENSE` before redistribution or commercial use.

## Repository context

This mobile app is designed for Kenyan rental management workflows and includes role-based experiences for both landlords and renters, with support for payment handling, maintenance reporting, negotiation of lease operations, and operational visibility into rent status.
