-- Phase 3: In-app sharing (repost to feed, share to DM, share to group)

-- Feed re-shares: a post row with shared_post_id is a quote/repost of another post
alter table public.posts
  add column if not exists shared_post_id uuid references public.posts(id) on delete cascade;
create index if not exists posts_shared_post_idx on public.posts (shared_post_id);

-- DMs: a message can carry a shared post card
alter table public.messages
  add column if not exists shared_post_id uuid references public.posts(id) on delete cascade;
create index if not exists messages_shared_post_idx on public.messages (shared_post_id);

-- Group messages: same
alter table public.chat_group_messages
  add column if not exists shared_post_id uuid references public.posts(id) on delete cascade;
create index if not exists chat_group_messages_shared_post_idx on public.chat_group_messages (shared_post_id);

-- Shares now record where the share went
alter table public.shares
  add column if not exists target_type text not null default 'external'
    check (target_type in ('feed', 'dm', 'group', 'external')),
  add column if not exists target_id uuid;
