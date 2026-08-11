-- Automatically create a profile row when a new auth user is created.
-- This prevents the "Profile unavailable" screen when email confirmation is
-- disabled or when client-side profile creation races with onAuthStateChange.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _username text;
begin
  _username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1),
    'user'
  );

  insert into public.profiles (id, username, full_name, bio, avatar_url)
  values (new.id, _username, '', '', '')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
