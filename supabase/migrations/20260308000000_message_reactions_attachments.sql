alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text;

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (char_length(reaction) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, reaction)
);

alter table public.message_reactions enable row level security;

create policy "Users can view reactions on accessible messages"
  on public.message_reactions for select
  using (
    exists (
      select 1 from public.messages
      where messages.id = message_reactions.message_id
        and (messages.sender_id = auth.uid() or messages.recipient_id = auth.uid())
    )
  );

create policy "Users can add their own message reactions"
  on public.message_reactions for insert
  with check (user_id = auth.uid() and exists (
    select 1 from public.messages
    where messages.id = message_reactions.message_id
      and (messages.sender_id = auth.uid() or messages.recipient_id = auth.uid())
  ));

create policy "Users can remove their own message reactions"
  on public.message_reactions for delete
  using (user_id = auth.uid());

create index if not exists idx_message_reactions_message_id
  on public.message_reactions(message_id);

insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do update set public = false;

create policy "Authenticated users can upload message attachments"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'message-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Conversation participants can view message attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from public.messages
      where messages.attachment_url = name
        and (messages.sender_id = auth.uid() or messages.recipient_id = auth.uid())
    )
  );

create policy "Users can delete their message attachments"
  on storage.objects for delete to authenticated
  using (bucket_id = 'message-attachments' and owner_id = auth.uid()::text);
