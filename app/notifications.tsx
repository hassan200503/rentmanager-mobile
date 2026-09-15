import { Stack } from 'expo-router';
import React from 'react';
import { Switch, View } from 'react-native';

import { userMessage } from '../src/api/errors';
import { resolveExperiences, useAccess } from '../src/features/access/use-access';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../src/features/shared/queries';
import { Card, ErrorState, LoadingState, Notice, Screen, Text } from '../src/ui/primitives';
import { useTheme } from '../src/ui/theme';

/**
 * Push preferences for the signed-in person. These control app notifications
 * only; SMS from your landlord (payment confirmations, reminders) is part of
 * how they reach you and is not switched off here — the copy says so.
 */
export default function NotificationSettings() {
  const prefs = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();
  const access = useAccess();
  const t = useTheme();

  const experiences = access.data ? resolveExperiences(access.data) : [];
  const isRenter = experiences.includes('renter');

  const current = update.variables ?? prefs.data;

  function toggle(key: 'rentPayments' | 'maintenance', value: boolean) {
    if (!prefs.data) return;
    update.mutate({ rentPayments: prefs.data.rentPayments ?? true, maintenance: prefs.data.maintenance ?? true, [key]: value });
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Notifications' }} />
      {prefs.isPending ? (
        <LoadingState />
      ) : prefs.isError ? (
        <ErrorState message={userMessage(prefs.error)} onRetry={() => void prefs.refetch()} />
      ) : (
        <Card>
          {isRenter ? (
            <PreferenceRow
              title="Payments"
              description="When a rent payment is recorded on your account."
              value={current?.rentPayments ?? true}
              onChange={(v) => toggle('rentPayments', v)}
              disabled={update.isPending}
            />
          ) : null}
          <PreferenceRow
            title="Repairs"
            description={isRenter ? 'When your landlord updates a request you reported.' : 'When a renter reports a new issue.'}
            value={current?.maintenance ?? true}
            onChange={(v) => toggle('maintenance', v)}
            disabled={update.isPending}
          />
          {update.isError ? <Notice tone="danger">{userMessage(update.error)}</Notice> : null}
          <Text muted variant="caption" style={{ marginTop: t.space(2) }}>
            These settings are for app notifications on your phones. Text messages from your landlord are not affected.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

function PreferenceRow({
  title,
  description,
  value,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space(3), paddingVertical: t.space(2), minHeight: t.touchTarget }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text muted variant="caption">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={`${title} notifications`}
        trackColor={{ true: t.color.primary, false: t.color.border }}
      />
    </View>
  );
}
