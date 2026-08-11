/*
# Fix SECURITY DEFINER on get_active_stories_for_user

## Overview
The function `public.get_active_stories_for_user` is currently `SECURITY DEFINER`, meaning it executes with the privileges of the function owner rather than the calling user. This bypasses Row Level Security (RLS) on the `stories` and `profiles` tables.

## Changes
- Change `get_active_stories_for_user` from `SECURITY DEFINER` to `SECURITY INVOKER`
- This ensures the function respects RLS policies and only returns data the authenticated user is allowed to see
- Keep EXECUTE grant for authenticated users since they need to view stories
*/

-- Change to SECURITY INVOKER so RLS policies are respected
ALTER FUNCTION public.get_active_stories_for_user(uuid) SECURITY INVOKER;

-- Ensure authenticated users can still execute the function
GRANT EXECUTE ON FUNCTION public.get_active_stories_for_user(uuid) TO authenticated;
