-- Phase 5: Group broadcast (owner/admin announcements + push)

-- ── Broadcast messages ──────────────────────────────────────────────────────
alter table public.chat_group_messages
  add column if not exists kind text not null default 'message'
    check (kind in ('message', 'broadcast')),
  add column if not exists broadcast_by uuid references auth.users(id) on delete set null;

create index if not exists chat_group_messages_group_kind_created_idx
  on public.chat_group_messages (group_id, kind, created_at);

-- ── Per-member broadcast mute ───────────────────────────────────────────────
alter table public.chat_group_members
  add column if not exists broadcast_muted boolean not null default false;

-- ── RLS: only owners/admins can post broadcasts ─────────────────────────────
drop policy if exists "Group members send messages" on public.chat_group_messages;
create policy "Group members send messages" on public.chat_group_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_group_members m
      where m.group_id = chat_group_messages.group_id and m.user_id = auth.uid()
    )
    and (
      chat_group_messages.kind <> 'broadcast'
      or exists (
        select 1 from public.chat_group_members m
        where m.group_id = chat_group_messages.group_id
          and m.user_id = auth.uid()
          and m.role in ('owner', 'admin')
      )
    )
  );
