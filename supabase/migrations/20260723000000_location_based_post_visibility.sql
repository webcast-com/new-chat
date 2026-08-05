alter table public.profiles
  add column if not exists county text,
  add column if not exists constituency text;

alter table public.posts
  add column if not exists visibility text not null default 'public' check (visibility in ('public', 'county', 'constituency')),
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
      where location like '%, %'
        and (county is null or constituency is null)
    $sql$;
  end if;
end $$;

update public.posts
set visibility = 'public'
where visibility is null;

create index if not exists posts_visibility_location_created_idx
  on public.posts (visibility, county, constituency, created_at desc);

create index if not exists profiles_location_idx
  on public.profiles (county, constituency);

drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are visible by audience"
  on public.posts for select
  to anon, authenticated
  using (
    visibility = 'public'
    or user_id = auth.uid()
    or (
      auth.uid() is not null
      and visibility = 'county'
      and county = (select p.county from public.profiles p where p.id = auth.uid())
    )
    or (
      auth.uid() is not null
      and visibility = 'constituency'
      and county = (select p.county from public.profiles p where p.id = auth.uid())
      and constituency = (select p.constituency from public.profiles p where p.id = auth.uid())
    )
  );
