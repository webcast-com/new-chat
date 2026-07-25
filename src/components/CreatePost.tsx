import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
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
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [visibility, setVisibility] = useState<'public' | 'county' | 'constituency'>('public');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasCounty = Boolean(profile?.county);
  const hasConstituency = Boolean(profile?.county && profile?.constituency);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`${isVideo ? 'Video' : 'Image'} size must be less than ${isVideo ? '50MB' : '5MB'}`);
        return;
      }
      if (!file.type.startsWith('image/') && !isVideo) {
        alert('Please choose an image or video file');
        return;
      }

      setSelectedImage(file);
      setMediaType(isVideo ? 'video' : 'image');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile!.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !profile) return;

    setLoading(true);
    try {
      let imageUrl = '';

      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const post = {
        user_id: profile.id,
        content: content.trim(),
        image_url: imageUrl,
        media_type: mediaType,
        ...(visibility !== 'public' && {
          visibility,
          county: profile.county,
          constituency: visibility === 'constituency' ? profile.constituency : null,
        }),
      };

      const { error } = await supabase.from('posts').insert([post]);

      if (error) throw error;

      setContent('');
      setSelectedImage(null);
      setImagePreview(null);
      setMediaType('image');
      setVisibility('public');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onPostCreated();
    } catch (error: unknown) {
      const details = error && typeof error === 'object' ? error as { message?: string; details?: string; hint?: string } : null;
      const message = details?.message || (error instanceof Error ? error.message : String(error));
      const context = [details?.details, details?.hint].filter(Boolean).join(' ');
      console.error('Error creating post:', error);
      alert(`Error creating post: ${[message, context].filter(Boolean).join(' ')}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-lg">
              {profile?.username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex-1">
            <MentionInput
              value={content}
              onChange={setContent}
              placeholder="What's on your mind?"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 resize-none"
            />

            {imagePreview && (
              <div className="mt-4 relative">
                {mediaType === 'video' ? (
                  <video src={imagePreview} controls className="w-full rounded-xl max-h-96" />
                ) : (
                  <img src={imagePreview} alt="Preview" className="w-full rounded-xl max-h-96 object-cover" />
                )}
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-slate-900 bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-90 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer"
                >
                  <ImageIcon className="w-5 h-5" />
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
                disabled={loading || !content.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Posting...' : 'Post'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
