# Changelog

All notable changes to RentManager Mobile will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure with Expo 57 and React Native 0.86
- Authentication via Clerk hosted flow with SecureStore
- Role-based routing (landlord/renter experiences)
- M-Pesa payment integration with STK Push
- Payment state machine with uncertain outcome handling
- Maintenance request submission with photo upload
- Push notification support via Expo Push Service
- Real-time rent collection tracking for landlords
- Property and unit management
- Lease lifecycle management
- Announcement system
- Offline detection with retry logic
- Cache isolation by tenant scope
- Comprehensive error handling
- Sentry integration for monitoring
- OpenAPI-generated TypeScript types
- Jest test suite with React Native Testing Library
- EAS Build configuration
- GitHub Actions CI/CD workflows

### Security
- Clerk JWT authentication with JWKS verification
- SecureStore for token storage (Keychain/Keystore)
- HTTPS enforcement for production API calls
- PII scrubbing in error logs
- No Android backup of sensitive data
- Idempotency keys for payment requests

---

## [1.0.0] - 2026-11-XX

### Added
- **Landlord Features**
  - Dashboard with rent summary (collected/outstanding/overdue)
  - Unit occupancy tracking
  - Maintenance request triage by priority
  - Lease status monitoring
  - Cash payment recording
  - Property management (CRUD operations)
  - Overdue rent alerts
  - Announcement broadcasting

- **Renter Features**
  - Balance dashboard with due dates
  - M-Pesa payment flow with real-time status
  - Payment history with receipts
  - Maintenance request submission
  - Request status tracking
  - Lease details view
  - Announcement inbox with read/unread status

- **Technical Features**
  - Expo Router file-based navigation
  - React Query for server state management
  - OpenAPI contract-driven API client
  - Multi-environment support (dev/staging/prod)
  - Version gating for app updates
  - Pull-to-refresh on all list screens
  - Optimistic UI updates for mutations
  - Automatic token refresh
  - Network state awareness

### Changed
- N/A (initial release)

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- Implemented secure token storage in device Keychain/Keystore
- Added request timeout handling to prevent hanging connections
- Implemented cache clearing on org/user switch to prevent data leaks
- Added idempotency keys to prevent duplicate payment requests

---

## Version History Template

Use this template for future releases:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements
```

---

## Release Types

Following [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes, incompatible API changes
- **MINOR** (0.X.0): New features, backward compatible
- **PATCH** (0.0.X): Bug fixes, backward compatible

### Examples

#### MAJOR Release (Breaking Change)
```markdown
## [2.0.0] - 2027-01-15

### Changed
- **BREAKING**: Migrated from Clerk to Firebase Auth
- Updated minimum iOS version to 15.0
- Redesigned payment flow (incompatible with v1.x backend)

### Migration Guide
See MIGRATION.md for upgrade instructions from 1.x to 2.x
```

#### MINOR Release (New Features)
```markdown
## [1.1.0] - 2026-12-20

### Added
- Biometric authentication (Face ID / Touch ID)
- PDF receipt generation
- In-app chat between landlords and renters
- Dark mode support

### Changed
- Improved payment history performance with pagination
```

#### PATCH Release (Bug Fixes)
```markdown
## [1.0.1] - 2026-11-25

### Fixed
- Fixed crash when offline banner appears during payment
- Corrected date formatting in lease details
- Resolved photo upload timeout on slow networks
- Fixed back navigation from maintenance detail screen

### Security
- Updated react-native to 0.86.4 (security patches)
```

---

## Changelog Maintenance

### When to Update

- **During development**: Add entries to `[Unreleased]` section
- **Before release**: Move `[Unreleased]` to new version section with date
- **After hotfix**: Create patch version entry immediately

### Writing Good Changelog Entries

#### ✅ DO

```markdown
### Added
- M-Pesa payment retry with exponential backoff (#45)
- Landlord can now filter maintenance requests by status
- Push notifications for overdue rent (7 days before due)

### Fixed
- Payment confirmation toast now shows correct amount (#52)
- Resolved memory leak in maintenance photo picker (#48)
```

#### ❌ DON'T

```markdown
### Added
- New stuff
- Fixed bugs
- Updated code
```

### Including Issue/PR References

```markdown
### Fixed
- Fixed payment crash on Android 11+ (#42)
- Resolved authentication loop after org switch (PR #47)
```

---

## Release Checklist

Before creating a new release:

- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] API contract validated (`npm run api:check`)
- [ ] CHANGELOG.md updated with new version
- [ ] Version bumped in `package.json`
- [ ] Version bumped in `app.config.ts`
- [ ] Screenshots updated (if UI changed)
- [ ] Documentation updated (README, docs/)
- [ ] Git tag created (`git tag v1.0.0`)
- [ ] Tag pushed to GitHub (`git push origin v1.0.0`)
- [ ] GitHub release created with notes from CHANGELOG
- [ ] EAS builds triggered for staging/production
- [ ] Store submissions prepared (if applicable)

---

## Automated Version Bumping

```bash
# Patch (1.0.0 → 1.0.1)
npm version patch -m "chore: bump version to %s"

# Minor (1.0.0 → 1.1.0)
npm version minor -m "chore: bump version to %s"

# Major (1.0.0 → 2.0.0)
npm version major -m "chore: bump version to %s"

# This will:
# 1. Update package.json version
# 2. Create git commit
# 3. Create git tag
```

Then:
```bash
# Push with tags
git push origin main --tags

# GitHub Actions will auto-build and deploy
```

---

## Notable Commits

For future reference, here are commits that significantly shaped the project:

- Initial project setup with Expo
- M-Pesa payment state machine implementation
- Cache isolation strategy for tenant security
- OpenAPI type generation integration
- Push notification deep link routing

---

## Links

- [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
- [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- [GitHub Releases](https://github.com/hassan200503/rentmanager-mobile/releases)

---

**Maintained by**: Hassan Mohamed (@hassan200503)  
**Last Updated**: November 2, 2026
