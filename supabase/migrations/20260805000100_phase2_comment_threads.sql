-- Phase 2: Comment threads (real nested replies)

alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;

create index if not exists comments_post_parent_idx
  on public.comments (post_id, parent_id);

-- Replies count toward the cached post comment count (existing trigger handles
-- insert/delete on comments; this keeps the summary function consistent for
-- tree-aware counts if it ever needs one).
create or replace function public.count_comment_replies(comment_id uuid)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer from public.comments where parent_id = comment_id;
$$;
