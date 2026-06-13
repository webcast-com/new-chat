-- Fix Security Issues
-- 1. Function search_path mutability
-- 2. RLS Policy Always True on notifications
-- 3. Public Bucket Allows Listing
-- 4. SECURITY DEFINER Function Execution Permissions

-- ============================================================================
-- Fix 1: Set immutable search_path for all functions
-- ============================================================================
ALTER FUNCTION public.update_post_reaction_count() SET search_path = '';
ALTER FUNCTION public.update_post_share_count() SET search_path = '';
ALTER FUNCTION public.update_story_views_count() SET search_path = '';
ALTER FUNCTION public.delete_expired_stories() SET search_path = '';
ALTER FUNCTION public.get_active_stories_for_user(uuid) SET search_path = '';
ALTER FUNCTION public.create_initial_analytics() SET search_path = '';
ALTER FUNCTION public.update_post_likes_count() SET search_path = '';
ALTER FUNCTION public.update_post_comments_count() SET search_path = '';

-- ============================================================================
-- Fix 2: RLS Policy Always True on notifications
-- The "System can create notifications" policy has WITH CHECK (true) which allows unrestricted inserts
-- Replace with a policy that checks the user_id matches the authenticated user
-- ============================================================================
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Users can create own notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Fix 3: Public Bucket Allows Listing
-- The current policies allow SELECT on bucket_id which enables listing all files
-- For public buckets, we need to allow access but prevent listing
-- 
-- Note: In Supabase storage, to prevent listing while allowing public access:
-- - Keep the SELECT policy but understand it allows listing
-- - OR use signed URLs for controlled access
-- - For truly public files, the current policy is acceptable if files have non-guessable names
-- 
-- The warning is about whether clients can list ALL files in the bucket
-- If file paths are user-generated content, this could be a privacy issue
-- If file paths are non-guessable UUIDs, the risk is lower
-- 
-- We'll keep the policies as-is since the buckets are meant to be public,
-- but document the trade-off
-- ============================================================================

-- The existing policies are intentionally permissive for public access
-- If you need to prevent listing, consider:
-- 1. Using signed URLs instead of public buckets
-- 2. Implementing a backend service that generates specific object paths
-- 3. Using non-guessable file names (UUIDs)

-- ============================================================================
-- Fix 4: SECURITY DEFINER Function Execution Permissions
-- get_active_stories_for_user is SECURITY DEFINER and executable by public
-- Revoke from anon/public and only allow authenticated users
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.get_active_stories_for_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_active_stories_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_stories_for_user(uuid) TO authenticated;

-- ============================================================================
-- Fix 5: Leaked Password Protection
-- Note: This is configured in Supabase Dashboard > Authentication > Policies
-- Enable "Enable leaked password protection" in the dashboard
-- This cannot be set via SQL
-- ============================================================================

-- Add documentation comment
COMMENT ON SCHEMA public IS 'Security fixes applied: 
- search_path locked for all functions
- RLS policies tightened on notifications
- SECURITY DEFINER function access restricted to authenticated users
- Note: Enable leaked password protection in Supabase Dashboard > Authentication > Policies';
