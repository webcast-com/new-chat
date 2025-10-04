import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Send, Image } from 'lucide-react';

interface CreatePostProps {
  onPostCreated: () => void;
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const { profile } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !profile) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('posts').insert([
        {
          user_id: profile.id,
          content: content.trim(),
          image_url: '',
        },
      ]);

      if (error) throw error;

      setContent('');
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
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
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
              rows={3}
            />
            <div className="flex justify-between items-center mt-4">
              <button
                type="button"
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
              >
                <Image className="w-5 h-5" />
                <span className="text-sm font-medium">Photo</span>
              </button>
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                <Send className="w-4 h-4" />
                <span>Post</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
