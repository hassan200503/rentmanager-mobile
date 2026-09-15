import { env } from '../config/env';

/**
 * Product analytics seam. Deliberately a small allow-list of event names with
 * NO properties: no amounts, phone numbers, names, ids or free text can be
 * attached, so nothing sensitive can leak through analytics by accident.
 *
 * No vendor is wired yet — that is a product/privacy decision (see
 * docs/mobile/decision-log.md, D-09). Until then events go to the dev console
 * only, and nowhere in release builds.
 */

export type AnalyticsEvent =
  | 'app_opened'
  | 'sign_in_started'
  | 'sign_in_completed'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'payment_started'
  | 'payment_completed'
  | 'payment_failed'
  | 'maintenance_request_created'
  | 'maintenance_status_updated'
  | 'notification_opened'
  | 'organization_switched';

type Sink = (event: AnalyticsEvent) => void;

let sink: Sink = (event) => {
  if (env.isDev) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${event}`);
  }
};

export function setAnalyticsSink(next: Sink): void {
  sink = next;
}

export function track(event: AnalyticsEvent): void {
  try {
    sink(event);
  } catch {
    // Analytics must never break a user flow.
  }
}
