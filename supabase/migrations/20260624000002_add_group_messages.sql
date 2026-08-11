-- Group chat messages.
--
-- This migration originally shared version 20260624000000 with the public-feed
-- policy migration. The version was made unique so Supabase can order and track
-- both migrations. All statements are idempotent because some environments may
-- already contain the table from the old filename.

create table if not exists public.chat_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists chat_group_messages_group_created_idx
  on public.chat_group_messages(group_id, created_at);

alter table public.chat_group_messages enable row level security;

-- The final repair migration replaces these policies with non-recursive helper
-- functions. These definitions keep a clean install usable before that repair
-- migration is reached.
drop policy if exists "Group members read messages" on public.chat_group_messages;
create policy "Group members read messages" on public.chat_group_messages
  for select to authenticated using (
    exists (
      select 1
      from public.chat_group_members m
      where m.group_id = chat_group_messages.group_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Group members send messages" on public.chat_group_messages;
create policy "Group members send messages" on public.chat_group_messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.chat_group_members m
      where m.group_id = chat_group_messages.group_id
        and m.user_id = auth.uid()
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'chat_group_messages'
     ) then
    execute 'alter publication supabase_realtime add table public.chat_group_messages';
  end if;
end
$$;
