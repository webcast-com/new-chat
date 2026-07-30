import { supabase } from './supabase';

export const POST_MEDIA_BUCKET = 'post-images';
export const MAX_POST_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_POST_VIDEO_SIZE = 50 * 1024 * 1024;

export type PostMediaType = 'image' | 'video';

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'ogg']);

function getExtension(file: File) {
  return file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
}

function inferMimeType(file: File, mediaType: PostMediaType) {
  if (file.type && file.type !== 'application/octet-stream') return file.type;

  const extension = getExtension(file);
  if (mediaType === 'video') {
    return extension === 'mov' ? 'video/quicktime' : `video/${extension || 'mp4'}`;
  }

  return extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension || 'jpeg'}`;
}

/** Return the media kind only for formats that browsers can preview reliably. */
export function getPostMediaType(file: File): PostMediaType | null {
  const mimeType = file.type.toLowerCase();
  const extension = getExtension(file);
  const mimeTypeIsGeneric = !mimeType || mimeType === 'application/octet-stream';

  if (IMAGE_MIME_TYPES.has(mimeType) || (mimeTypeIsGeneric && IMAGE_EXTENSIONS.has(extension))) {
    return 'image';
  }

  if (VIDEO_MIME_TYPES.has(mimeType) || (mimeTypeIsGeneric && VIDEO_EXTENSIONS.has(extension))) {
    return 'video';
  }

  return null;
}

export function validatePostMedia(file: File, limits: PostMediaLimits = {}): string | null {
  const mediaType = getPostMediaType(file);
  if (!mediaType) {
    return 'Please choose a JPEG, PNG, GIF, WebP, MP4, WebM, MOV, or OGG file.';
  }

  const maxSize = mediaType === 'video'
    ? (limits.maxVideoSize ?? MAX_POST_VIDEO_SIZE)
    : (limits.maxImageSize ?? MAX_POST_IMAGE_SIZE);
  if (file.size > maxSize) {
    const maxSizeInMb = maxSize / (1024 * 1024);
    const maxSizeLabel = Number.isInteger(maxSizeInMb) ? `${maxSizeInMb}MB` : `${maxSizeInMb.toFixed(1)}MB`;
    return `${mediaType === 'video' ? 'Video' : 'Image'} size must be less than ${maxSizeLabel}.`;
  }

  return null;
}

export interface PostMediaLimits {
  maxImageSize?: number;
  maxVideoSize?: number;
}

export interface UploadedPostMedia {
  path: string;
  publicUrl: string;
  mediaType: PostMediaType;
}

export async function uploadPostMedia(
  file: File,
  userId: string,
  limits: PostMediaLimits = {},
): Promise<UploadedPostMedia> {
  const mediaType = getPostMediaType(file);
  if (!mediaType) {
    throw new Error('This media format is not supported.');
  }

  const validationError = validatePostMedia(file, limits);
  if (validationError) throw new Error(validationError);

  const extension = getExtension(file) || (mediaType === 'video' ? 'mp4' : 'jpg');
  const fileId = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/${fileId}.${extension}`;
  const contentType = inferMimeType(file, mediaType);

  const { error: uploadError } = await supabase.storage
    .from(POST_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl, mediaType };
}

export async function removePostMedia(path: string) {
  if (!path) return;
  const { error } = await supabase.storage.from(POST_MEDIA_BUCKET).remove([path]);
  if (error) console.warn('Unable to clean up uploaded post media:', error);
}
