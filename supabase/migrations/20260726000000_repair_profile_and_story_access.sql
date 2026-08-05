alter table public.profiles
  add column if not exists county text,
  add column if not exists constituency text;

alter table public.posts
  add column if not exists visibility text not null default 'public',
  add column if not exists county text,
  add column if not exists constituency text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'location'
  ) then
    execute $sql$
      update public.profiles
      set
        county = split_part(location, ', ', 2),
        constituency = split_part(location, ', ', 1)
      where location like '%,%'
        and (county is null or constituency is null)
    $sql$;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can upload post images" on storage.objects;
create policy "Authenticated users can upload post images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated users can update post images" on storage.objects;
create policy "Authenticated users can update post images"
  on storage.objects for update
  to authenticated
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
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

alter table public.stories enable row level security;
drop policy if exists "Users can create stories" on public.stories;
create policy "Users can create stories"
  on public.stories for insert
  to authenticated
  with check (auth.uid() = user_id);
