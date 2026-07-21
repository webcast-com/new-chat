import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Comment } from '../lib/supabase';
import { Heart, MessageCircle, Send, X } from 'lucide-react';
import LazyImage from './LazyImage';
import MentionInput, { renderMentions } from './MentionInput';

interface CommentSectionProps { postId: string; comments: Comment[]; onCommentAdded: () => void; }

type ReplyTarget = Pick<Comment, 'id' | 'profiles'>;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unable to add your comment.';
}

export default function CommentSection({ postId, comments, onCommentAdded }: CommentSectionProps) {
  const { user, profile } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [threadedIds, setThreadedIds] = useState<Set<string>>(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: replyTo ? `@${replyTo.profiles?.username || 'member'} ${newComment.trim()}` : newComment.trim(),
      }).select('id').single();
      if (error) throw error;
      if (replyTo && data?.id) setThreadedIds(ids => new Set(ids).add(data.id));
      setNewComment('');
      setReplyTo(null);
      onCommentAdded();
    } catch (error: unknown) {
      console.error('Error adding comment:', { error, postId, userId: user.id });
      setErrorMessage(getErrorMessage(error));
    } finally { setLoading(false); }
  };

  const formatDate = (dateString: string) => {
    const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const startReply = (comment: Comment) => {
    setReplyTo(comment);
    setNewComment(current => current || '');
  };

  return (
    <section className="border-t border-slate-200 bg-slate-50/80 dark:border-zinc-800 dark:bg-zinc-950/30">
      <div className="max-h-[30rem] space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
        {comments.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-zinc-700">Start the conversation.</p>}
        {comments.map(comment => {
          const isReply = threadedIds.has(comment.id) || comments.some(parent => parent.id !== comment.id && comment.content.startsWith(`@${parent.profiles?.username || ''} `));
          const liked = likedComments.has(comment.id);
          return <article key={comment.id} className={`flex gap-3 ${isReply ? 'ml-7 border-l-2 border-violet-200 pl-3 dark:border-violet-900' : ''}`}>
            <Avatar profile={comment.profiles} />
            <div className="min-w-0 flex-1">
              <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-zinc-900 dark:ring-zinc-800">
                <div className="mb-1 flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">{comment.profiles?.username || 'Community member'}</p><time className="shrink-0 text-xs text-slate-400">{formatDate(comment.created_at)}</time></div>
                <p className="break-words text-sm leading-6 text-slate-700 dark:text-zinc-300">{renderMentions(comment.content)}</p>
              </div>
              <div className="flex items-center gap-3 px-2 pt-1.5"><button onClick={() => setLikedComments(ids => { const next = new Set(ids); if (liked) next.delete(comment.id); else next.add(comment.id); return next; })} className={`flex items-center gap-1 text-xs font-semibold transition ${liked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}><Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />{liked ? 'Liked' : 'Like'}</button><button onClick={() => startReply(comment)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-violet-600 dark:hover:text-violet-300"><MessageCircle className="h-3.5 w-3.5" />Reply</button></div>
            </div>
          </article>;
        })}
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
        {errorMessage && <p className="mb-3 text-sm text-red-600">{errorMessage}</p>}
        {replyTo && <div className="mb-2 flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700 dark:bg-violet-950/50 dark:text-violet-200"><span>Replying to <strong>@{replyTo.profiles?.username || 'member'}</strong></span><button onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X className="h-4 w-4" /></button></div>}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Avatar profile={profile} />
          <div className="flex flex-1 gap-2"><MentionInput value={newComment} onChange={setNewComment} placeholder={replyTo ? `Reply to ${replyTo.profiles?.username || 'member'}...` : 'Write a thoughtful comment...'} rows={1} className="min-h-10 w-full flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800" /><button type="submit" disabled={loading || !newComment.trim()} aria-label="Post comment" className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" /></button></div>
        </form>
      </div>
    </section>
  );
}

function Avatar({ profile }: { profile?: { avatar_url?: string; username?: string } | null }) {
  return <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white">{profile?.avatar_url ? <LazyImage src={profile.avatar_url} alt={profile.username || 'Profile'} className="h-8 w-8" /> : <span>{profile?.username?.charAt(0).toUpperCase() || '?'}</span>}</div>;
}
