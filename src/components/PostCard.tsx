import { useState, useRef } from 'react';
import { MessageCircle, MoreHorizontal, CreditCard as Edit2, Trash2, X, Check } from 'lucide-react';
import { Post, Comment } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import CommentSection from './CommentSection';
import ReactionButton from './ReactionButton';
import ShareButton from './ShareButton';
import Image from './Image';
import MentionInput, { renderMentions } from './MentionInput';

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { profile } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(post.image_url || null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [reactionStats, setReactionStats] = useState<{[key: string]: number}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnPost = profile?.id === post.user_id;

  const loadReactions = async () => {
    const { data } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('post_id', post.id);

    if (data) {
      const stats: {[key: string]: number} = {};
      data.forEach((reaction: any) => {
        stats[reaction.reaction_type] = (stats[reaction.reaction_type] || 0) + 1;
      });
      setReactionStats(stats);
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });

    if (data) setComments(data);
  };

  const handleCommentClick = () => {
    if (!showComments) {
      loadComments();
      loadReactions();
    }
    setShowComments(!showComments);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setRemoveExistingImage(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setRemoveExistingImage(true);
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

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    try {
      let imageUrl = removeExistingImage ? '' : (post.image_url || '');

      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const { error } = await supabase
        .from('posts')
        .update({
          content: editContent.trim(),
          image_url: imageUrl,
        })
        .eq('id', post.id);

      if (error) throw error;

      setIsEditing(false);
      setShowMenu(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Error updating post. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      onUpdate();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Error deleting post. Please try again.');
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditContent(post.content);
    setImagePreview(post.image_url || null);
    setSelectedImage(null);
    setRemoveExistingImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const getTotalReactions = () => {
    return Object.values(reactionStats).reduce((a, b) => a + b, 0);
  };

  const getReactionEmojis = () => {
    const reactions: {[key: string]: string} = {
      like: '👍',
      love: '❤️',
      haha: '😂',
      wow: '😮',
      sad: '😢',
      angry: '😠',
    };

    return Object.keys(reactionStats)
      .map(type => reactions[type])
      .slice(0, 3)
      .join('');
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex min-w-0 gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-lg overflow-hidden flex-shrink-0">
              {post.profiles?.avatar_url ? (
                <Image
                  src={post.profiles.avatar_url}
                  alt={post.profiles.username}
                  variant="avatar"
                />
              ) : (
                <span>{post.profiles?.username.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-slate-900">{post.profiles?.username}</h3>
              <p className="text-sm text-slate-500">{formatDate(post.created_at)}</p>
            </div>
          </div>

          {isOwnPost && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-10">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit Post</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Post</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <MentionInput
              value={editContent}
              onChange={setEditContent}
              placeholder="Update your post"
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 resize-none"
            />

            {imagePreview && !removeExistingImage && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Post preview"
                  className="w-full rounded-xl object-cover max-h-96"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-slate-900 bg-opacity-70 text-white p-2 rounded-full hover:bg-opacity-90 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageSelect}
                className="hidden"
                id={`edit-image-${post.id}`}
              />
              <label
                htmlFor={`edit-image-${post.id}`}
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer text-sm"
              >
                Change Photo
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                disabled={!editContent.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>Save</span>
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-4 break-words whitespace-pre-wrap text-base leading-relaxed text-slate-800">
              {renderMentions(post.content)}
            </p>

            {post.image_url && (
              <div className="mb-4 overflow-hidden rounded-lg">
                {post.media_type === 'video' ? (
                  <video src={post.image_url} controls className="max-h-[32rem] w-full bg-slate-950" />
                ) : (
                  <Image src={post.image_url} alt="Post content" variant="post" rounded="lg" />
                )}
              </div>
            )}

            {getTotalReactions() > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg mb-4 text-sm">
                <span className="text-lg">{getReactionEmojis()}</span>
                <span className="text-slate-600">{getTotalReactions()} reactions</span>
              </div>
            )}

            <div className="grid grid-cols-3 sm:flex sm:items-center sm:gap-6 pt-4 border-t border-slate-100">
              <ReactionButton postId={post.id} onReactionChange={loadReactions} />

              <button
                onClick={handleCommentClick}
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{post.comments_count}</span>
              </button>

              <ShareButton postId={post.id} onShareChange={onUpdate} />
            </div>
          </>
        )}
      </div>

      {showComments && !isEditing && (
        <CommentSection
          postId={post.id}
          comments={comments}
          onCommentAdded={() => {
            loadComments();
            loadReactions();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
