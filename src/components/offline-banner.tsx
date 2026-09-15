import NetInfo from '@react-native-community/netinfo';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '../ui/primitives';
import { useTheme } from '../ui/theme';

/**
 * A persistent, calm indication that the device is offline. Screens keep
 * showing whatever they last loaded; this banner is what tells the user that
 * data may be out of date and that actions will not go through.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const insets = useSafeAreaInsets();
  const t = useTheme();

  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        setOffline(state.isConnected === false || state.isInternetReachable === false);
      }),
    [],
  );

  if (!offline) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        paddingTop: insets.top + 6,
        paddingBottom: 6,
        paddingHorizontal: 16,
        backgroundColor: t.color.warningBg,
      }}
    >
      <Text tone="warning" variant="caption" style={{ fontWeight: '600', textAlign: 'center' }}>
        You're offline. Showing what was last loaded — payments and updates won't go through.
      </Text>
    </View>
  );
}
