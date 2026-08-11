alter table public.posts add column if not exists media_type text not null default 'image' check (media_type in ('image', 'video'));

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('like', 'comment', 'friend_request', 'message', 'system')),
  title text not null,
  body text not null default '',
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.chat_group_members (
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  media_url text not null default '',
  media_type text not null default 'none' check (media_type in ('none', 'image', 'video')),
  scheduled_for timestamptz not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null,
  title text not null,
  detail text not null default '',
  resource_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.user_privacy_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_visibility text not null default 'public' check (profile_visibility in ('public', 'friends', 'private')),
  allow_friend_requests boolean not null default true,
  allow_messages boolean not null default true,
  show_activity boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'profile', 'comment', 'message')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists notification_events_recipient_created_idx on public.notification_events(recipient_id, created_at desc);
create index if not exists activity_events_user_created_idx on public.activity_events(user_id, created_at desc);
create index if not exists scheduled_posts_user_scheduled_idx on public.scheduled_posts(user_id, scheduled_for);
create index if not exists moderation_reports_status_created_idx on public.moderation_reports(status, created_at desc);

alter table public.notification_events enable row level security;
alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.activity_events enable row level security;
alter table public.user_privacy_settings enable row level security;
alter table public.moderation_reports enable row level security;

create policy "Users read their notifications" on public.notification_events for select using (recipient_id = auth.uid());
create policy "Users update their notifications" on public.notification_events for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "Users create groups" on public.chat_groups for insert with check (owner_id = auth.uid());
create policy "Members read groups" on public.chat_groups for select using (owner_id = auth.uid() or exists (select 1 from public.chat_group_members m where m.group_id = id and m.user_id = auth.uid()));
create policy "Owners update groups" on public.chat_groups for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners delete groups" on public.chat_groups for delete using (owner_id = auth.uid());
create policy "Users read group membership" on public.chat_group_members for select using (user_id = auth.uid() or exists (select 1 from public.chat_groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy "Group owners manage membership" on public.chat_group_members for all using (exists (select 1 from public.chat_groups g where g.id = group_id and g.owner_id = auth.uid())) with check (exists (select 1 from public.chat_groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy "Users manage scheduled posts" on public.scheduled_posts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users read visible activity" on public.activity_events for select using (user_id = auth.uid() or exists (select 1 from public.user_privacy_settings p where p.user_id = activity_events.user_id and p.show_activity = true));
create policy "Users manage own privacy" on public.user_privacy_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users create reports" on public.moderation_reports for insert with check (reporter_id = auth.uid());
create policy "Users read own reports" on public.moderation_reports for select using (reporter_id = auth.uid());

insert into public.user_privacy_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.create_post_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner uuid;
  notification_kind text;
  notification_title text;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner is null or post_owner = new.user_id then return new; end if;
  notification_kind := case when tg_table_name = 'comments' then 'comment' else 'like' end;
  notification_title := case when notification_kind = 'comment' then 'New comment on your post' else 'Someone reacted to your post' end;
  insert into public.notification_events (recipient_id, actor_id, kind, title, body, resource_id)
  values (post_owner, new.user_id, notification_kind, notification_title, '', new.post_id);
  insert into public.activity_events (user_id, actor_id, kind, title, detail, resource_id)
  values (post_owner, new.user_id, notification_kind, notification_title, '', new.post_id);
  return new;
end;
$$;

drop trigger if exists comments_create_notification on public.comments;
create trigger comments_create_notification after insert on public.comments for each row execute function public.create_post_notification();
drop trigger if exists reactions_create_notification on public.reactions;
create trigger reactions_create_notification after insert on public.reactions for each row execute function public.create_post_notification();
