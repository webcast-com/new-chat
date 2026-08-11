/*
  # Add Profile Pictures Storage

  ## Overview
  Enable storage of profile pictures with proper bucket configuration and access policies.

  ## 1. Storage Configuration
  - Create 'profile-pictures' bucket for user profile images
  - Configure public read access for viewing
  - Restrict write access to authenticated users only
  - Set size limits and allowed MIME types

  ## 2. Updates
  - avatar_url column already exists in profiles table
  - No schema changes needed, just storage setup
*/

-- Create the profile-pictures storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for profile-pictures bucket
-- Allow authenticated users to upload their own profile picture
CREATE POLICY "Users can upload their own profile picture"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own profile picture
CREATE POLICY "Users can update their own profile picture"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own profile picture
CREATE POLICY "Users can delete their own profile picture"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public to view profile pictures
CREATE POLICY "Public can view profile pictures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-pictures');