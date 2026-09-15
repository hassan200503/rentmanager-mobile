import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAccess } from '../../src/features/access/use-access';
import { LoadingState, Screen } from '../../src/ui/primitives';
import { useTheme } from '../../src/ui/theme';

export default function PropertiesStack() {
  const access = useAccess();
  const t = useTheme();
  if (access.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState />
      </Screen>
    );
  }
  if (!access.data?.landlordRole) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: t.color.primary,
        headerStyle: { backgroundColor: t.color.surface },
        headerTitleStyle: { color: t.color.text },
        contentStyle: { backgroundColor: t.color.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Properties' }} />
      <Stack.Screen name="new" options={{ title: 'Add property', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Property' }} />
      <Stack.Screen name="[id]/new-unit" options={{ title: 'Add unit', presentation: 'modal' }} />
    </Stack>
  );
}
