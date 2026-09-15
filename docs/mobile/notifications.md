# Notifications and deep links

## Pipeline

```
Domain event (AFTER_COMMIT)                      PushNotificationListener
  RentPaymentApplied            → renter           │ resolves recipients only from the
  MaintenanceRequestStatusChanged → renter         │ event's own organisation
  MaintenanceRequestSubmitted   → org members      ▼
                                   notification_deliveries (channel PUSH, one row per device)
                                                   │ NotificationRetryScheduler sweep
                                                   ▼
                              PushNotificationService.deliver
                                re-check: token active AND still owned by intended person
                                                   │
                                          ExpoPushSender → Expo → APNs/FCM
                                                   │ DeviceNotRegistered → revoke token
                                                   ▼
                                     Phone → tap → NotificationRouter
                                       waits for session + /users/me/access
                                       routes only if the person has that experience
                                       screen fetches data → backend authorises
```

## Payload contract

| `type` | Sent to | Opens |
|---|---|---|
| `rent_payment_recorded` | renter | Payment history |
| `renter_maintenance_updated` | renter | Repairs |
| `landlord_maintenance_submitted` | landlord org members | Repair request `/maintenance/{id}` |

`id` is validated as a UUID before it is used in a route.

## Registration

- Permission is requested only when the user taps "Turn on notifications".
- On each sign-in the app silently re-registers if permission already exists.
- Sign-out unregisters first (5s bounded).

## Configuration required per environment

- `EAS_PROJECT_ID` in the build.
- FCM v1 service account (Android) and APNs key (iOS) uploaded to EAS
  credentials — not to this repo or the backend.
- Backend `PUSH_EXPO_ACCESS_TOKEN` (`push.expo.access-token`) once Expo
  "enhanced push security" is enabled (recommended for production).

## Receipts and preferences

- Expo receipts are polled every 15 minutes (`PushReceiptService`, V99); devices
  reported `DeviceNotRegistered` are revoked.
- People choose push on/off for payments and repairs (`/notification-preferences`,
  V100). SMS for the same events continues — push is additive.

## Known gaps
- Rent reminders are not sent by push (reminder policies are SMS/email/WhatsApp).
- Universal/App Links (https) are not configured; only notification taps and
  the custom scheme route into the app.
