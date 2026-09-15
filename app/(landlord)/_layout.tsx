import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';

import { useAccess } from '../../src/features/access/use-access';
import { useUnviewedMaintenance } from '../../src/features/landlord/queries';
import { LoadingState, Screen } from '../../src/ui/primitives';
import { useTheme } from '../../src/ui/theme';

/**
 * Landlord tabs, built for someone between property visits: what needs
 * attention, who owes rent, what's broken, who lives where. Portfolio setup,
 * payment credentials, tax and billing stay on the web, where a full form
 * and a large screen serve them better (docs/mobile/navigation.md).
 */
export default function LandlordLayout() {
  const access = useAccess();
  const t = useTheme();

  if (access.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState />
      </Screen>
    );
  }
  if (!access.data?.landlordRole) {
    return <Redirect href="/" />;
  }

  return <LandlordTabs color={t} />;
}

function LandlordTabs({ color: t }: { color: ReturnType<typeof useTheme> }) {
  const unviewed = useUnviewedMaintenance();
  const count = unviewed.data?.count ?? 0;
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
      <Tabs.Screen name="rent" options={{ title: 'Rent', tabBarIcon: icon('cash-outline') }} />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: 'Repairs',
          tabBarIcon: icon('construct-outline'),
          tabBarBadge: count > 0 ? (count > 99 ? '99+' : count) : undefined,
          tabBarAccessibilityLabel: count > 0 ? `Repairs, ${count} new` : 'Repairs',
        }}
      />
      <Tabs.Screen name="leases" options={{ title: 'Renters', tabBarIcon: icon('people-outline') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('ellipsis-horizontal') }} />
    </Tabs>
  );
}
