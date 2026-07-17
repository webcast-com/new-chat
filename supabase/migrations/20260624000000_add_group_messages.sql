create table public.chat_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index chat_group_messages_group_created_idx on public.chat_group_messages(group_id, created_at);

alter table public.chat_group_messages enable row level security;

create policy "Group members read messages" on public.chat_group_messages
  for select using (exists (
    select 1 from public.chat_group_members m
    where m.group_id = chat_group_messages.group_id and m.user_id = auth.uid()
  ));

create policy "Group members send messages" on public.chat_group_messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from public.chat_group_members m
      where m.group_id = chat_group_messages.group_id and m.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.chat_group_messages;
