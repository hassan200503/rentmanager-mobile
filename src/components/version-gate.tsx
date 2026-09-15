import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { buildUrl } from '../api/client';
import type { MobileAppConfig } from '../api/types';
import { env } from '../config/env';
import { compareVersions } from '../lib/semver';
import { Button, Screen, Text } from '../ui/primitives';

/**
 * Refuses to run a version below the backend's minimumSupportedVersion — the
 * escape hatch for a release that must not stay in use (a money or security
 * fix). Deliberately fails OPEN: if the config can't be fetched (offline,
 * server down) the app runs, because locking everyone out on a network blip
 * would be worse than the rare case it guards against.
 */
export function VersionGate({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<MobileAppConfig | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    fetch(buildUrl('/public/mobile/config'), { signal: controller.signal, headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.success && body.data) setConfig(body.data as MobileAppConfig);
      })
      .catch(() => undefined)
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const tooOld = !!config?.minimumSupportedVersion && compareVersions(env.appVersion, config.minimumSupportedVersion) < 0;
  if (!tooOld) return <>{children}</>;

  const storeUrl = Platform.OS === 'ios' ? config?.iosStoreUrl : config?.androidStoreUrl;
  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <Text variant="title" accessibilityRole="header">
        Update RentManager
      </Text>
      <Text>
        {`This version (${env.appVersion}) is no longer supported. Update to ${config?.latestVersion ?? 'the latest version'} to keep using the app.`}
      </Text>
      {storeUrl ? <Button label="Update now" onPress={() => void Linking.openURL(storeUrl)} /> : null}
    </Screen>
  );
}
