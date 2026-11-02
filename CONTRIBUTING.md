# Contributing to RentManager Mobile

Thank you for your interest in contributing to RentManager Mobile! This document provides guidelines and best practices for contributing to this project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions.

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards others

### Unacceptable Behavior

- Trolling, insulting/derogatory comments
- Personal or political attacks
- Harassment of any kind
- Publishing others' private information

---

## Getting Started

### Prerequisites

Ensure you have the required tools installed:

```bash
# Check Node.js version (18+ required)
node --version

# Check npm version
npm --version

# Install Expo CLI (optional but recommended)
npm install -g expo-cli

# Install EAS CLI (for builds)
npm install -g eas-cli
```

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/rentmanager-mobile.git
   cd rentmanager-mobile
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/hassan200503/rentmanager-mobile.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your development credentials
   ```

### Verify Setup

```bash
# Run type checking
npm run typecheck

# Run tests
npm test

# Start development server
npm start
```

---

## Development Workflow

### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/***: New features (e.g., `feature/payment-retry`)
- **fix/***: Bug fixes (e.g., `fix/auth-token-refresh`)
- **docs/***: Documentation updates

### Creating a Feature Branch

```bash
# Update your local main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Keeping Your Branch Updated

```bash
# Fetch upstream changes
git fetch upstream

# Rebase on main
git rebase upstream/main

# Or merge if you prefer
git merge upstream/main
```

---

## Coding Standards

### TypeScript Guidelines

#### Type Safety

```typescript
// ✅ DO: Use explicit types
interface PaymentResult {
  success: boolean;
  transactionId: string | null;
  receipt: string | null;
}

function processPayment(amount: string): Promise<PaymentResult> {
  // Implementation
}

// ❌ DON'T: Use 'any' or implicit types
function processPayment(amount): Promise<any> {
  // Implementation
}
```

#### Null Safety

```typescript
// ✅ DO: Handle null/undefined explicitly
const userName = user?.name ?? 'Anonymous';

// ❌ DON'T: Assume values exist
const userName = user.name; // May crash
```

### Component Guidelines

#### Component Structure

```typescript
// ✅ DO: Organize imports by category
// 1. External dependencies
import React from 'react';
import { View } from 'react-native';

// 2. Internal dependencies
import { useSession } from '@/auth/session';
import { Text, Button } from '@/ui/primitives';

// 3. Types
import type { RenterDashboard } from '@/api/types';

// Component
export function DashboardScreen() {
  // 1. Hooks
  const session = useSession();
  
  // 2. State
  const [loading, setLoading] = useState(false);
  
  // 3. Queries
  const dashboard = useRenterDashboard();
  
  // 4. Handlers
  const handleRefresh = () => {
    // Implementation
  };
  
  // 5. Render
  return (
    <View>
      {/* JSX */}
    </View>
  );
}
```

#### Naming Conventions

```typescript
// ✅ DO: Use descriptive names
const handlePaymentSubmit = () => { /* ... */ };
const isPaymentPending = status === 'AWAITING';
const PAYMENT_TIMEOUT_MS = 120_000;

// ❌ DON'T: Use abbreviations or unclear names
const handleSubmit = () => { /* ... */ };
const isPending = status === 'AWAITING';
const TIMEOUT = 120000;
```

### File Naming

- **Components**: PascalCase (`PaymentScreen.tsx`)
- **Utilities**: kebab-case (`format-money.ts`)
- **Hooks**: camelCase with `use` prefix (`use-rent-payment.ts`)
- **Types**: kebab-case (`api-types.ts`)
- **Tests**: Same as source + `.test.ts` (`format-money.test.ts`)

### Code Organization

```
src/features/renter/
├── queries.ts          # React Query hooks
├── payment-flow.ts     # Pure business logic
├── use-rent-payment.ts # Stateful hook orchestration
└── __tests__/
    └── payment-flow.test.ts
```

**Principle**: Separate pure logic from stateful hooks for better testability.

---

## Testing Guidelines

### Test Structure

```typescript
// format-money.test.ts
describe('formatMoney', () => {
  it('formats whole numbers correctly', () => {
    expect(formatMoney('5000', 'KES')).toBe('KES 5,000');
  });

  it('handles decimal precision', () => {
    expect(formatMoney('5000.50', 'KES')).toBe('KES 5,000.50');
  });

  it('throws on invalid input', () => {
    expect(() => formatMoney('invalid', 'KES')).toThrow();
  });
});
```

### Test Coverage Requirements

- **New features**: 80% coverage minimum
- **Bug fixes**: Include regression test
- **Pure functions**: 100% coverage (easy to achieve)
- **React components**: Focus on user interactions

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# Single file
npm test -- format-money.test.ts
```

### Writing Good Tests

```typescript
// ✅ DO: Test behavior, not implementation
it('shows error message when payment fails', async () => {
  const { getByText } = render(<PaymentScreen />);
  fireEvent.press(getByText('Pay Now'));
  
  await waitFor(() => {
    expect(getByText(/payment failed/i)).toBeInTheDocument();
  });
});

// ❌ DON'T: Test internal state
it('sets error state to true', () => {
  const component = new PaymentScreen();
  component.handleError();
  expect(component.state.error).toBe(true);
});
```

---

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear, structured commit history.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Build process, dependencies, tooling

### Examples

```bash
# Feature
feat(payments): add M-Pesa payment retry logic

Implements exponential backoff retry for failed M-Pesa payments.
Users can retry after 30 seconds if initial request times out.

Closes #42

# Bug fix
fix(auth): prevent token refresh loop on 401 errors

Previously, 401 errors would trigger infinite token refresh attempts.
Now limits to 3 retries before forcing re-authentication.

Fixes #38

# Documentation
docs(readme): update installation instructions for M1 Macs

Added troubleshooting section for pod install issues on Apple Silicon.
```

### Best Practices

- **Use imperative mood**: "add feature" not "added feature"
- **Limit subject to 50 characters**
- **Capitalize subject line**
- **No period at end of subject**
- **Separate subject from body with blank line**
- **Wrap body at 72 characters**
- **Reference issues/PRs in footer**

---

## Pull Request Process

### Before Submitting

1. **Ensure all checks pass**:
   ```bash
   npm run typecheck  # TypeScript
   npm test           # Tests
   npm run api:check  # API contract validation
   ```

2. **Update documentation**:
   - README if user-facing changes
   - Code comments for complex logic
   - JSDoc for exported functions

3. **Add tests**:
   - New features need test coverage
   - Bug fixes need regression tests

### PR Title Format

Use the same format as commit messages:

```
feat(payments): add payment retry with exponential backoff
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No new warnings
- [ ] API types regenerated (if backend contract changed)
```

### Review Process

1. **Automated checks**: Must pass CI (TypeScript, tests, linting)
2. **Code review**: At least one approval required
3. **Discussion**: Address review comments
4. **Approval**: Maintainer approves and merges

### After Merge

- **Delete your branch**: GitHub will prompt you
- **Update local main**:
  ```bash
  git checkout main
  git pull upstream main
  ```

---

## Project Structure

### Key Directories

```
rentmanager-mobile/
├── app/                  # Expo Router screens
│   ├── (landlord)/      # Landlord route group
│   └── (renter)/        # Renter route group
├── src/
│   ├── api/             # Backend integration
│   ├── auth/            # Authentication
│   ├── features/        # Feature modules
│   ├── components/      # Shared components
│   ├── ui/              # Design system
│   ├── lib/             # Utilities
│   └── notifications/   # Push notifications
├── docs/                # Documentation
└── screenshots/         # App screenshots
```

### Adding a New Feature

1. **Create feature directory**:
   ```
   src/features/new-feature/
   ├── queries.ts         # React Query hooks
   ├── logic.ts           # Pure business logic
   └── __tests__/
       └── logic.test.ts
   ```

2. **Add screen(s)**:
   ```
   app/(landlord)/new-screen.tsx
   ```

3. **Update types** (if backend contract changed):
   ```bash
   npm run api:types
   ```

4. **Add tests**:
   ```typescript
   // src/features/new-feature/__tests__/logic.test.ts
   describe('newFeatureLogic', () => {
     it('works correctly', () => {
       // Test implementation
     });
   });
   ```

---

## Common Tasks

### Adding a New API Endpoint

1. **Backend team** updates OpenAPI spec
2. **Download new spec**:
   ```bash
   curl https://api.rentmanager.com/api/v1/openapi.json > openapi/rentmanager.json
   ```

3. **Regenerate types**:
   ```bash
   npm run api:types
   ```

4. **Create query hook**:
   ```typescript
   // src/features/landlord/queries.ts
   export function useNewEndpoint() {
     const { api, scope } = useSession();
     return useQuery({
       queryKey: [scope, 'newEndpoint'],
       queryFn: () => api.request<ResponseType>('/new-endpoint'),
     });
   }
   ```

### Adding a New Screen

1. **Create file** in appropriate route group:
   ```typescript
   // app/(renter)/new-screen.tsx
   import { Screen, Text } from '@/ui/primitives';
   
   export default function NewScreen() {
     return (
       <Screen>
         <Text variant="title">New Screen</Text>
         {/* Content */}
       </Screen>
     );
   }
   ```

2. **Add navigation**:
   ```typescript
   // From another screen
   import { router } from 'expo-router';
   
   router.push('/(renter)/new-screen');
   ```

3. **Update tab bar** (if needed):
   ```typescript
   // app/(renter)/_layout.tsx
   <Tabs.Screen
     name="new-screen"
     options={{
       title: 'New Feature',
       tabBarIcon: ({ color }) => <Icon name="new" color={color} />
     }}
   />
   ```

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update specific package
npm install package-name@latest

# Update all (use with caution)
npm update

# Test after updating
npm run typecheck
npm test
```

### Debugging

#### React Native Debugger

```bash
# Install
brew install --cask react-native-debugger

# Start app in debug mode
npm start
# Press 'd' in terminal, select "Open Debugger"
```

#### Flipper

```bash
# Already configured in project
# Run app and Flipper will auto-connect
npx flipper
```

#### Logging

```typescript
// ✅ DO: Use structured logging
console.log('[PaymentFlow] Initiating payment', { amount, leaseId });

// ❌ DON'T: Log sensitive data
console.log('User password:', password); // NEVER
console.log('JWT token:', token);        // NEVER
```

---

## Questions?

If you have questions or need help:

1. **Check existing documentation**: `docs/` directory
2. **Search issues**: Someone may have asked before
3. **Open a discussion**: GitHub Discussions tab
4. **Ask in PR**: Tag maintainers for guidance

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

**Thank you for contributing to RentManager Mobile! 🎉**
