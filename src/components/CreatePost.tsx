import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getPostMediaType, removePostMedia, uploadPostMedia, validatePostMedia, type PostMediaType } from '../lib/postMedia';
import { Send, Image as ImageIcon, X } from 'lucide-react';
import MentionInput from './MentionInput';

interface CreatePostProps {
  onPostCreated: () => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<PostMediaType>('image');
  const [mediaError, setMediaError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'county' | 'constituency'>('public');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const hasCounty = Boolean(profile?.county);
  const hasConstituency = Boolean(profile?.county && profile?.constituency);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const releasePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validatePostMedia(file);
    if (validationError) {
      setMediaError(validationError);
      e.currentTarget.value = '';
      return;
    }

    const nextMediaType = getPostMediaType(file);
    if (!nextMediaType) return;

    releasePreview();
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setSelectedImage(file);
    setMediaType(nextMediaType);
    setImagePreview(previewUrl);
    setMediaError('');
    setSubmitError('');
  };

  const removeImage = () => {
    releasePreview();
    setSelectedImage(null);
    setImagePreview(null);
    setMediaType('image');
    setMediaError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetComposer = () => {
    releasePreview();
    setContent('');
    setSelectedImage(null);
    setImagePreview(null);
    setMediaType('image');
    setVisibility('public');
    setMediaError('');
    setSubmitError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // A caption is optional when a photo or video is attached.
    if ((!content.trim() && !selectedImage) || !profile || loading) return;

    setLoading(true);
    setSubmitError('');
    let uploadedPath = '';

    try {
      let imageUrl = '';
      let uploadedMediaType: PostMediaType | undefined;

      if (selectedImage) {
        const uploaded = await uploadPostMedia(selectedImage, profile.id);
        imageUrl = uploaded.publicUrl;
        uploadedPath = uploaded.path;
        uploadedMediaType = uploaded.mediaType;
      }

      const post = {
        user_id: profile.id,
        content: content.trim(),
        image_url: imageUrl,
        ...(uploadedMediaType ? { media_type: uploadedMediaType } : {}),
        ...(visibility !== 'public' && {
          visibility,
          county: profile.county,
          constituency: visibility === 'constituency' ? profile.constituency : null,
        }),
      };

      const { error } = await supabase.from('posts').insert([post]);
      if (error) throw error;

      resetComposer();
      onPostCreated();
    } catch (error: unknown) {
      // Do not leave an orphaned video in storage if the post insert fails.
      if (uploadedPath) await removePostMedia(uploadedPath);

      const details = error && typeof error === 'object' ? error as { message?: string; details?: string; hint?: string } : null;
      const message = details?.message || (error instanceof Error ? error.message : String(error));
      const context = [details?.details, details?.hint].filter(Boolean).join(' ');
      const fullMessage = [message, context].filter(Boolean).join(' ');
      console.error('Error creating post:', error);
      setSubmitError(`Unable to create post: ${fullMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-lg font-semibold text-white">
              {profile?.username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex-1">
            <MentionInput
              value={content}
              onChange={setContent}
              placeholder="What's on your mind?"
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />

            {(mediaError || submitError) && (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {mediaError || submitError}
              </p>
            )}

            {imagePreview && (
              <div className="relative mt-4">
                {mediaType === 'video' ? (
                  <video
                    src={imagePreview}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-96 w-full rounded-xl bg-slate-950"
                  />
                ) : (
                  <img src={imagePreview} alt="Post preview" className="max-h-96 w-full rounded-xl object-cover" />
                )}
                <button
                  type="button"
                  onClick={removeImage}
                  aria-label="Remove attached media"
                  className="absolute right-2 top-2 rounded-full bg-slate-900 bg-opacity-70 p-2 text-white transition-all hover:bg-opacity-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/ogg"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Photo or video</span>
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                Audience
                <select
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as typeof visibility)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="public">Everyone</option>
                  <option value="county" disabled={!hasCounty}>My county{hasCounty ? '' : ' (set your location first)'}</option>
                  <option value="constituency" disabled={!hasConstituency}>My constituency{hasConstituency ? '' : ' (set your location first)'}</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={loading || (!content.trim() && !selectedImage)}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-2 font-medium text-white shadow-md transition-all hover:from-blue-600 hover:to-cyan-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{loading ? 'Uploading...' : 'Post'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
