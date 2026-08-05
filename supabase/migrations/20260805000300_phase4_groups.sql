-- Phase 4: First-class groups (roles, invites, member management)

-- ── Roles ──────────────────────────────────────────────────────────────────
alter table public.chat_group_members
  add column if not exists role text not null default 'member'
    check (role in ('owner', 'admin', 'member'));

-- The group creator is the owner
update public.chat_group_members m
set role = 'owner'
from public.chat_groups g
where g.id = m.group_id and g.owner_id = m.user_id;

-- Guarantee a membership row for every creator
insert into public.chat_group_members (group_id, user_id, role)
select g.id, g.owner_id, 'owner'
from public.chat_groups g
on conflict (group_id, user_id) do update set role = 'owner';

-- ── Invite codes + avatar ──────────────────────────────────────────────────
alter table public.chat_groups
  add column if not exists invite_code text unique,
  add column if not exists avatar_url text;

-- Backfill invite codes for existing groups
update public.chat_groups g
set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where g.invite_code is null;

-- ── RLS: owners AND admins manage membership ───────────────────────────────
drop policy if exists "Group owners manage membership" on public.chat_group_members;
create policy "Owners and admins manage membership" on public.chat_group_members
  for all using (
    exists (
      select 1 from public.chat_group_members me
      where me.group_id = chat_group_members.group_id
        and me.user_id = auth.uid()
        and me.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.chat_group_members me
      where me.group_id = chat_group_members.group_id
        and me.user_id = auth.uid()
        and me.role in ('owner', 'admin')
    )
  );

-- Group creators join their own group as owner (insert path)
create policy "Creators join their groups as owner" on public.chat_group_members
  for insert with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.chat_groups g
      where g.id = group_id and g.owner_id = auth.uid()
    )
  );

-- Any member can leave
create policy "Members can leave groups" on public.chat_group_members
  for delete using (user_id = auth.uid());

-- ── Group updates by owners/admins (name, description, avatar, invite) ─────
drop policy if exists "Owners update groups" on public.chat_groups;
create policy "Owners and admins update groups" on public.chat_groups
  for update using (
    exists (
      select 1 from public.chat_group_members me
      where me.group_id = chat_groups.id and me.user_id = auth.uid()
        and me.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.chat_group_members me
      where me.group_id = chat_groups.id and me.user_id = auth.uid()
        and me.role in ('owner', 'admin')
    )
  );

-- ── Join via invite code (RPC, security definer so it can insert) ──────────
create or replace function public.join_group_with_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  select id into v_group_id
  from public.chat_groups
  where invite_code = upper(trim(p_invite_code));

  if v_group_id is null then
    raise exception 'invalid_invite';
  end if;

  insert into public.chat_group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

grant execute on function public.join_group_with_invite(text) to authenticated;

-- ── Realtime for live member/group updates ─────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_group_members'
  ) then
    alter publication supabase_realtime add table public.chat_group_members;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_groups'
  ) then
    alter publication supabase_realtime add table public.chat_groups;
  end if;
end $$;
