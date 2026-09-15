import type { ErrorBoundaryProps } from 'expo-router';
import React, { useEffect } from 'react';

import { captureError } from '../observability/monitoring';
import { Button, Screen, Text } from '../ui/primitives';

/**
 * Route-level error boundary (expo-router). A render crash on one screen
 * shows a recoverable message instead of a white screen, and is reported.
 * The error text itself is never shown — it may contain internals.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    captureError(error, { flow: 'render' });
  }, [error]);

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <Text variant="title" accessibilityRole="header">
        Something went wrong
      </Text>
      <Text muted>This screen couldn't be shown. Your data is safe — nothing was changed.</Text>
      <Button label="Try again" onPress={retry} />
    </Screen>
  );
}
