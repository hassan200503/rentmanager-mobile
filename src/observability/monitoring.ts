import * as Sentry from '@sentry/react-native';
import type React from 'react';

import { env } from '../config/env';

/**
 * Crash and error monitoring (Sentry). Enabled only when a DSN is supplied
 * for the build — a DSN is a public, write-only ingest key and is safe in the
 * binary; the Sentry *auth token* used for source-map upload is a build-time
 * EAS secret and never ships.
 *
 * Privacy posture:
 * - sendDefaultPii: false — no IP address, no user email or name.
 * - The only user identifier attached is the opaque Clerk user id.
 * - Breadcrumbs for HTTP keep method and path shape only; query strings are
 *   dropped (they can carry search keywords that are renter names).
 * - Request bodies, response bodies and console breadcrumbs are never sent.
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

const UUID_IN_PATH = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const noQuery = url.split('?')[0];
  return noQuery.replace(UUID_IN_PATH, ':id');
}

export function initMonitoring(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: env.appEnv,
    release: `rentmanager-mobile@${env.appVersion}`,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    tracesSampleRate: env.appEnv === 'production' ? 0.1 : 1.0,
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console') return null;
      if (breadcrumb.data && typeof breadcrumb.data.url === 'string') {
        breadcrumb.data = { ...breadcrumb.data, url: scrubUrl(breadcrumb.data.url) };
      }
      return breadcrumb;
    },
    beforeSend(event) {
      if (event.request) {
        event.request = { ...event.request, url: scrubUrl(event.request.url), data: undefined, cookies: undefined, headers: undefined, query_string: undefined };
      }
      if (event.user) {
        event.user = { id: event.user.id };
      }
      return event;
    },
  });
}

export function setMonitoringUser(clerkUserId: string | null): void {
  if (!DSN) return;
  Sentry.setUser(clerkUserId ? { id: clerkUserId } : null);
}

export function captureError(error: unknown, context?: { flow?: string; requestId?: string }): void {
  if (!DSN) return;
  Sentry.withScope((scope) => {
    if (context?.flow) scope.setTag('flow', context.flow);
    if (context?.requestId) scope.setTag('request_id', context.requestId);
    Sentry.captureException(error);
  });
}

export function wrapRoot(component: React.ComponentType<Record<string, unknown>>) {
  return DSN ? Sentry.wrap(component) : component;
}
