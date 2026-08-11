/*
  Hyperlink Social Connect — canonical full database

  This single idempotent migration brings a clean project and a partially
  migrated project to the same schema without dropping user data. It includes
  the complete social, messaging, stories, groups, analytics, moderation,
  movie-review, watchlist, location, storage, trigger, index, and policy
  definitions used by the current UI.

  Product configuration intentionally grants anonymous SELECT access to every
  application table. Writes remain protected by table-specific policies and
  message attachments remain private. Run it with a database owner/service
  role through `supabase db push` or the Supabase SQL editor; the public anon
  key cannot apply migrations.
*/

create extension if not exists pgcrypto;

/* -------------------------------------------------------------------------- */
/* Core social schema                                                         */
/* -------------------------------------------------------------------------- */

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null default '',
  bio text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  image_url text not null default '',
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  shares_count integer not null default 0,
  view_count integer not null default 0,
  media_type text not null default 'image',
  visibility text not null default 'public',
  county text,
  constituency text,
  last_engagement_at timestamptz default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  shared_content text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester_id, recipient_id),
  check (requester_id <> recipient_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  related_post_id uuid references public.posts(id) on delete cascade,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  is_read boolean not null default false,
  attachment_url text,
  attachment_name text,
  attachment_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text,
  caption text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (story_id, viewer_id)
);

-- Add columns that may be absent on older installations.
alter table public.profiles
  add column if not exists county text,
  add column if not exists constituency text,
  add column if not exists location text,
  add column if not exists age integer,
  add column if not exists work text,
  add column if not exists education text,
  add column if not exists gender text,
  add column if not exists is_verified boolean not null default false,
  add column if not exists verification_requested_at timestamptz,
  add column if not exists verified_at timestamptz;

alter table public.posts
  add column if not exists shares_count integer not null default 0,
  add column if not exists view_count integer not null default 0,
  add column if not exists media_type text not null default 'image',
  add column if not exists visibility text not null default 'public',
  add column if not exists county text,
  add column if not exists constituency text,
  add column if not exists last_engagement_at timestamptz default now();

alter table public.messages
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text;

alter table public.stories
  add column if not exists media_type text default 'image',
  add column if not exists duration integer default 5,
  add column if not exists background_color text default '',
  add column if not exists text_content text default '',
  add column if not exists views_count integer not null default 0,
  add column if not exists link_url text default '',
  add column if not exists music_url text default '',
  add column if not exists is_highlight boolean not null default false,
  add column if not exists order_index integer not null default 0;

alter table public.story_views
  add column if not exists view_duration integer default 0,
  add column if not exists completed boolean not null default false;

-- Keep existing data valid before adding the canonical checks.
update public.posts
set visibility = 'public'
where visibility is null
   or visibility not in ('public', 'friends', 'county', 'constituency');

update public.posts
set media_type = 'image'
where media_type is null
   or media_type not in ('image', 'video');

update public.reactions
set reaction_type = 'like'
where reaction_type is null
   or reaction_type not in ('like', 'love', 'haha', 'wow', 'sad', 'angry');

update public.friendships
set status = 'pending'
where status is null
   or status not in ('pending', 'accepted', 'blocked');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.posts'::regclass
      and conname = 'posts_media_type_check'
  ) then
    alter table public.posts
      add constraint posts_media_type_check
      check (media_type in ('image', 'video'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.posts'::regclass
      and conname = 'posts_visibility_check'
  ) then
    alter table public.posts
      add constraint posts_visibility_check
      check (visibility in ('public', 'friends', 'county', 'constituency'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.reactions'::regclass
      and conname = 'reactions_reaction_type_check'
  ) then
    alter table public.reactions
      add constraint reactions_reaction_type_check
      check (reaction_type in ('like', 'love', 'haha', 'wow', 'sad', 'angry'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.friendships'::regclass
      and conname = 'friendships_status_check'
  ) then
    alter table public.friendships
      add constraint friendships_status_check
      check (status in ('pending', 'accepted', 'blocked'));
  end if;
end
$$;

/* -------------------------------------------------------------------------- */
/* Story extensions                                                           */
/* -------------------------------------------------------------------------- */

create table if not exists public.story_replies (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.story_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  cover_image_url text not null default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_highlight_items (
  id uuid primary key default gen_random_uuid(),
  highlight_id uuid not null references public.story_highlights(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (highlight_id, story_id)
);

create table if not exists public.story_reactions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  unique (story_id, user_id)
);

/* -------------------------------------------------------------------------- */
/* Analytics and notifications                                               */
/* -------------------------------------------------------------------------- */

create table if not exists public.user_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  posts_created integer not null default 0,
  likes_received integer not null default 0,
  comments_received integer not null default 0,
  followers_gained integer not null default 0,
  engagement_rate numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  reference_id uuid,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  description text not null,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null,
  title text not null,
  body text not null default '',
  resource_id uuid,
  read_at timestamptz,
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
  profile_visibility text not null default 'public',
  allow_friend_requests boolean not null default true,
  allow_messages boolean not null default true,
  show_activity boolean not null default true,
  updated_at timestamptz not null default now()
);

/* -------------------------------------------------------------------------- */
/* Group chat schema                                                          */
/* -------------------------------------------------------------------------- */

create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.chat_group_members (
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.chat_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  media_url text not null default '',
  media_type text not null default 'none',
  scheduled_for timestamptz not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

/* -------------------------------------------------------------------------- */
/* Trust, moderation, and drafts                                              */
/* -------------------------------------------------------------------------- */

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_post_id uuid references public.posts(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  reported_comment_id uuid references public.comments(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.post_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  image_url text not null default '',
  visibility text not null default 'public',
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.post_drafts
  add column if not exists content text not null default '',
  add column if not exists image_url text not null default '',
  add column if not exists visibility text not null default 'public',
  add column if not exists scheduled_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- The client upserts drafts with onConflict: user_id. Keep one server draft
-- per user, preserving the newest row if a partially migrated database has
-- duplicates.
delete from public.post_drafts older
using public.post_drafts newer
where older.user_id = newer.user_id
  and older.id <> newer.id
  and (
    coalesce(older.updated_at, older.created_at, '-infinity'::timestamptz),
    older.id::text
  ) < (
    coalesce(newer.updated_at, newer.created_at, '-infinity'::timestamptz),
    newer.id::text
  );

create unique index if not exists post_drafts_user_id_key
  on public.post_drafts(user_id);

/* -------------------------------------------------------------------------- */
/* Auxiliary tables used by the app                                           */
/* -------------------------------------------------------------------------- */

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (char_length(reaction) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, reaction)
);

create table if not exists public.locations (
  id bigint generated by default as identity primary key,
  county text not null,
  constituency text not null,
  created_at timestamptz not null default now(),
  unique (county, constituency)
);

insert into public.locations (county, constituency) values
  ('Baringo', 'Baringo Central'), ('Baringo', 'Baringo North'), ('Baringo', 'Baringo South'), ('Baringo', 'Eldama Ravine'), ('Baringo', 'Mogotio'), ('Baringo', 'Tiaty'),
  ('Bomet', 'Bomet Central'), ('Bomet', 'Bomet East'), ('Bomet', 'Chepalungu'), ('Bomet', 'Konoin'), ('Bomet', 'Sotik'),
  ('Bungoma', 'Bumula'), ('Bungoma', 'Kabuchai'), ('Bungoma', 'Kanduyi'), ('Bungoma', 'Kimilili'), ('Bungoma', 'Mt. Elgon'), ('Bungoma', 'Sirisia'), ('Bungoma', 'Tongaren'), ('Bungoma', 'Webuye East'), ('Bungoma', 'Webuye West'),
  ('Busia', 'Budalangi'), ('Busia', 'Butula'), ('Busia', 'Funyula'), ('Busia', 'Matayos'), ('Busia', 'Nambale'), ('Busia', 'Teso North'), ('Busia', 'Teso South'),
  ('Elgeyo-Marakwet', 'Keiyo North'), ('Elgeyo-Marakwet', 'Keiyo South'), ('Elgeyo-Marakwet', 'Marakwet East'), ('Elgeyo-Marakwet', 'Marakwet West'),
  ('Embu', 'Manyatta'), ('Embu', 'Mbeere North'), ('Embu', 'Mbeere South'), ('Embu', 'Runyenjes'),
  ('Garissa', 'Balambala'), ('Garissa', 'Dadaab'), ('Garissa', 'Fafi'), ('Garissa', 'Garissa Township'), ('Garissa', 'Ijara'), ('Garissa', 'Lagdera'),
  ('Homa Bay', 'Homa Bay Town'), ('Homa Bay', 'Kabondo Kasipul'), ('Homa Bay', 'Karachuonyo'), ('Homa Bay', 'Kasipul'), ('Homa Bay', 'Ndhiwa'), ('Homa Bay', 'Rangwe'), ('Homa Bay', 'Suba North'), ('Homa Bay', 'Suba South'),
  ('Isiolo', 'Isiolo North'), ('Isiolo', 'Isiolo South'),
  ('Kajiado', 'Kajiado Central'), ('Kajiado', 'Kajiado East'), ('Kajiado', 'Kajiado North'), ('Kajiado', 'Kajiado South'), ('Kajiado', 'Kajiado West'),
  ('Kakamega', 'Butere'), ('Kakamega', 'Ikolomani'), ('Kakamega', 'Khwisero'), ('Kakamega', 'Likuyani'), ('Kakamega', 'Lugari'), ('Kakamega', 'Lurambi'), ('Kakamega', 'Malava'), ('Kakamega', 'Matungu'), ('Kakamega', 'Mumias East'), ('Kakamega', 'Mumias West'), ('Kakamega', 'Navakholo'), ('Kakamega', 'Shinyalu'),
  ('Kericho', 'Ainamoi'), ('Kericho', 'Belgut'), ('Kericho', 'Bureti'), ('Kericho', 'Kipkelion East'), ('Kericho', 'Kipkelion West'), ('Kericho', 'Sigowet-Soin'),
  ('Kiambu', 'Gatundu North'), ('Kiambu', 'Gatundu South'), ('Kiambu', 'Githunguri'), ('Kiambu', 'Juja'), ('Kiambu', 'Kabete'), ('Kiambu', 'Kiambaa'), ('Kiambu', 'Kiambu'), ('Kiambu', 'Kikuyu'), ('Kiambu', 'Lari'), ('Kiambu', 'Limuru'), ('Kiambu', 'Ruiru'), ('Kiambu', 'Thika Town'),
  ('Kilifi', 'Ganze'), ('Kilifi', 'Kaloleni'), ('Kilifi', 'Kilifi North'), ('Kilifi', 'Kilifi South'), ('Kilifi', 'Magarini'), ('Kilifi', 'Malindi'), ('Kilifi', 'Rabai'),
  ('Kirinyaga', 'Gichugu'), ('Kirinyaga', 'Kirinyaga Central'), ('Kirinyaga', 'Mwea'), ('Kirinyaga', 'Ndia'),
  ('Kisii', 'Bobasi'), ('Kisii', 'Bonchari'), ('Kisii', 'Bomachoge Borabu'), ('Kisii', 'Bomachoge Chache'), ('Kisii', 'Kitutu Chache North'), ('Kisii', 'Kitutu Chache South'), ('Kisii', 'Nyaribari Chache'), ('Kisii', 'Nyaribari Masaba'), ('Kisii', 'South Mugirango'),
  ('Kisumu', 'Kisumu Central'), ('Kisumu', 'Kisumu East'), ('Kisumu', 'Kisumu West'), ('Kisumu', 'Muhoroni'), ('Kisumu', 'Nyakach'), ('Kisumu', 'Nyando'), ('Kisumu', 'Seme'),
  ('Kitui', 'Kitui Central'), ('Kitui', 'Kitui East'), ('Kitui', 'Kitui Rural'), ('Kitui', 'Kitui South'), ('Kitui', 'Kitui West'), ('Kitui', 'Mwingi Central'), ('Kitui', 'Mwingi North'), ('Kitui', 'Mwingi West'),
  ('Kwale', 'Kinango'), ('Kwale', 'Lunga Lunga'), ('Kwale', 'Matuga'), ('Kwale', 'Msambweni'),
  ('Laikipia', 'Laikipia East'), ('Laikipia', 'Laikipia North'), ('Laikipia', 'Laikipia West'),
  ('Lamu', 'Lamu East'), ('Lamu', 'Lamu West'),
  ('Machakos', 'Kangundo'), ('Machakos', 'Kathiani'), ('Machakos', 'Machakos Town'), ('Machakos', 'Masinga'), ('Machakos', 'Matungulu'), ('Machakos', 'Mavoko'), ('Machakos', 'Mwala'), ('Machakos', 'Yatta'),
  ('Makueni', 'Kaiti'), ('Makueni', 'Kibwezi East'), ('Makueni', 'Kibwezi West'), ('Makueni', 'Kilome'), ('Makueni', 'Makindu'), ('Makueni', 'Mbooni'),
  ('Mandera', 'Banissa'), ('Mandera', 'Lafey'), ('Mandera', 'Mandera East'), ('Mandera', 'Mandera North'), ('Mandera', 'Mandera South'), ('Mandera', 'Mandera West'),
  ('Marsabit', 'Laisamis'), ('Marsabit', 'Moyale'), ('Marsabit', 'North Horr'), ('Marsabit', 'Saku'),
  ('Meru', 'Buuri'), ('Meru', 'Central Imenti'), ('Meru', 'Igembe Central'), ('Meru', 'Igembe North'), ('Meru', 'Igembe South'), ('Meru', 'North Imenti'), ('Meru', 'South Imenti'), ('Meru', 'Tigania East'), ('Meru', 'Tigania West'),
  ('Migori', 'Awendo'), ('Migori', 'Kuria East'), ('Migori', 'Kuria West'), ('Migori', 'Nyatike'), ('Migori', 'Rongo'), ('Migori', 'Suna East'), ('Migori', 'Suna West'), ('Migori', 'Uriri'),
  ('Mombasa', 'Changamwe'), ('Mombasa', 'Jomvu'), ('Mombasa', 'Kisauni'), ('Mombasa', 'Likoni'), ('Mombasa', 'Mvita'), ('Mombasa', 'Nyali'),
  ('Murang''a', 'Gatanga'), ('Murang''a', 'Kandara'), ('Murang''a', 'Kangema'), ('Murang''a', 'Kiharu'), ('Murang''a', 'Kigumo'), ('Murang''a', 'Maragwa'), ('Murang''a', 'Mathioya'),
  ('Nairobi City', 'Dagoretti North'), ('Nairobi City', 'Dagoretti South'), ('Nairobi City', 'Embakasi Central'), ('Nairobi City', 'Embakasi East'), ('Nairobi City', 'Embakasi North'), ('Nairobi City', 'Embakasi South'), ('Nairobi City', 'Embakasi West'), ('Nairobi City', 'Kamukunji'), ('Nairobi City', 'Kasarani'), ('Nairobi City', 'Kibra'), ('Nairobi City', 'Langata'), ('Nairobi City', 'Makadara'), ('Nairobi City', 'Mathare'), ('Nairobi City', 'Roysambu'), ('Nairobi City', 'Ruaraka'), ('Nairobi City', 'Starehe'), ('Nairobi City', 'Westlands'),
  ('Nakuru', 'Bahati'), ('Nakuru', 'Gilgil'), ('Nakuru', 'Kuresoi North'), ('Nakuru', 'Kuresoi South'), ('Nakuru', 'Molo'), ('Nakuru', 'Naivasha'), ('Nakuru', 'Nakuru Town East'), ('Nakuru', 'Nakuru Town West'), ('Nakuru', 'Njoro'), ('Nakuru', 'Rongai'), ('Nakuru', 'Subukia'),
  ('Nandi', 'Aldai'), ('Nandi', 'Chesumei'), ('Nandi', 'Emgwen'), ('Nandi', 'Mosop'), ('Nandi', 'Nandi Hills'), ('Nandi', 'Tinderet'),
  ('Narok', 'Emurua Dikirr'), ('Narok', 'Kilgoris'), ('Narok', 'Narok East'), ('Narok', 'Narok North'), ('Narok', 'Narok South'), ('Narok', 'Narok West'),
  ('Nyamira', 'Borabu'), ('Nyamira', 'Kitutu Masaba'), ('Nyamira', 'North Mugirango'), ('Nyamira', 'West Mugirango'),
  ('Nyandarua', 'Kinangop'), ('Nyandarua', 'Kipipiri'), ('Nyandarua', 'Ndaragwa'), ('Nyandarua', 'Ol Jorok'), ('Nyandarua', 'Ol Kalou'),
  ('Nyeri', 'Kieni'), ('Nyeri', 'Mathira'), ('Nyeri', 'Mukurweini'), ('Nyeri', 'Nyeri Town'), ('Nyeri', 'Othaya'), ('Nyeri', 'Tetu'),
  ('Samburu', 'Samburu East'), ('Samburu', 'Samburu North'), ('Samburu', 'Samburu West'),
  ('Siaya', 'Alego Usonga'), ('Siaya', 'Bondo'), ('Siaya', 'Gem'), ('Siaya', 'Rarieda'), ('Siaya', 'Ugenya'), ('Siaya', 'Ugunja'),
  ('Taita-Taveta', 'Mwatate'), ('Taita-Taveta', 'Taveta'), ('Taita-Taveta', 'Voi'), ('Taita-Taveta', 'Wundanyi'),
  ('Tana River', 'Bura'), ('Tana River', 'Galole'), ('Tana River', 'Garsen'),
  ('Tharaka-Nithi', 'Chuka/Igambang''ombe'), ('Tharaka-Nithi', 'Maara'), ('Tharaka-Nithi', 'Tharaka'),
  ('Trans Nzoia', 'Cherangany'), ('Trans Nzoia', 'Endebess'), ('Trans Nzoia', 'Kiminini'), ('Trans Nzoia', 'Kwanza'), ('Trans Nzoia', 'Saboti'),
  ('Turkana', 'Loima'), ('Turkana', 'Turkana Central'), ('Turkana', 'Turkana East'), ('Turkana', 'Turkana North'), ('Turkana', 'Turkana South'), ('Turkana', 'Turkana West'),
  ('Uasin Gishu', 'Ainabkoi'), ('Uasin Gishu', 'Kapseret'), ('Uasin Gishu', 'Kesses'), ('Uasin Gishu', 'Moiben'), ('Uasin Gishu', 'Soy'), ('Uasin Gishu', 'Turbo'),
  ('Vihiga', 'Emuhaya'), ('Vihiga', 'Hamisi'), ('Vihiga', 'Luanda'), ('Vihiga', 'Sabatia'), ('Vihiga', 'Vihiga'),
  ('Wajir', 'Eldas'), ('Wajir', 'Tarbaj'), ('Wajir', 'Wajir East'), ('Wajir', 'Wajir North'), ('Wajir', 'Wajir South'), ('Wajir', 'Wajir West'),
  ('West Pokot', 'Kacheliba'), ('West Pokot', 'Kapenguria'), ('West Pokot', 'Pokot South'), ('West Pokot', 'Sigor')
on conflict (county, constituency) do nothing;

alter table public.locations
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  rating integer not null check (rating between 1 and 5),
  text text not null default '',
  author_name text not null default 'Anonymous',
  created_at timestamptz not null default now()
);

create table if not exists public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, movie_id)
);

/* -------------------------------------------------------------------------- */
/* Indexes                                                                    */
/* -------------------------------------------------------------------------- */

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_location on public.profiles(county, constituency);
create index if not exists idx_posts_user_created on public.posts(user_id, created_at desc);
create index if not exists idx_posts_created_at on public.posts(created_at desc);
create index if not exists idx_posts_visibility_location on public.posts(visibility, county, constituency, created_at desc);
create index if not exists idx_connections_follower on public.connections(follower_id);
create index if not exists idx_connections_following on public.connections(following_id);
create index if not exists idx_likes_post on public.likes(post_id);
create index if not exists idx_likes_user on public.likes(user_id);
create index if not exists idx_comments_post on public.comments(post_id);
create index if not exists idx_reactions_post on public.reactions(post_id);
create index if not exists idx_reactions_user on public.reactions(user_id);
create index if not exists idx_shares_post on public.shares(post_id);
create index if not exists idx_friendships_requester on public.friendships(requester_id);
create index if not exists idx_friendships_recipient on public.friendships(recipient_id);
create index if not exists idx_messages_sender_created on public.messages(sender_id, created_at desc);
create index if not exists idx_messages_recipient_created on public.messages(recipient_id, created_at desc);
create index if not exists idx_messages_conversation on public.messages(sender_id, recipient_id, created_at desc);
create index if not exists idx_message_reactions_message on public.message_reactions(message_id);
create index if not exists idx_stories_user_expires on public.stories(user_id, expires_at desc);
create index if not exists idx_story_views_story on public.story_views(story_id);
create index if not exists idx_story_replies_story on public.story_replies(story_id);
create index if not exists idx_story_reactions_story on public.story_reactions(story_id);
create index if not exists idx_story_highlights_user on public.story_highlights(user_id);
create index if not exists idx_user_analytics_user_date on public.user_analytics(user_id, date desc);
create index if not exists idx_user_notifications_user_created on public.user_notifications(user_id, created_at desc);
create index if not exists idx_activity_logs_user_created on public.activity_logs(user_id, created_at desc);
create index if not exists idx_notification_events_recipient_created on public.notification_events(recipient_id, created_at desc);
create index if not exists idx_activity_events_user_created on public.activity_events(user_id, created_at desc);
create index if not exists idx_scheduled_posts_user_scheduled on public.scheduled_posts(user_id, scheduled_for);
create index if not exists idx_chat_group_messages_group_created on public.chat_group_messages(group_id, created_at);
create index if not exists idx_blocked_users_blocker on public.blocked_users(blocker_id);
create index if not exists idx_blocked_users_blocked on public.blocked_users(blocked_id);
create index if not exists idx_reports_reporter on public.reports(reporter_id);
create index if not exists idx_reports_status on public.reports(status, created_at desc);
create index if not exists reviews_movie_created_idx on public.reviews(movie_id, created_at desc);
create index if not exists idx_watchlists_user on public.watchlists(user_id);
create index if not exists idx_locations_county on public.locations(county);

/* -------------------------------------------------------------------------- */
/* Safe profile creation and analytics trigger                                */
/* -------------------------------------------------------------------------- */

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
begin
  base_username := lower(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(coalesce(new.email, 'user'), '@', 1), 'user'),
    '[^a-zA-Z0-9_]+',
    '-',
    'g'
  ));
  base_username := left(nullif(base_username, ''), 40);
  base_username := coalesce(base_username, 'user');

  begin
    insert into public.profiles (id, username, full_name, bio, avatar_url)
    values (new.id, base_username, '', '', '')
    on conflict (id) do nothing;
  exception when unique_violation then
    insert into public.profiles (id, username, full_name, bio, avatar_url)
    values (new.id, left(base_username, 30) || '-' || left(new.id::text, 8), '', '', '')
    on conflict (id) do nothing;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.create_initial_analytics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_analytics (user_id, date)
  values (new.id, current_date)
  on conflict (user_id, date) do nothing;
  return new;
end;
$$;

drop trigger if exists trigger_create_initial_analytics on public.profiles;
create trigger trigger_create_initial_analytics
after insert on public.profiles
for each row execute function public.create_initial_analytics();

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
  select p.user_id into post_owner from public.posts p where p.id = new.post_id;
  if post_owner is null or post_owner = new.user_id then
    return new;
  end if;

  notification_kind := case when tg_table_name = 'comments' then 'comment' else 'like' end;
  notification_title := case
    when notification_kind = 'comment' then 'New comment on your post'
    else 'Someone reacted to your post'
  end;

  insert into public.notification_events (recipient_id, actor_id, kind, title, body, resource_id)
  values (post_owner, new.user_id, notification_kind, notification_title, '', new.post_id);
  insert into public.activity_events (user_id, actor_id, kind, title, detail, resource_id)
  values (post_owner, new.user_id, notification_kind, notification_title, '', new.post_id);
  return new;
end;
$$;

drop trigger if exists comments_create_notification on public.comments;
create trigger comments_create_notification
after insert on public.comments
for each row execute function public.create_post_notification();
drop trigger if exists reactions_create_notification on public.reactions;
create trigger reactions_create_notification
after insert on public.reactions
for each row execute function public.create_post_notification();

/* -------------------------------------------------------------------------- */
/* Non-recursive group-chat authorization                                    */
/* -------------------------------------------------------------------------- */

create or replace function public.is_chat_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_groups g
    where g.id = p_group_id
      and g.owner_id = auth.uid()
  );
$$;

create or replace function public.is_chat_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_groups g
    where g.id = p_group_id
      and g.owner_id = auth.uid()
  ) or exists (
    select 1
    from public.chat_group_members m
    where m.group_id = p_group_id
      and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_chat_group_owner(uuid) from public;
revoke all on function public.is_chat_group_member(uuid) from public;
grant execute on function public.is_chat_group_owner(uuid) to authenticated;
grant execute on function public.is_chat_group_member(uuid) to authenticated;

/* -------------------------------------------------------------------------- */
/* RLS                                                                        */
/* -------------------------------------------------------------------------- */

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.connections enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.shares enable row level security;
alter table public.friendships enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.story_replies enable row level security;
alter table public.story_reactions enable row level security;
alter table public.story_highlights enable row level security;
alter table public.story_highlight_items enable row level security;
alter table public.message_reactions enable row level security;
alter table public.user_analytics enable row level security;
alter table public.user_notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notification_events enable row level security;
alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.chat_group_messages enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.activity_events enable row level security;
alter table public.user_privacy_settings enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.reports enable row level security;
alter table public.blocked_users enable row level security;
alter table public.post_drafts enable row level security;
alter table public.locations enable row level security;
alter table public.reviews enable row level security;
alter table public.watchlists enable row level security;

-- Profiles and feed.
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles
  for select to anon, authenticated using (true);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Posts are viewable by everyone" on public.posts;
drop policy if exists "Posts are visible by audience" on public.posts;
create policy "Posts are visible by audience" on public.posts
  for select to anon, authenticated using (
    coalesce(visibility, 'public') = 'public'
    or user_id = auth.uid()
    or (
      auth.uid() is not null
      and coalesce(visibility, 'public') = 'county'
      and county = (select p.county from public.profiles p where p.id = auth.uid())
    )
    or (
      auth.uid() is not null
      and coalesce(visibility, 'public') = 'constituency'
      and county = (select p.county from public.profiles p where p.id = auth.uid())
      and constituency = (select p.constituency from public.profiles p where p.id = auth.uid())
    )
  );
drop policy if exists "Authenticated users can create posts" on public.posts;
create policy "Authenticated users can create posts" on public.posts
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts" on public.posts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts" on public.posts
  for delete to authenticated using (auth.uid() = user_id);

-- Direct messages. Only conversation participants can read/delete rows;
-- recipients alone can mark rows as read.
drop policy if exists "Users can view their messages" on public.messages;
create policy "Users can view their messages" on public.messages
  for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Users can send messages" on public.messages;
create policy "Users can send messages" on public.messages
  for insert to authenticated with check (auth.uid() = sender_id and sender_id <> recipient_id);
drop policy if exists "Users can update their received messages" on public.messages;
create policy "Users can update their received messages" on public.messages
  for update to authenticated using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
drop policy if exists "Users can delete their messages" on public.messages;
drop policy if exists "Participants can delete conversation messages" on public.messages;
create policy "Participants can delete conversation messages" on public.messages
  for delete to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Message reactions inherit access from their parent message.
drop policy if exists "Users can view reactions on accessible messages" on public.message_reactions;
create policy "Users can view reactions on accessible messages" on public.message_reactions
  for select to authenticated using (
    exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
    )
  );
drop policy if exists "Users can add their own message reactions" on public.message_reactions;
create policy "Users can add their own message reactions" on public.message_reactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.id = message_reactions.message_id
        and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
    )
  );
drop policy if exists "Users can remove their own message reactions" on public.message_reactions;
create policy "Users can remove their own message reactions" on public.message_reactions
  for delete to authenticated using (user_id = auth.uid());

-- Group policies use security-definer helpers. They never query a table whose
-- own RLS policy is currently being evaluated, eliminating 42P17 recursion.
drop policy if exists "Users create groups" on public.chat_groups;
drop policy if exists "Members read groups" on public.chat_groups;
drop policy if exists "Owners update groups" on public.chat_groups;
drop policy if exists "Owners delete groups" on public.chat_groups;
create policy "Users create groups" on public.chat_groups
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Members read groups" on public.chat_groups
  for select to authenticated using (public.is_chat_group_member(id));
create policy "Owners update groups" on public.chat_groups
  for update to authenticated using (public.is_chat_group_owner(id)) with check (public.is_chat_group_owner(id));
create policy "Owners delete groups" on public.chat_groups
  for delete to authenticated using (public.is_chat_group_owner(id));

drop policy if exists "Users read group membership" on public.chat_group_members;
drop policy if exists "Group owners manage membership" on public.chat_group_members;
create policy "Users read group membership" on public.chat_group_members
  for select to authenticated using (user_id = auth.uid() or public.is_chat_group_owner(group_id));
create policy "Group owners manage membership" on public.chat_group_members
  for all to authenticated using (public.is_chat_group_owner(group_id)) with check (public.is_chat_group_owner(group_id));

drop policy if exists "Group members read messages" on public.chat_group_messages;
drop policy if exists "Group members send messages" on public.chat_group_messages;
create policy "Group members read messages" on public.chat_group_messages
  for select to authenticated using (public.is_chat_group_member(group_id));
create policy "Group members send messages" on public.chat_group_messages
  for insert to authenticated with check (
    sender_id = auth.uid() and public.is_chat_group_member(group_id)
  );

-- General social interactions.
drop policy if exists "Connections are viewable by everyone" on public.connections;
create policy "Connections are viewable by everyone" on public.connections
  for select to authenticated using (true);
drop policy if exists "Authenticated users can create connections" on public.connections;
create policy "Authenticated users can create connections" on public.connections
  for insert to authenticated with check (auth.uid() = follower_id);
drop policy if exists "Users can delete their own connections" on public.connections;
create policy "Users can delete their own connections" on public.connections
  for delete to authenticated using (auth.uid() = follower_id);

drop policy if exists "Likes are viewable by everyone" on public.likes;
create policy "Likes are viewable by everyone" on public.likes
  for select to authenticated using (true);
drop policy if exists "Authenticated users can create likes" on public.likes;
create policy "Authenticated users can create likes" on public.likes
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own likes" on public.likes;
create policy "Users can delete their own likes" on public.likes
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Comments are viewable by everyone" on public.comments;
create policy "Comments are viewable by everyone" on public.comments
  for select to authenticated using (true);
drop policy if exists "Authenticated users can create comments" on public.comments;
create policy "Authenticated users can create comments" on public.comments
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own comments" on public.comments;
create policy "Users can update their own comments" on public.comments
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own comments" on public.comments;
create policy "Users can delete their own comments" on public.comments
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Anyone can view reactions" on public.reactions;
create policy "Anyone can view reactions" on public.reactions
  for select to authenticated using (true);
drop policy if exists "Users can create reactions" on public.reactions;
create policy "Users can create reactions" on public.reactions
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can delete their reactions" on public.reactions;
create policy "Users can delete their reactions" on public.reactions
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Anyone can view shares" on public.shares;
create policy "Anyone can view shares" on public.shares
  for select to authenticated using (true);
drop policy if exists "Users can create shares" on public.shares;
create policy "Users can create shares" on public.shares
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can delete their shares" on public.shares;
create policy "Users can delete their shares" on public.shares
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can view friendships" on public.friendships;
create policy "Users can view friendships" on public.friendships
  for select to authenticated using (auth.uid() = requester_id or auth.uid() = recipient_id);
drop policy if exists "Users can create friend requests" on public.friendships;
create policy "Users can create friend requests" on public.friendships
  for insert to authenticated with check (auth.uid() = requester_id);
drop policy if exists "Users can update friend requests" on public.friendships;
create policy "Users can update friend requests" on public.friendships
  for update to authenticated
  using (auth.uid() = requester_id or auth.uid() = recipient_id)
  with check (auth.uid() = requester_id or auth.uid() = recipient_id);
drop policy if exists "Users can delete friendships" on public.friendships;
create policy "Users can delete friendships" on public.friendships
  for delete to authenticated using (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "Users can view their notifications" on public.notifications;
create policy "Users can view their notifications" on public.notifications
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "System can create notifications" on public.notifications;
create policy "System can create notifications" on public.notifications
  for insert to authenticated with check (auth.uid() = actor_id or auth.uid() = user_id);
drop policy if exists "Users can update their notifications" on public.notifications;
create policy "Users can update their notifications" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Anyone can view non-expired stories" on public.stories;
create policy "Anyone can view non-expired stories" on public.stories
  for select to authenticated using (expires_at > now() or auth.uid() = user_id);
drop policy if exists "Users can create stories" on public.stories;
create policy "Users can create stories" on public.stories
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their stories" on public.stories;
create policy "Users can update their stories" on public.stories
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their stories" on public.stories;
create policy "Users can delete their stories" on public.stories
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Anyone can view story views" on public.story_views;
create policy "Anyone can view story views" on public.story_views
  for select to authenticated using (true);
drop policy if exists "Users can track story views" on public.story_views;
create policy "Users can track story views" on public.story_views
  for insert to authenticated with check (auth.uid() = viewer_id);

drop policy if exists "Authenticated users can view story reactions" on public.story_reactions;
create policy "Authenticated users can view story reactions" on public.story_reactions
  for select to authenticated using (true);
drop policy if exists "Users can add their story reactions" on public.story_reactions;
create policy "Users can add their story reactions" on public.story_reactions
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their story reactions" on public.story_reactions;
create policy "Users can update their story reactions" on public.story_reactions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their story reactions" on public.story_reactions;
create policy "Users can delete their story reactions" on public.story_reactions
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can view story replies they sent or received" on public.story_replies;
create policy "Users can view story replies they sent or received" on public.story_replies
  for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Users can send story replies" on public.story_replies;
create policy "Users can send story replies" on public.story_replies
  for insert to authenticated with check (auth.uid() = sender_id);
drop policy if exists "Users can update received story replies" on public.story_replies;
create policy "Users can update received story replies" on public.story_replies
  for update to authenticated using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
drop policy if exists "Users can delete their sent story replies" on public.story_replies;
create policy "Users can delete their sent story replies" on public.story_replies
  for delete to authenticated using (auth.uid() = sender_id);

drop policy if exists "Anyone can view story highlights" on public.story_highlights;
create policy "Anyone can view story highlights" on public.story_highlights
  for select to authenticated using (true);
drop policy if exists "Users can create their own highlights" on public.story_highlights;
create policy "Users can create their own highlights" on public.story_highlights
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own highlights" on public.story_highlights;
create policy "Users can update their own highlights" on public.story_highlights
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own highlights" on public.story_highlights;
create policy "Users can delete their own highlights" on public.story_highlights
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Anyone can view highlight items" on public.story_highlight_items;
create policy "Anyone can view highlight items" on public.story_highlight_items
  for select to authenticated using (true);
drop policy if exists "Story owners can add to highlights" on public.story_highlight_items;
create policy "Story owners can add to highlights" on public.story_highlight_items
  for insert to authenticated with check (
    exists (
      select 1 from public.story_highlights h
      where h.id = story_highlight_items.highlight_id and h.user_id = auth.uid()
    )
    and exists (
      select 1 from public.stories s
      where s.id = story_highlight_items.story_id and s.user_id = auth.uid()
    )
  );
drop policy if exists "Story owners can remove from highlights" on public.story_highlight_items;
create policy "Story owners can remove from highlights" on public.story_highlight_items
  for delete to authenticated using (
    exists (
      select 1 from public.story_highlights h
      where h.id = story_highlight_items.highlight_id and h.user_id = auth.uid()
    )
  );

-- Dashboard-owned data.
drop policy if exists "Users can view own analytics" on public.user_analytics;
create policy "Users can view own analytics" on public.user_analytics
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "System can insert analytics" on public.user_analytics;
create policy "System can insert analytics" on public.user_analytics
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "System can update analytics" on public.user_analytics;
create policy "System can update analytics" on public.user_analytics
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can view own notifications" on public.user_notifications;
create policy "Users can view own notifications" on public.user_notifications
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "System can insert notifications" on public.user_notifications;
create policy "System can insert notifications" on public.user_notifications
  for insert to authenticated with check (auth.uid() = user_id or auth.uid() = actor_id);
drop policy if exists "Users can update own notifications" on public.user_notifications;
create policy "Users can update own notifications" on public.user_notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own notifications" on public.user_notifications;
create policy "Users can delete own notifications" on public.user_notifications
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can view own activity logs" on public.activity_logs;
create policy "Users can view own activity logs" on public.activity_logs
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "System can insert activity logs" on public.activity_logs;
create policy "System can insert activity logs" on public.activity_logs
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users read their notifications" on public.notification_events;
create policy "Users read their notifications" on public.notification_events
  for select to authenticated using (recipient_id = auth.uid());
drop policy if exists "Users update their notifications" on public.notification_events;
create policy "Users update their notifications" on public.notification_events
  for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

drop policy if exists "Users manage scheduled posts" on public.scheduled_posts;
create policy "Users manage scheduled posts" on public.scheduled_posts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users read visible activity" on public.activity_events;
create policy "Users read visible activity" on public.activity_events
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.user_privacy_settings p
      where p.user_id = activity_events.user_id and p.show_activity = true
    )
  );
drop policy if exists "Users manage own privacy" on public.user_privacy_settings;
create policy "Users manage own privacy" on public.user_privacy_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users create reports" on public.moderation_reports;
create policy "Users create reports" on public.moderation_reports
  for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "Users read own reports" on public.moderation_reports;
create policy "Users read own reports" on public.moderation_reports
  for select to authenticated using (reporter_id = auth.uid());

-- Trust and moderation.
drop policy if exists "Users can manage own blocks" on public.blocked_users;
drop policy if exists "Users can view own blocks" on public.blocked_users;
drop policy if exists "Users can read own blocks" on public.blocked_users;
drop policy if exists "Users can create own blocks" on public.blocked_users;
drop policy if exists "Users can delete own blocks" on public.blocked_users;
create policy "Users can read own blocks" on public.blocked_users
  for select to authenticated using (auth.uid() = blocker_id);
create policy "Users can create own blocks" on public.blocked_users
  for insert to authenticated with check (auth.uid() = blocker_id);
create policy "Users can delete own blocks" on public.blocked_users
  for delete to authenticated using (auth.uid() = blocker_id);

drop policy if exists "Users can create reports" on public.reports;
drop policy if exists "Users can view own reports" on public.reports;
drop policy if exists "Admins can view all reports" on public.reports;
create policy "Users can create reports" on public.reports
  for insert to authenticated with check (auth.uid() = reporter_id);
create policy "Users can view own reports" on public.reports
  for select to authenticated using (auth.uid() = reporter_id);
create policy "Admins can view all reports" on public.reports
  for select to authenticated using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.is_verified = true or p.username ilike '%admin%')
    )
  );

drop policy if exists "Users manage own drafts" on public.post_drafts;
create policy "Users manage own drafts" on public.post_drafts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public reference data and movie reviews.
drop policy if exists "Users can add watchlist items" on public.watchlists;
create policy "Users can add watchlist items" on public.watchlists
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can remove watchlist items" on public.watchlists;
create policy "Users can remove watchlist items" on public.watchlists
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Locations are viewable by everyone" on public.locations;
create policy "Locations are viewable by everyone" on public.locations
  for select to anon, authenticated using (true);
drop policy if exists "Anyone can read movie reviews" on public.reviews;
create policy "Anyone can read movie reviews" on public.reviews
  for select to anon, authenticated using (true);
drop policy if exists "Users can create their own movie reviews" on public.reviews;
create policy "Users can create their own movie reviews" on public.reviews
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own movie reviews" on public.reviews;
create policy "Users can update their own movie reviews" on public.reviews
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own movie reviews" on public.reviews;
create policy "Users can delete their own movie reviews" on public.reviews
  for delete to authenticated using (auth.uid() = user_id);

/* -------------------------------------------------------------------------- */
/* Public read access                                                        */
/* -------------------------------------------------------------------------- */

-- The product request is for anonymous read access across the public schema.
-- Writes remain protected by the table-specific policies above. This list is
-- explicit so a newly added private table does not accidentally become public.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'posts', 'connections', 'likes', 'comments', 'reactions',
    'shares', 'friendships', 'notifications', 'messages', 'stories',
    'story_views', 'story_replies', 'story_reactions', 'story_highlights',
    'story_highlight_items', 'message_reactions', 'user_analytics',
    'user_notifications', 'activity_logs', 'notification_events',
    'activity_events', 'user_privacy_settings', 'chat_groups',
    'chat_group_members', 'chat_group_messages', 'scheduled_posts',
    'moderation_reports', 'reports', 'blocked_users', 'post_drafts',
    'locations', 'reviews', 'watchlists'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'Public read access', table_name);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      'Public read access', table_name
    );
  end loop;
end
$$;

/* -------------------------------------------------------------------------- */
/* Consistent counters                                                       */
/* -------------------------------------------------------------------------- */

create or replace function public.update_post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create or replace function public.update_post_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set comments_count = comments_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create or replace function public.update_post_reaction_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set likes_count = likes_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create or replace function public.update_post_share_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts set shares_count = shares_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.posts set shares_count = greatest(shares_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create or replace function public.update_story_views_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.stories set views_count = views_count + 1 where id = new.story_id;
  elsif tg_op = 'DELETE' then
    update public.stories set views_count = greatest(views_count - 1, 0) where id = old.story_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trigger_update_likes_count on public.likes;
create trigger trigger_update_likes_count
after insert or delete on public.likes
for each row execute function public.update_post_likes_count();

drop trigger if exists trigger_update_comments_count on public.comments;
create trigger trigger_update_comments_count
after insert or delete on public.comments
for each row execute function public.update_post_comments_count();

drop trigger if exists trigger_update_reaction_count on public.reactions;
create trigger trigger_update_reaction_count
after insert or delete on public.reactions
for each row execute function public.update_post_reaction_count();

drop trigger if exists trigger_update_share_count on public.shares;
create trigger trigger_update_share_count
after insert or delete on public.shares
for each row execute function public.update_post_share_count();

drop trigger if exists trigger_update_story_views_count on public.story_views;
create trigger trigger_update_story_views_count
after insert or delete on public.story_views
for each row execute function public.update_story_views_count();

/* -------------------------------------------------------------------------- */
/* Storage and realtime                                                       */
/* -------------------------------------------------------------------------- */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images', 'post-images', true, 52428800,
  array['image/*', 'video/*']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-pictures', 'profile-pictures', true, 10485760,
  array['image/*']::text[]
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view post images" on storage.objects;
create policy "Public can view post images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'post-images');
drop policy if exists "Public can view profile pictures" on storage.objects;
create policy "Public can view profile pictures"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'profile-pictures');

drop policy if exists "Users can upload their own profile picture" on storage.objects;
create policy "Users can upload their own profile picture"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "Users can update their own profile picture" on storage.objects;
create policy "Users can update their own profile picture"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "Users can delete their own profile picture" on storage.objects;
create policy "Users can delete their own profile picture"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated users can upload post images" on storage.objects;
create policy "Authenticated users can upload post images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "Authenticated users can update post images" on storage.objects;
create policy "Authenticated users can update post images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "Authenticated users can delete post images" on storage.objects;
create policy "Authenticated users can delete post images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

insert into storage.buckets (id, name, public, file_size_limit)
values ('message-attachments', 'message-attachments', false, 26214400)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "Authenticated users can upload message attachments" on storage.objects;
create policy "Authenticated users can upload message attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Conversation participants can view message attachments" on storage.objects;
create policy "Conversation participants can view message attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and exists (
      select 1 from public.messages m
      where m.attachment_url = name
        and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
    )
  );

drop policy if exists "Users can delete their message attachments" on storage.objects;
create policy "Users can delete their message attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_group_messages'
    ) then
      execute 'alter publication supabase_realtime add table public.chat_group_messages';
    end if;
  end if;
end
$$;

comment on table public.messages is 'Direct messages; access is restricted to sender and recipient.';
comment on table public.post_drafts is 'One cross-device draft per user.';
comment on table public.blocked_users is 'User blocks used to filter feed and messaging.';
