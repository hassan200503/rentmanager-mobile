import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';

import { useAccess } from '../../src/features/access/use-access';
import { LoadingState, Screen } from '../../src/ui/primitives';
import { useTheme } from '../../src/ui/theme';

/**
 * Renter tabs, ordered by what renters come to do: see what they owe, pay it,
 * report a problem, check their lease. The group is only reachable when the
 * backend grants ROLE_TENANT — and every renter endpoint re-checks it.
 */
export default function RenterLayout() {
  const access = useAccess();
  const t = useTheme();

  if (access.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState />
      </Screen>
    );
  }
  if (!access.data?.renter) {
    return <Redirect href="/" />;
  }

  const icon =
    (name: React.ComponentProps<typeof Ionicons>['name']) =>
    ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color} size={size} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.color.primary,
        tabBarInactiveTintColor: t.color.textMuted,
        tabBarStyle: { backgroundColor: t.color.surface, borderTopColor: t.color.border },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="pay" options={{ title: 'Pay', tabBarIcon: icon('phone-portrait-outline') }} />
      <Tabs.Screen name="maintenance" options={{ title: 'Repairs', tabBarIcon: icon('construct-outline') }} />
      <Tabs.Screen name="lease" options={{ title: 'Lease', tabBarIcon: icon('document-text-outline') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('ellipsis-horizontal') }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="announcements" options={{ href: null }} />
      <Tabs.Screen name="report-issue" options={{ href: null }} />
      <Tabs.Screen name="request/[id]" options={{ href: null }} />
    </Tabs>
  );
}
