# Phase 6 - Backlog Completion: Admin Actions, Background Push, Leaderboard Analytics

**Date:** 2026-08-03
**Branch:** arena/019fc47d-new-chat

## Overview

Closes the documented "Next Steps / Future" backlog from Phases 4 & 5 and the
product roadmap (ROADMAP.md §4.2/§5.2):

1. **Admin actions** (Phase 5.7 completion) — mark contacts read/replied with
   notes, refund payments, suspend/activate users, grant/revoke admin.
2. **Background Web Push** (Phase 5.3 completion) — real push subscriptions,
   a VAPID web-push edge function, and service-worker delivery.
3. **Leaderboard user detail + accuracy chart** (Phase 5 "Next Steps") — click
   any predictor for a per-user analytics modal.

---

## 1. Admin Actions

### Database — `supabase/migrations/phase6_admin_and_push.sql`
- `user_profiles.is_admin` boolean flag
- `public.is_admin()` security-definer helper (RLS-safe admin checks)
- Admin SELECT/UPDATE policies on `contact_messages`, `payment_logs`,
  `user_activity`, `user_profiles`, `user_plans`, `favorites`,
  `push_subscriptions`
- `push_subscriptions` delivery tracking: `last_sent_at`, `failure_count`,
  `last_error`

### Edge Function — `supabase/functions/admin-action/`
Service-role mutations, admin-gated per request:
- `contact_set_status` → status `read`/`replied`/`archived`, `replied_at/by`,
  optional `admin_notes`
- `payment_refund` → status `refunded` + metadata; auto-downgrades the user's
  plan to free if that payment was their active premium
- `user_set_status` → `active`/`suspended` (suspend also revokes premium)
- `user_set_admin` → grants/revokes `is_admin`

### UI — `src/app/pages/AdminDashboard.tsx`
- Contacts tab: **Mark read / Mark replied (with note prompt) / Archive**
- Payments tab: **Refund** button with confirmation
- New **Users tab**: profile list with Suspend/Activate + Make admin/Revoke
- Admin gate hardened: real `is_admin` flag + email fallback (dev mode still
  allows all authenticated for demos — remove `import.meta.env.DEV` for prod)

---

## 2. Background Web Push (RFC 8291/8292, zero external services)

### Edge Function — `supabase/functions/send-push-notification/`
- `webpush.ts`: pure WebCrypto VAPID ES256 JWT + aes128gcm encryption
- Actions: `test` (caller), `favorites` (users with matching favorite team),
  `all` (admin only)
- Automatic deactivation of dead endpoints (404/410), delivery tracking in
  `push_subscriptions`, activity logging
- `generate-vapid-keys.ts` + `README.md` with deploy/secrets instructions

### Frontend — `src/app/hooks/usePushNotifications.ts`
- Registers real `pushManager.subscribe()` subscriptions (when
  `VITE_VAPID_PUBLIC_KEY` set), persisted to `push_subscriptions`
- `unsubscribe()` removes browser + server subscription
- `sendTestPush()` → calls the edge function; wired to a **Send Test Push**
  button in Settings with delivered/failed feedback

### Service Workers
- Standalone PWA: `src/sw.ts` (vite-plugin-pwa `injectManifest` mode) — precache
  + runtime caching + push display + notification click navigation
- Embedded host: `public/sw.js` fallback SW registered automatically

### Crypto verification
`node .arena-test/webpush_test.mjs` round-trips the full stack:
JWT signature verified independently, aes128gcm payload decrypts on a
simulated browser side, wrong auth secret rejected. ✅

---

## 3. Leaderboard User Detail Modal

### `src/app/components/LeaderboardDetailModal.tsx`
- Click any leaderboard row (or Details button) → modal
- Stat cards: accuracy, total picks, correct, last pick
- 7-day accuracy trend (`PredictionAccuracyChart`, seeded from the user's
  aggregate stats) with confidence overlay
- Rank crown/medals, current-user badge, backdrop close + Escape-friendly

---

## Verification

| Check | Result |
|---|---|
| Standalone ScoreHub typecheck + build (injectManifest SW, 51 precache entries) | ✅ |
| Root app typecheck (strict) | ✅ |
| Root app build + lint (0 new problems) | ✅ |
| Runtime smoke test (root) | ✅ index + /sw.js 200 |
| Bundle scan: admin actions, push, leaderboard modal strings | ✅ |

## Deploy checklist

```bash
# 1. Migration
supabase db push                                    # from Livescoredashboard2/

# 2. Edge functions
supabase functions deploy admin-action --no-verify-jwt
supabase functions deploy send-push-notification --no-verify-jwt
supabase secrets set VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:... 

# 3. Frontend
# Livescoredashboard2/.env : VITE_VAPID_PUBLIC_KEY=<from generate-vapid-keys.ts>
# Root .env               : VITE_VAPID_PUBLIC_KEY=<same>

# 4. Optional: cron the favorites push when a favorite team's match starts
```

## Remaining optional backlog (not yet done)
- OneSignal/Firebase for push when the site is closed (current: Web Push
  requires the browser to be running)
- MeiliSearch/Algolia server-side search (Fuse.js client-side active)
- Admin: ban user from auth (currently suspends account + revokes premium)
- Next.js SSR migration
- Betting partner integration (requires partnerships/legal)
