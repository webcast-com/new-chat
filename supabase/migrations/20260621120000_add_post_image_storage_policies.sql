-- Configure the public bucket used for post and story media.
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can update post images" ON storage.objects;
CREATE POLICY "Authenticated users can update post images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'post-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'post-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Authenticated users can delete post images" ON storage.objects;
CREATE POLICY "Authenticated users can delete post images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'post-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
