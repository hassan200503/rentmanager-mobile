import { Stack } from 'expo-router';
import React from 'react';

import { useTheme } from '../../../src/ui/theme';

export default function LeasesStack() {
  const t = useTheme();
  return (
    <Stack
      screenOptions={{
        headerTintColor: t.color.primary,
        headerStyle: { backgroundColor: t.color.surface },
        headerTitleStyle: { color: t.color.text },
        contentStyle: { backgroundColor: t.color.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Lease', headerBackTitle: 'Renters' }} />
    </Stack>
  );
}
