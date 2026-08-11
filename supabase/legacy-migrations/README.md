# Legacy migrations

These files are retained for history only. They are **not** in
`supabase/migrations` and are not executed by Supabase CLI.

The active database definition is the single canonical migration:

```text
supabase/migrations/20260811000000_full_database.sql
```

For an existing remote project that already recorded the old migration
versions, apply the canonical file from the Supabase SQL Editor (or use
`supabase migration repair` deliberately after taking a database backup).
Do not run the archived files again.
