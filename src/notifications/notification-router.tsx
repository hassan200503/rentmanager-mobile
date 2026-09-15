import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useSession } from '../auth/session';
import { resolveExperiences, useAccess } from '../features/access/use-access';
import { track } from '../observability/analytics';
import { registerForPush } from './push';
import { destinationFor } from './routes';

/**
 * Handles notification taps — including the tap that launched a killed app —
 * once the session and its access are known, and re-registers the device
 * silently if permission was already granted.
 *
 * A tap is only routed when the signed-in person has the experience the
 * notification belongs to. A landlord notification tapped after the phone
 * changed hands to a renter goes nowhere; and the destination screen
 * re-fetches through the backend, which enforces ownership regardless.
 */
export function NotificationRouter() {
  const { api, scope } = useSession();
  const access = useAccess();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    void registerForPush(api, false);
  }, [api, scope]);

  useEffect(() => {
    if (!lastResponse || !access.data) return;
    const id = lastResponse.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;

    const destination = destinationFor(lastResponse.notification.request.content.data);
    if (!destination) return;
    if (!resolveExperiences(access.data).includes(destination.experience)) return;

    track('notification_opened');
    router.push(destination.href as never);
    void Notifications.clearLastNotificationResponseAsync?.().catch(() => undefined);
  }, [lastResponse, access.data]);

  return null;
}
