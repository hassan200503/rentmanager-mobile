/**
 * Maps a push notification's data payload to an in-app route.
 *
 * Contract with the backend (PushNotificationListener): payloads carry only a
 * `type` and an opaque `id`. Nothing here trusts the id to grant access —
 * the destination screen fetches the resource with the signed-in session,
 * and the backend returns 403/404 if it does not belong to this person or
 * their organisation. A notification for a device that has since changed
 * owner shows "not available", never someone else's data.
 */

export type PushType = 'rent_payment_recorded' | 'renter_maintenance_updated' | 'landlord_maintenance_submitted';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PushDestination =
  | { experience: 'renter'; href: '/(renter)/payments' }
  | { experience: 'renter'; href: '/(renter)/maintenance' }
  | { experience: 'landlord'; href: `/(landlord)/maintenance/${string}` };

export function destinationFor(data: unknown): PushDestination | null {
  if (!data || typeof data !== 'object') return null;
  const { type, id } = data as { type?: unknown; id?: unknown };
  switch (type as PushType) {
    case 'rent_payment_recorded':
      return { experience: 'renter', href: '/(renter)/payments' };
    case 'renter_maintenance_updated':
      return { experience: 'renter', href: '/(renter)/maintenance' };
    case 'landlord_maintenance_submitted':
      return typeof id === 'string' && UUID.test(id)
        ? { experience: 'landlord', href: `/(landlord)/maintenance/${id}` }
        : null;
    default:
      return null;
  }
}
