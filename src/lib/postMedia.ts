import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export const POST_MEDIA_BUCKET = 'post-images';
export const MAX_POST_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_POST_VIDEO_SIZE = 50 * 1024 * 1024;
export const MAX_POSTER_IMAGE_SIZE = 1.5 * 1024 * 1024;

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

/** Upload a file to storage with real progress reporting (XHR-based). */
async function uploadFileToStorage(
  path: string,
  file: File | Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
) {
  if (!onProgress) {
    const { error } = await supabase.storage
      .from(POST_MEDIA_BUCKET)
      .upload(path, file, { cacheControl: '3600', contentType, upsert: false });
    if (error) throw error;
    return;
  }

  // The storage SDK (storage-js v2) has no progress callback, so replicate its
  // POST /storage/v1/object/{bucket}/{path} request with XMLHttpRequest, which
  // exposes upload.onprogress.
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || SUPABASE_ANON_KEY;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${POST_MEDIA_BUCKET}/${path}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('x-upsert', 'false');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      let message = `Upload failed (${xhr.status})`;
      try {
        const parsed = JSON.parse(xhr.responseText) as { message?: string };
        if (parsed?.message) message = parsed.message;
      } catch { /* keep default message */ }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out.'));

    const form = new FormData();
    form.append('cacheControl', '3600');
    form.append('', file, file instanceof File ? file.name : 'upload');
    xhr.send(form);
  });
}

function makeFileId() {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function uploadPostMedia(
  file: File,
  userId: string,
  limits: PostMediaLimits = {},
  onProgress?: (percent: number) => void,
): Promise<UploadedPostMedia> {
  const mediaType = getPostMediaType(file);
  if (!mediaType) {
    throw new Error('This media format is not supported.');
  }

  const validationError = validatePostMedia(file, limits);
  if (validationError) throw new Error(validationError);

  const extension = getExtension(file) || (mediaType === 'video' ? 'mp4' : 'jpg');
  const path = `${userId}/${makeFileId()}.${extension}`;
  const contentType = inferMimeType(file, mediaType);

  await uploadFileToStorage(path, file, contentType, onProgress);

  const { data } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl, mediaType };
}

export async function removePostMedia(path: string) {
  if (!path) return;
  const { error } = await supabase.storage.from(POST_MEDIA_BUCKET).remove([path]);
  if (error) console.warn('Unable to clean up uploaded post media:', error);
}

// ─── Phase 1: image compression & video poster frames ───────────────────────

/**
 * Downscale + re-encode a photo in the browser so uploads stay fast and light.
 * Returns the original file untouched for GIFs, tiny files, or any failure
 * (callers should always treat the result as the file to upload).
 */
export async function compressImage(
  file: File,
  options: { maxDimension?: number; maxBytes?: number } = {},
): Promise<File> {
  const maxDimension = options.maxDimension ?? 1600;
  const maxBytes = options.maxBytes ?? MAX_POSTER_IMAGE_SIZE;

  if (file.type === 'image/gif' || file.size <= maxBytes) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= maxBytes) {
        return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
      }
    }
    // Even the most compressed pass exceeds the cap — accept it rather than
    // failing the upload (still dramatically smaller than the original).
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.55));
    if (blob) return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
    return file;
  } catch {
    return file;
  }
}

/**
 * Capture a poster frame (~1s in) from a video file, fully client-side.
 * Returns a JPEG blob, or null when the video cannot be decoded.
 */
export async function captureVideoPoster(file: File, seekTime = 1): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto'; // need decoded frames for the poster

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error('Unable to read video')); };
      const cleanup = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
      };
      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
      video.load();
    });

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const target = Math.min(seekTime, Math.max(0, duration - 0.1));
    if (target > 0) {
      await new Promise<void>((resolve) => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = target;
      });
    }

    // 'loadedmetadata' fires before the first frame is decoded — wait until a
    // frame is actually available so drawImage doesn't capture a black canvas.
    if (video.readyState < 2) {
      await new Promise<void>((resolve) => {
        const onData = () => { cleanup(); resolve(); };
        const cleanup = () => video.removeEventListener('loadeddata', onData);
        video.addEventListener('loadeddata', onData);
        window.setTimeout(() => { cleanup(); resolve(); }, 3000);
      });
    }

    const sourceWidth = video.videoWidth || 1;
    const sourceHeight = video.videoHeight || 1;
    const scale = Math.min(1, 1280 / sourceWidth);
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Capture a poster frame from a video and upload it to storage.
 * Returns null (no error) when the frame can't be captured — the video post
 * is still valid, it just has no poster.
 */
export async function uploadVideoPoster(
  videoFile: File,
  userId: string,
  onProgress?: (percent: number) => void,
): Promise<{ path: string; publicUrl: string } | null> {
  const blob = await captureVideoPoster(videoFile);
  if (!blob) return null;

  const path = `${userId}/poster-${makeFileId()}.jpg`;
  const posterFile = new File([blob], 'poster.jpg', { type: 'image/jpeg' });
  await uploadFileToStorage(path, posterFile, 'image/jpeg', onProgress);

  const { data } = supabase.storage.from(POST_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
