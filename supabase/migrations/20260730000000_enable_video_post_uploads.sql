-- Allow the post media bucket to store the same video formats accepted by the client.
-- The bucket is intentionally public because post URLs are rendered in the community feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  52428800,
  array['image/*', 'video/*']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
