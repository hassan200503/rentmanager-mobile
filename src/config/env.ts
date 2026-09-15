import Constants from 'expo-constants';

/**
 * Public runtime configuration. EXPO_PUBLIC_* values are inlined into the
 * JavaScript bundle at build time and are readable by anyone holding the app.
 * Only client-safe values belong here: an API origin and a Clerk
 * *publishable* key. Never a secret key.
 */

export type AppEnv = 'development' | 'staging' | 'production';

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env (or set it in the EAS environment) before starting the app.`,
    );
  }
  return value.trim();
}

const appEnv = ((Constants.expoConfig?.extra as { appEnv?: AppEnv } | undefined)?.appEnv ??
  'development') as AppEnv;

const apiBaseUrl = required('EXPO_PUBLIC_API_BASE_URL', process.env.EXPO_PUBLIC_API_BASE_URL).replace(/\/+$/, '');

if (appEnv !== 'development' && !apiBaseUrl.startsWith('https://')) {
  // A staging or production binary talking plain HTTP would expose bearer
  // tokens on the wire. Fail at startup rather than ship that.
  throw new Error('EXPO_PUBLIC_API_BASE_URL must use https outside development');
}

export const env = {
  appEnv,
  /** Origin plus /api/v1, e.g. https://api.rentmanager.co.ke/api/v1 */
  apiBaseUrl,
  clerkPublishableKey: required('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY', process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY),
  /** Clerk JWT template the backend verifies; must match the web app's. */
  clerkJwtTemplate: process.env.EXPO_PUBLIC_CLERK_JWT_TEMPLATE?.trim() || 'backend',
  /** Web app origin, for workflows deliberately left to a large screen. */
  webAppUrl: (process.env.EXPO_PUBLIC_WEB_APP_URL ?? '').replace(/\/+$/, ''),
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
  easProjectId: (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId,
  isDev: appEnv === 'development',
} as const;
