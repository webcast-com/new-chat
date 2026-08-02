# send-push-notification — Web Push Edge Function (Phase 5.3)

Delivers **background push notifications** to users' devices using the Web Push
protocol (RFC 8291/8292) with zero external services. Subscriptions are stored in
the `push_subscriptions` table (created in `phase5_growth.sql`, delivery tracking
columns in `phase6_admin_and_push.sql`).

## How it works

1. Frontend (`usePushNotifications`) requests permission, registers the service
   worker (`src/sw.ts` in this app, `/sw.js` fallback in the embedded host) and
   saves the browser subscription to `push_subscriptions`.
2. This function signs a VAPID JWT with your P-256 key, encrypts the payload
   (aes128gcm) and POSTs it to the browser's push endpoint (FCM/Mozilla/Apple).
3. The service worker shows the notification; tapping it opens the app URL.

## Deploy

```bash
cd Livescoredashboard2
supabase link --project-ref vgofxfjbcaplgrhodxmn
supabase functions deploy send-push-notification --no-verify-jwt
supabase secrets set \
  VAPID_PRIVATE_KEY=... \
  VAPID_SUBJECT=mailto:admin@scorehub.com \
  --project-ref vgofxfjbcaplgrhodxmn
```

## Generate keys

```bash
deno run --allow-net supabase/functions/send-push-notification/generate-vapid-keys.ts
```

- `VAPID_PUBLIC_KEY` → frontend env `VITE_VAPID_PUBLIC_KEY` (base64url 65-byte raw P-256 point)
- `VAPID_PRIVATE_KEY` → edge function secret (base64url 32-byte raw scalar)
- `VAPID_SUBJECT` → edge function secret (`mailto:` or `https://` contact)

## API

`POST /functions/v1/send-push-notification` (auth required)

```json
{ "action": "test", "title": "ScoreHub", "body": "Hello!", "url": "/settings" }
```

| action      | recipients                                             | auth        |
|-------------|--------------------------------------------------------|-------------|
| `test`      | caller's own subscriptions                             | any user    |
| `favorites` | users with `team` (optional) in their favorites        | any user    |
| `all`       | every active subscription                              | admin only  |

Response: `{ "ok": true, "action", "delivered", "failed", "removed" }`

Endpoints returning 404/410 are deactivated automatically. Add a cron/scheduled
job to fire `favorites` pushes when a favorite team's match starts or scores.

## Crypto verification

`webpush.ts` is fully WebCrypto-based. The round-trip (JWT signature + aes128gcm
encrypt/decrypt) is verified in the repo test at `../../../../.arena-test/webpush_test.mjs`
(`node .arena-test/webpush_test.mjs`).
