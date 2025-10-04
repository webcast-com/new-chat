import { useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { Post, Comment } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import CommentSection from './CommentSection';

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { profile } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingLike, setLoadingLike] = useState(false);

  const checkIfLiked = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', profile.id)
      .maybeSingle();

    setIsLiked(!!data);
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (data) setComments(data);
  };

  const handleLike = async () => {
    if (!profile || loadingLike) return;

    setLoadingLike(true);
    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', profile.id);
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await supabase
          .from('likes')
          .insert([{ post_id: post.id, user_id: profile.id }]);
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoadingLike(false);
    }
  };

  const handleCommentClick = () => {
    if (!showComments) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  useState(() => {
    checkIfLiked();
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-lg">
              {post.profiles?.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{post.profiles?.username}</h3>
              <p className="text-sm text-slate-500">{formatDate(post.created_at)}</p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-800 text-base leading-relaxed whitespace-pre-wrap mb-4">
          {post.content}
        </p>

        {post.image_url && (
          <div className="mb-4">
            <img
              src={post.image_url}
              alt="Post content"
              className="w-full rounded-xl object-cover max-h-[500px]"
            />
          </div>
        )}

        <div className="flex items-center gap-6 pt-4 border-t border-slate-100">
          <button
            onClick={handleLike}
            disabled={loadingLike}
            className={`flex items-center gap-2 transition-all ${
              isLiked
                ? 'text-red-500'
                : 'text-slate-600 hover:text-red-500'
            } disabled:opacity-50`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">{likesCount}</span>
          </button>

          <button
            onClick={handleCommentClick}
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{post.comments_count}</span>
          </button>
        </div>
      </div>

      {showComments && (
        <CommentSection
          postId={post.id}
          comments={comments}
          onCommentAdded={() => {
            loadComments();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
