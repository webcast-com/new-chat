import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Comment } from '../lib/supabase';
import { Send } from 'lucide-react';
import LazyImage from './LazyImage';

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  onCommentAdded: () => void;
}

export default function CommentSection({ postId, comments, onCommentAdded }: CommentSectionProps) {
  const { profile } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !profile) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('comments').insert([
        {
          post_id: postId,
          user_id: profile.id,
          content: newComment.trim(),
        },
      ]);

      if (error) throw error;

      setNewComment('');
      onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-slate-50 border-t border-slate-200">
      <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                {comment.profiles?.avatar_url ? (
                  <LazyImage
                    src={comment.profiles.avatar_url}
                    alt={comment.profiles.username}
                    className="w-8 h-8"
                  />
                ) : (
                  <span>{comment.profiles?.username.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <div className="flex-1 bg-white rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-slate-900 text-sm">
                  {comment.profiles?.username}
                </span>
                <span className="text-xs text-slate-500">{formatDate(comment.created_at)}</span>
              </div>
              <p className="text-slate-700 text-sm">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 border-t border-slate-200">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
              {profile?.avatar_url ? (
                <LazyImage
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-8 h-8"
                />
              ) : (
                <span>{profile?.username.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
            />
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
