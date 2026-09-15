import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Build-time configuration. Everything here ends up inside the app binary and
 * must be treated as PUBLIC. Never put a secret key, webhook secret, Daraja
 * credential or server token in this file or in any EXPO_PUBLIC_* variable.
 *
 * APP_ENV selects the identity of the build so development, staging and
 * production can be installed side by side and can never be confused:
 * each has its own bundle id, name and API host.
 */

type AppEnv = 'development' | 'staging' | 'production';

const APP_ENV = (process.env.APP_ENV ?? 'development') as AppEnv;

const IDENTITY: Record<AppEnv, { name: string; id: string; scheme: string }> = {
  development: { name: 'RentManager Dev', id: 'com.rentmanager.app.dev', scheme: 'rentmanager-dev' },
  staging: { name: 'RentManager Staging', id: 'com.rentmanager.app.staging', scheme: 'rentmanager-staging' },
  production: { name: 'RentManager', id: 'com.rentmanager.app', scheme: 'rentmanager' },
};

// Bump `version` for user-visible releases (semver). Store build numbers are
// managed remotely by EAS (`appVersionSource: remote` in eas.json).
const VERSION = '1.0.0';

export default ({ config }: ConfigContext): ExpoConfig => {
  const identity = IDENTITY[APP_ENV];
  if (!identity) {
    throw new Error(`Unknown APP_ENV "${APP_ENV}"`);
  }

  return {
    ...config,
    name: identity.name,
    slug: 'rentmanager',
    owner: process.env.EXPO_OWNER,
    version: VERSION,
    scheme: identity.scheme,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    ios: {
      bundleIdentifier: identity.id,
      supportsTablet: false,
      infoPlist: {
        // Declares no non-exempt encryption (HTTPS only) so App Store Connect
        // does not prompt on every upload.
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: identity.id,
      adaptiveIcon: {
        backgroundColor: '#0F3D2E',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      // Rent, lease and payment data must not end up in cloud backups of the
      // device. Session material lives in the Keystore via SecureStore anyway.
      allowBackup: false,
      // Only what the app actually uses: notifications, and the camera for
      // repair photos (requested when the person taps "Take photo"). Choosing
      // an existing photo uses the system photo picker, which needs no
      // storage permission on modern Android.
      permissions: ['android.permission.POST_NOTIFICATIONS', 'android.permission.CAMERA'],
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
      predictiveBackGestureEnabled: false,
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        { image: './assets/splash-icon.png', imageWidth: 180, resizeMode: 'contain', backgroundColor: '#0F3D2E' },
      ],
      'expo-secure-store',
      'expo-web-browser',
      '@clerk/expo',
      [
        'expo-image-picker',
        {
          photosPermission: 'RentManager uses your photos only when you choose one to attach to a repair request.',
          cameraPermission: 'RentManager uses the camera only when you take a photo for a repair request.',
          microphonePermission: false,
        },
      ],
      [
        '@sentry/react-native/expo',
        {
          // Source-map upload runs during EAS builds when SENTRY_AUTH_TOKEN is
          // set as an EAS secret. Org/project are not secret.
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
        },
      ],
      [
        'expo-notifications',
        {
          color: '#0F3D2E',
          defaultChannel: 'default',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appEnv: APP_ENV,
      eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
    },
  };
};
