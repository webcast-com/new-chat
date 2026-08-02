# admin-action — Admin Actions Edge Function (Phase 5.7)

Server-side admin mutations using the service role. The client never touches
other users' rows directly — RLS keeps that locked down; this function is the
only path for admin mutations.

## Deploy

```bash
cd Livescoredashboard2
supabase link --project-ref vgofxfjbcaplgrhodxmn
supabase functions deploy admin-action --no-verify-jwt
# Ensure SUPABASE_SERVICE_ROLE_KEY secret is set (default for edge functions)
```

Apply the RLS migration first:

```bash
supabase db push   # or run supabase/migrations/phase6_admin_and_push.sql
```

## API

`POST /functions/v1/admin-action` — requires a signed-in user whose
`user_profiles.is_admin = true` (or email contains "admin").

| action            | payload                                          | effect                                        |
|-------------------|--------------------------------------------------|-----------------------------------------------|
| `contact_set_status` | `contact_id`, `status` (`read`/`replied`/`archived`), `admin_notes?` | updates contact status + replied_at/by + notes |
| `payment_refund`  | `payment_id`                                     | marks payment `refunded`, downgrades plan to free if it was the active premium |
| `user_set_status` | `user_id`, `status` (`active`/`suspended`)       | suspends (also revokes premium) or activates  |
| `user_set_admin`  | `user_id`, `is_admin` (bool)                     | grants/revokes admin role                     |

## RLS

`phase6_admin_and_push.sql` adds a `public.is_admin()` helper (security
definer) and admin SELECT/UPDATE policies on `contact_messages`,
`payment_logs`, `user_activity`, `user_profiles`, `user_plans`, `favorites`
and `push_subscriptions`. Revoking an admin's `is_admin` immediately removes
their dashboard access.
