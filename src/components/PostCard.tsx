import { useEffect, useState, useRef } from 'react';
import { MessageCircle, MoreHorizontal, CreditCard as Edit2, Trash2, X, Check, Bookmark, Flag, MapPin, Repeat2 } from 'lucide-react';
import { Post, Comment } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getPostMediaType, removePostMedia, uploadPostMedia, validatePostMedia, type PostMediaType } from '../lib/postMedia';
import CommentSection from './CommentSection';
import ReactionButton from './ReactionButton';
import ShareButton from './ShareButton';
import SharedPostCard from './SharedPostCard';
import VideoPlayer from './VideoPlayer';
import Image from './Image';
import MentionInput, { renderMentions } from './MentionInput';

interface PostCardProps {
  post: Post;
  onUpdate: () => void;
}

export default function PostCard({ post, onUpdate }: PostCardProps) {
  const { user, profile } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(post.image_url || null);
  const [selectedMediaType, setSelectedMediaType] = useState<PostMediaType>(post.media_type === 'video' ? 'video' : 'image');
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [reactionStats, setReactionStats] = useState<{[key: string]: number}>({});
  const [isBookmarked, setIsBookmarked] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('saved-posts') || '[]') as string[];
    return saved.includes(post.id);
  });
  const [isReported, setIsReported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const releasePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const isOwnPost = profile?.id === post.user_id;

  const loadReactions = async () => {
    const { data } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('post_id', post.id);

    if (data) {
      const stats: {[key: string]: number} = {};
      data.forEach((reaction) => {
        stats[reaction.reaction_type] = (stats[reaction.reaction_type] || 0) + 1;
      });
      setReactionStats(stats);
    }
  };

  // Phase 2 — paginate comments (25 per page).
  const COMMENTS_PAGE_SIZE = 25;
  const loadComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      .range(0, COMMENTS_PAGE_SIZE - 1);

    if (data) {
      setComments(data);
      setHasMoreComments(data.length === COMMENTS_PAGE_SIZE);
    }
  };

  const loadMoreComments = async () => {
    if (loadingMoreComments) return;
    setLoadingMoreComments(true);
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      .range(comments.length, comments.length + COMMENTS_PAGE_SIZE - 1);

    if (data && data.length > 0) {
      setComments(prev => {
        const seen = new Set(prev.map(c => c.id));
        return [...prev, ...data.filter(c => !seen.has(c.id))];
      });
      setHasMoreComments(data.length === COMMENTS_PAGE_SIZE);
    } else {
      setHasMoreComments(false);
    }
    setLoadingMoreComments(false);
  };

  // Phase 2 — deep link: #comment-<id> opens this post's comment section only
  // when the comment actually belongs to this post (cheap indexed lookup).
  useEffect(() => {
    const match = window.location.hash.match(/^#comment-(.+)$/);
    if (!match) return;
    const commentId = decodeURIComponent(match[1]);
    let cancelled = false;
    supabase
      .from('comments')
      .select('id')
      .eq('post_id', post.id)
      .eq('id', commentId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) {
          loadComments();
          setShowComments(true);
        }
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const handleCommentClick = () => {
    if (!showComments) {
      loadComments();
      loadReactions();
    }
    setShowComments(!showComments);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validatePostMedia(file);
    if (validationError) {
      alert(validationError);
      e.currentTarget.value = '';
      return;
    }

    const nextMediaType = getPostMediaType(file);
    if (!nextMediaType) return;

    releasePreview();
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setSelectedImage(file);
    setSelectedMediaType(nextMediaType);
    setImagePreview(previewUrl);
    setRemoveExistingImage(false);
  };

  const removeImage = () => {
    releasePreview();
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedMediaType('image');
    setRemoveExistingImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File) => {
    if (!profile) throw new Error('You must be signed in to upload media.');
    return uploadPostMedia(file, profile.id);
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    let uploadedPath = '';
    try {
      let imageUrl = removeExistingImage ? '' : (post.image_url || '');
      let nextMediaType: PostMediaType = removeExistingImage
        ? 'image'
        : (post.media_type === 'video' ? 'video' : 'image');

      if (selectedImage) {
        const uploaded = await uploadImage(selectedImage);
        imageUrl = uploaded.publicUrl;
        uploadedPath = uploaded.path;
        nextMediaType = uploaded.mediaType;
      }

      const { error } = await supabase
        .from('posts')
        .update({
          content: editContent.trim(),
          image_url: imageUrl,
          media_type: nextMediaType,
        })
        .eq('id', post.id);

      if (error) throw error;

      releasePreview();
      setImagePreview(imageUrl || null);
      setSelectedImage(null);
      setSelectedMediaType(nextMediaType);
      setRemoveExistingImage(false);
      setIsEditing(false);
      setShowMenu(false);
      onUpdate();
    } catch (error) {
      if (uploadedPath) await removePostMedia(uploadedPath);
      console.error('Error updating post:', error);
      alert(error instanceof Error ? error.message : 'Error updating post. Please try again.');
    }
  };

  // Phase 8 — real moderation reporting (was a no-op before).
  const handleReport = async () => {
    if (!user || isReported) return;
    setIsReported(true);
    setShowMenu(false);
    const { error } = await supabase
      .from('moderation_reports')
      .insert({
        reporter_id: user.id,
        target_type: 'post',
        target_id: post.id,
        reason: 'Flagged from the feed',
      });
    if (error) {
      console.error('Error reporting post:', error);
      setIsReported(false);
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
    releasePreview();
    setIsEditing(false);
    setEditContent(post.content);
    setImagePreview(post.image_url || null);
    setSelectedImage(null);
    setSelectedMediaType(post.media_type === 'video' ? 'video' : 'image');
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

  const toggleBookmark = () => {
    const saved = new Set(JSON.parse(localStorage.getItem('saved-posts') || '[]') as string[]);
    if (saved.has(post.id)) saved.delete(post.id); else saved.add(post.id);
    localStorage.setItem('saved-posts', JSON.stringify([...saved]));
    setIsBookmarked(saved.has(post.id));
  };

  const tags = Array.from(new Set(post.content.match(/#[\p{L}\p{N}_-]+/gu) || [])).slice(0, 4);
  const audienceLocation = post.visibility === 'constituency' ? post.constituency : post.county;

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
              {post.visibility !== 'public' && audienceLocation && (
                <p className="mt-1 flex items-center gap-1 text-xs text-blue-600"><MapPin className="h-3.5 w-3.5" />{audienceLocation}</p>
              )}
            </div>
          </div>

          <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-10">
                  {isOwnPost ? <>
                    <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"><Edit2 className="w-4 h-4" /><span>Edit Post</span></button>
                    <button onClick={handleDelete} className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /><span>Delete Post</span></button>
                  </> : <button onClick={() => void handleReport()} className="w-full flex items-center gap-3 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"><Flag className="w-4 h-4" /><span>{isReported ? 'Reported ✓' : 'Report post'}</span></button>}
                </div>
              )}
            </div>
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
                {selectedMediaType === 'video' ? (
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

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/ogg"
                onChange={handleImageSelect}
                className="hidden"
                id={`edit-image-${post.id}`}
              />
              <label
                htmlFor={`edit-image-${post.id}`}
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50 cursor-pointer text-sm"
              >
                Change photo or video
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

            {post.shared_post_id && (
              <div className="mb-4">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Repeat2 className="h-3.5 w-3.5 text-violet-500" />
                  Reposted from {post.shared_post?.profiles?.username || 'a post'}
                </p>
                <SharedPostCard post={post.shared_post} postId={post.shared_post_id} />
              </div>
            )}

            {tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {tags.map(tag => <button key={tag} onClick={() => navigator.clipboard?.writeText(tag)} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100">{tag}</button>)}
              </div>
            )}

            {post.image_url && (
              <div className="mb-4 overflow-hidden rounded-lg">
                {post.media_type === 'video' ? (
                  <VideoPlayer src={post.image_url} poster={post.poster_url} />
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

            <div className="grid grid-cols-4 sm:flex sm:items-center sm:gap-4 pt-4 border-t border-slate-100">
              <ReactionButton postId={post.id} onReactionChange={loadReactions} />

              <button onClick={toggleBookmark} aria-pressed={isBookmarked} className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${isBookmarked ? 'bg-violet-50 text-violet-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
                <span className="hidden text-sm font-medium sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
              </button>

              <button
                onClick={handleCommentClick}
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{post.comments_count}</span>
              </button>

              <ShareButton postId={post.id} onShareChange={onUpdate} shareCount={post.shares_count} />
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
          hasMore={hasMoreComments}
          onLoadMore={() => void loadMoreComments()}
          loadingMore={loadingMoreComments}
        />
      )}
    </div>
  );
}
