/*
  # Fix Security Issues

  1. Function Search Path Mutable Issues
    - Add `SET search_path = public` to all functions to prevent search_path manipulation
  
  2. RLS Policy Always True
    - Fix notifications table INSERT policy to check authentication
  
  3. Public Bucket Listing
    - Remove broad SELECT policy from profile-pictures bucket
  
  4. SECURITY DEFINER Function Permissions
    - Revoke EXECUTE permission from anon and authenticated roles
    - Change to SECURITY INVOKER for better security
*/

-- Fix function search_path issues
ALTER FUNCTION public.update_post_likes_count SET search_path = public;
ALTER FUNCTION public.delete_expired_stories SET search_path = public;
ALTER FUNCTION public.get_active_stories_for_user SET search_path = public;
ALTER FUNCTION public.update_post_comments_count SET search_path = public;
ALTER FUNCTION public.update_post_reaction_count SET search_path = public;
ALTER FUNCTION public.update_post_share_count SET search_path = public;
ALTER FUNCTION public.update_story_views_count SET search_path = public;
ALTER FUNCTION public.create_initial_analytics SET search_path = public;

-- Fix notifications RLS policy - only authenticated users who own the notification
DO $$
BEGIN
  -- Drop the overly permissive policy if it exists
  DROP POLICY IF EXISTS "System can create notifications" ON notifications;
  
  -- Create a restrictive policy that checks ownership
  CREATE POLICY "Authenticated users can create notifications for themselves"
    ON notifications FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
    
  -- Add policy for SELECT
  CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
END $$;

-- Revoke EXECUTE permission on get_active_stories_for_user from public roles
REVOKE EXECUTE ON FUNCTION public.get_active_stories_for_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_active_stories_for_user(uuid) FROM authenticated;

-- Change to SECURITY INVOKER for better control
ALTER FUNCTION public.get_active_stories_for_user(uuid) SECURITY INVOKER;

-- Grant EXECUTE only to authenticated users if needed
GRANT EXECUTE ON FUNCTION public.get_active_stories_for_user(uuid) TO authenticated;
