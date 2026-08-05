-- Phase 6: GPS / location v2 (opt-in coordinates + near-me posts)

-- ── Profiles: opt-in GPS coordinates ────────────────────────────────────────
alter table public.profiles
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists location_updated_at timestamptz;

create index if not exists profiles_location_idx on public.profiles (lat, lng);

-- ── Posts: "near me" visibility (25 km radius) ─────────────────────────────
alter table public.posts
  add column if not exists near_me boolean not null default false,
  add column if not exists post_lat double precision,
  add column if not exists post_lng double precision;

create index if not exists posts_near_me_idx on public.posts (near_me, created_at desc);
