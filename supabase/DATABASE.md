# Hyperlink Social Connect database

The main application uses the Supabase project configured by `VITE_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_URL`. The migrations are incremental, and the current
canonical repair is:

```text
supabase/migrations/20260811000000_repair_database.sql
```

It is safe to run against a partially migrated project: it uses idempotent DDL,
repairs the recursive group-chat RLS policies, creates the trust/moderation and
draft tables, adds the message attachment schema, and enables realtime for
`messages` and `chat_group_messages`.

## Apply the database

Use a Supabase database owner connection, not the browser anon key:

```bash
npx supabase@latest link --project-ref <your-project-ref>
npx supabase@latest db push
```

Or paste the migration into the Supabase SQL editor. `db push` must be run from
the repository root so it sees `supabase/migrations`.

## Verify the repair

After applying the migration, check that:

- `profiles.is_verified`, `reports`, `blocked_users`, and `post_drafts` exist.
- `post_drafts` has a unique index on `user_id`.
- The `chat_groups`, `chat_group_members`, and `chat_group_messages` policies do
  not return `42P17` infinite-recursion errors.
- `messages` and `chat_group_messages` are members of the
  `supabase_realtime` publication.
- The `message-attachments` private storage bucket exists.

Do not commit database passwords or service-role keys. The public anon key is
only for client requests and cannot apply schema migrations.
