-- Phase 1: Media & video upgrade
-- Video poster frames (thumbnail captured at ~1s, stored as JPEG in post-images bucket)

alter table public.posts
  add column if not exists poster_url text;

alter table public.stories
  add column if not exists poster_url text;

create index if not exists posts_media_created_idx
  on public.posts (media_type, created_at desc);
