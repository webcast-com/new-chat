-- Phase 6 Migration
-- Admin actions infrastructure (Phase 5.7 completion) + Web Push delivery tracking
--
-- 1. is_admin flag on user_profiles + admin helper function
-- 2. Admin SELECT/UPDATE policies across admin-facing tables
-- 3. push_subscriptions delivery tracking columns
-- 4. Ban/suspend support (account_status already supports 'suspended')

-- ============================================================================
-- 1. is_admin flag
-- ============================================================================
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='user_profiles' and column_name='is_admin') then
    alter table public.user_profiles add column is_admin boolean not null default false;
  end if;
end $$;

-- ============================================================================
-- 2. Admin helper (security definer so RLS never blocks the check)
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.user_profiles where user_id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ============================================================================
-- 3. Admin read policies (dashboard reads across users)
-- ============================================================================
drop policy if exists "Admins read all contact messages" on public.contact_messages;
create policy "Admins read all contact messages"
  on public.contact_messages for select
  using (public.is_admin());

drop policy if exists "Admins update contact messages" on public.contact_messages;
create policy "Admins update contact messages"
  on public.contact_messages for update
  using (public.is_admin());

drop policy if exists "Admins read all payment logs" on public.payment_logs;
create policy "Admins read all payment logs"
  on public.payment_logs for select
  using (public.is_admin());

drop policy if exists "Admins update payment logs" on public.payment_logs;
create policy "Admins update payment logs"
  on public.payment_logs for update
  using (public.is_admin());

drop policy if exists "Admins read all activity" on public.user_activity;
create policy "Admins read all activity"
  on public.user_activity for select
  using (public.is_admin());

drop policy if exists "Admins read all profiles" on public.user_profiles;
create policy "Admins read all profiles"
  on public.user_profiles for select
  using (public.is_admin());

drop policy if exists "Admins update all profiles" on public.user_profiles;
create policy "Admins update all profiles"
  on public.user_profiles for update
  using (public.is_admin());

drop policy if exists "Admins read all plans" on public.user_plans;
create policy "Admins read all plans"
  on public.user_plans for select
  using (public.is_admin());

drop policy if exists "Admins read all favorites" on public.favorites;
create policy "Admins read all favorites"
  on public.favorites for select
  using (public.is_admin());

-- ============================================================================
-- 4. push_subscriptions delivery tracking
-- ============================================================================
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='push_subscriptions' and column_name='last_sent_at') then
    alter table public.push_subscriptions add column last_sent_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='push_subscriptions' and column_name='failure_count') then
    alter table public.push_subscriptions add column failure_count integer not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='push_subscriptions' and column_name='last_error') then
    alter table public.push_subscriptions add column last_error text;
  end if;
end $$;

-- Deactivate subscriptions that keep failing (edge function marks them)
drop policy if exists "Admins manage push subscriptions" on public.push_subscriptions;
create policy "Admins manage push subscriptions"
  on public.push_subscriptions for update
  using (public.is_admin());
