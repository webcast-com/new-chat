# Hyperlink Social Connect database

The main application uses the Supabase project configured by
`VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`.

There is now one active database migration:

```text
supabase/migrations/20260811000000_full_database.sql
```

Older migrations are retained under `supabase/legacy-migrations` for history
only and are not loaded by Supabase CLI. The canonical file is idempotent and
creates/repairs the complete social schema, including messaging, stories,
groups, analytics, moderation, drafts, movie reviews, watchlists, locations,
storage buckets, triggers, indexes, and RLS policies.

## Public read access

Per product request, every application table has an explicit `Public read
access` policy for `anon` and `authenticated` users. This means direct
messages, drafts, blocks, reports, analytics, privacy settings, and group
membership rows are publicly readable. Do not use this configuration for
private production data without changing those policies.

Writes remain protected by table-specific authenticated-user policies. Public
post/profile media and profile pictures are readable from their public storage
buckets. Message attachments remain in a private bucket.

## Apply the canonical database

### New Supabase project

Use a database owner connection, not the browser anon key:

```bash
npx supabase@latest link --project-ref <your-project-ref>
npx supabase@latest db push
```

### Existing project

The existing project has already recorded the archived migration versions.
Take a database backup first, then paste the canonical migration into the
Supabase SQL Editor. Running `db push` without reconciling the old migration
history can report missing remote migrations because the old files are no
longer active.

The canonical migration repairs the previously observed failures:

- missing `reports`, `blocked_users`, `post_drafts`, and `profiles.is_verified`;
- `42P17` recursive group-chat RLS policies;
- missing `post_drafts.user_id` uniqueness for client upserts;
- missing Realtime publication entries for direct and group messages;
- missing message-attachment, post-media, and profile-picture storage setup;
- duplicate migration version `20260624000000`.

Do not commit database passwords or service-role keys. The public anon key is
only for client requests and cannot apply schema migrations.
