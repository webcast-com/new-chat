-- Phase 8: Hardening (indexes, notification wiring, safety)

-- ── 1. Missing indexes ──────────────────────────────────────────────────────
create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index if not exists shares_post_created_idx on public.shares (post_id, created_at desc);
create index if not exists shares_user_created_idx on public.shares (user_id, created_at desc);
create index if not exists comments_parent_idx on public.comments (parent_id);

-- ── 2. Notify the author of a comment when someone replies to it ────────────
create or replace function public.notify_comment_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_author uuid;
  v_post_owner uuid;
begin
  if new.parent_id is null then return new; end if;

  select user_id into v_parent_author from public.comments where id = new.parent_id;
  if v_parent_author is null or v_parent_author = new.user_id then return new; end if;

  -- Skip when the parent author is also the post owner (they already get the
  -- "New comment on your post" notification from create_post_notification).
  select user_id into v_post_owner from public.posts where id = new.post_id;
  if v_post_owner = v_parent_author then return new; end if;

  insert into public.notification_events (recipient_id, actor_id, kind, title, body, resource_id)
  values (v_parent_author, new.user_id, 'comment_reply', 'Someone replied to your comment', left(new.content, 120), new.post_id);
  return new;
end;
$$;

drop trigger if exists comments_reply_notification on public.comments;
create trigger comments_reply_notification
  after insert on public.comments
  for each row execute function public.notify_comment_reply();

-- ── 3. Notify all members when a broadcast is posted ────────────────────────
create or replace function public.notify_group_broadcast()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_name text;
  v_member uuid;
begin
  if new.kind <> 'broadcast' then return new; end if;

  select name into v_group_name from public.chat_groups where id = new.group_id;
  if v_group_name is null then return new; end if;

  for v_member in
    select m.user_id from public.chat_group_members m
    where m.group_id = new.group_id and m.user_id <> new.sender_id
  loop
    insert into public.notification_events (recipient_id, actor_id, kind, title, body, resource_id)
    values (v_member, new.sender_id, 'group_broadcast', '📢 ' || v_group_name, left(new.content, 120), new.group_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists group_broadcast_notification on public.chat_group_messages;
create trigger group_broadcast_notification
  after insert on public.chat_group_messages
  for each row execute function public.notify_group_broadcast();

-- ── 4. Notify a user when they are added to a group (not on self-join) ──────
create or replace function public.notify_group_member_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_name text;
  v_actor uuid;
begin
  v_actor := auth.uid();
  if v_actor is null or v_actor = new.user_id then return new; end if;

  select name into v_group_name from public.chat_groups where id = new.group_id;
  if v_group_name is null then return new; end if;

  insert into public.notification_events (recipient_id, actor_id, kind, title, body, resource_id)
  values (new.user_id, v_actor, 'group_invite', 'You were added to ' || v_group_name, '', new.group_id);
  return new;
end;
$$;

drop trigger if exists group_member_added_notification on public.chat_group_members;
create trigger group_member_added_notification
  after insert on public.chat_group_members
  for each row execute function public.notify_group_member_added();

-- ── 5. Safety: owners cannot leave their own group through the leave policy ─
-- (The "Members can leave groups" delete policy would let an owner delete
-- their own membership and orphan the group. Recreate it to exclude owners.)
drop policy if exists "Members can leave groups" on public.chat_group_members;
create policy "Members can leave groups" on public.chat_group_members
  for delete using (
    user_id = auth.uid()
    and not exists (
      select 1 from public.chat_groups g
      where g.id = chat_group_members.group_id and g.owner_id = auth.uid()
    )
  );
