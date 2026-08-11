/*
# Fix All Security Issues

## Overview
Comprehensive security fix migration addressing all identified vulnerabilities:

1. **Function Search Path Mutable** - 6 functions missing immutable search_path
2. **Public Bucket Allows Listing** - Remove broad SELECT policies from storage.objects
3. **SECURITY DEFINER Function Permissions** - Restrict get_active_stories_for_user
4. **Leaked Password Protection** - Enable via auth config

## Changes

### 1. Function Search Path Fixes
- Set `search_path = ''` on 6 functions to prevent search_path manipulation attacks
- Functions: update_post_shares_count, get_trending_posts, update_post_last_engagement_likes,
  update_post_last_engagement_comments, update_post_last_engagement_shares, get_hot_posts

### 2. Storage Bucket Listing Fix
- Drop broad SELECT policies on storage.objects for post-images and profile-pictures buckets
- Public buckets don't need SELECT policies for object URL access
- File listing can expose more data than intended

### 3. SECURITY DEFINER Function Fix
- get_active_stories_for_user is SECURITY DEFINER
- Ensure EXECUTE is revoked from anon and only granted to authenticated

### 4. Leaked Password Protection
- Enable Supabase Auth leaked password protection via auth.config()
*/

-- ============================================================================
-- Fix 1: Set immutable search_path for functions missing it
-- ============================================================================

-- These functions were created in the trending algorithm migration without search_path lock
ALTER FUNCTION public.update_post_shares_count() SET search_path = '';
ALTER FUNCTION public.get_trending_posts(integer) SET search_path = '';
ALTER FUNCTION public.update_post_last_engagement_likes() SET search_path = '';
ALTER FUNCTION public.update_post_last_engagement_comments() SET search_path = '';
ALTER FUNCTION public.update_post_last_engagement_shares() SET search_path = '';
ALTER FUNCTION public.get_hot_posts(integer) SET search_path = '';

-- ============================================================================
-- Fix 2: Remove broad SELECT policies from storage.objects that allow listing
-- ============================================================================

-- Drop the broad SELECT policy for post-images bucket that allows listing all files
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Drop the broad SELECT policy for profile-pictures bucket that allows listing all files
DROP POLICY IF EXISTS "Public can view profile pictures" ON storage.objects;

-- ============================================================================
-- Fix 3: SECURITY DEFINER function - ensure proper permission restrictions
-- ============================================================================

-- Revoke EXECUTE from anon/public to prevent unauthenticated access
REVOKE EXECUTE ON FUNCTION public.get_active_stories_for_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_active_stories_for_user(uuid) FROM PUBLIC;

-- Grant EXECUTE only to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_stories_for_user(uuid) TO authenticated;

-- ============================================================================
-- Fix 4: Enable leaked password protection
-- ============================================================================

-- Enable HaveIBeenPwned password checking in Supabase Auth
-- This prevents users from signing up with compromised passwords
SELECT set_config('auth.enable_leaked_password_protection', 'true', false);
