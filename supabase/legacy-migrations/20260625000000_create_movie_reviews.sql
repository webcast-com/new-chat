create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movie_id integer not null,
  rating integer not null check (rating between 1 and 5),
  text text not null check (char_length(trim(text)) between 1 and 500),
  author_name text not null default 'Anonymous',
  created_at timestamptz not null default now()
);

create index if not exists reviews_movie_created_idx
  on public.reviews(movie_id, created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "Anyone can read movie reviews" on public.reviews;
create policy "Anyone can read movie reviews"
  on public.reviews for select
  using (true);

drop policy if exists "Users can create their own movie reviews" on public.reviews;
create policy "Users can create their own movie reviews"
  on public.reviews for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own movie reviews" on public.reviews;
create policy "Users can update their own movie reviews"
  on public.reviews for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own movie reviews" on public.reviews;
create policy "Users can delete their own movie reviews"
  on public.reviews for delete
  using (user_id = auth.uid());
