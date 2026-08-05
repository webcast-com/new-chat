import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Comment } from '../lib/supabase';
import { Heart, MessageCircle, Send, X, MoreHorizontal, Pencil, Trash2, Link2, Check } from 'lucide-react';
import LazyImage from './LazyImage';
import MentionInput, { renderMentions } from './MentionInput';
import { buildCommentTree, CommentNode } from '../lib/commentThreads';

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  onCommentAdded: () => void;
  /** Pagination — when true, a "load more" button is shown. */
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

type ReplyTarget = Pick<Comment, 'id' | 'profiles'>;

const REPLIES_SHOWN_BY_DEFAULT = 2;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const details = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const message = typeof details.message === 'string' ? details.message : 'Unable to add your comment.';
    const context = [details.details, details.hint].filter(value => typeof value === 'string' && value).join(' ');
    return context ? `${message} ${context}` : message;
  }
  return 'Unable to add your comment.';
}

export default function CommentSection({ postId, comments, onCommentAdded, hasMore, onLoadMore, loadingMore }: CommentSectionProps) {
  const { user, profile } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasScrolledToHash = useRef(false);

  const tree = useMemo(() => buildCommentTree(comments), [comments]);

  // Phase 2 — deep link: #comment-<id> scrolls the comment into view and
  // highlights it (PostCard opens the comment section when the hash matches).
  useEffect(() => {
    if (hasScrolledToHash.current || comments.length === 0) return;
    const match = window.location.hash.match(/^#comment-(.+)$/);
    if (!match) return;
    const targetId = decodeURIComponent(match[1]);
    if (!comments.some(c => c.id === targetId)) return;
    hasScrolledToHash.current = true;
    setHighlightedCommentId(targetId);
    const timer = window.setTimeout(() => {
      commentRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [comments]);

  useEffect(() => {
    if (!highlightedCommentId) return;
    const timer = window.setTimeout(() => setHighlightedCommentId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightedCommentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const content = replyTo
        ? `@${replyTo.profiles?.username || 'member'} ${newComment.trim()}`
        : newComment.trim();
      const { error } = await supabase.functions.invoke('add-comment', {
        body: { postId, content, parentId: replyTo?.id ?? null },
      });
      if (error) throw error;
      setNewComment('');
      setReplyTo(null);
      onCommentAdded();
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      console.error(`Error adding comment: ${message}`, { error, postId, userId: user.id });
      setErrorMessage(message);
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
    setMenuOpenFor(null);
  };

  const toggleThread = (commentId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setMenuOpenFor(null);
  };

  const saveEdit = async (comment: Comment) => {
    if (!user || !editContent.trim() || editLoading) return;
    setEditLoading(true);
    setErrorMessage('');
    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editContent.trim() })
        .eq('id', comment.id)
        .eq('user_id', user.id);
      if (error) throw error;
      setEditingId(null);
      onCommentAdded();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setEditLoading(false);
    }
  };

  const deleteComment = async (comment: Comment) => {
    if (!user || deletingId) return;
    setDeletingId(comment.id);
    setErrorMessage('');
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', comment.id)
        .eq('user_id', user.id);
      if (error) throw error;
      setMenuOpenFor(null);
      onCommentAdded();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  const copyCommentLink = async (comment: Comment) => {
    const url = `${window.location.origin}${window.location.pathname}#comment-${comment.id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      setCopiedCommentId(comment.id);
      setMenuOpenFor(null);
      window.setTimeout(() => setCopiedCommentId(null), 2000);
    } catch {
      setErrorMessage('Unable to copy the comment link.');
    }
  };

  const renderComment = (node: CommentNode, depth: number) => {
    const comment = node.comment;
    const liked = likedComments.has(comment.id);
    const isOwn = user && comment.user_id === user.id;
    const isEditing = editingId === comment.id;
    const repliesVisible = expandedThreads.has(comment.id);
    const hiddenReplies = node.replies.length - REPLIES_SHOWN_BY_DEFAULT;
    const shownReplies = repliesVisible ? node.replies : node.replies.slice(0, REPLIES_SHOWN_BY_DEFAULT);
    const isHighlighted = highlightedCommentId === comment.id;
    const menuOpen = menuOpenFor === comment.id;

    return (
      <div key={comment.id} ref={el => { commentRefs.current[comment.id] = el; }} id={`comment-${comment.id}`}>
        <article
          className={`flex gap-3 rounded-xl p-2 transition-colors ${
            isHighlighted ? 'bg-violet-50 ring-2 ring-violet-300 dark:bg-violet-950/40 dark:ring-violet-700' : ''
          }`}
        >
          <Avatar profile={comment.profiles} />
          <div className="min-w-0 flex-1">
            <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-zinc-900 dark:ring-zinc-800">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  {comment.profiles?.username || 'Community member'}
                  {isOwn && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">You</span>}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <time className="text-xs text-slate-400">{formatDate(comment.created_at)}</time>
                  {isOwn && (
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpenFor(menuOpen ? null : comment.id)}
                        aria-label="Comment options"
                        className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                      {menuOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuOpenFor(null)} />
                          <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                            <button onClick={() => startEdit(comment)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800">
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => { setMenuOpenFor(null); void deleteComment(comment); }}
                              disabled={deletingId === comment.id}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> {deletingId === comment.id ? 'Deleting…' : 'Delete'}
                            </button>
                            <button onClick={() => void copyCommentLink(comment)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-zinc-800">
                              {copiedCommentId === comment.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
                              {copiedCommentId === comment.id ? 'Copied!' : 'Copy link'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    autoFocus
                    className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => void saveEdit(comment)}
                      disabled={editLoading || !editContent.trim()}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                    >
                      {editLoading ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditContent(''); }}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="break-words text-sm leading-6 text-slate-700 dark:text-zinc-300">{renderMentions(comment.content)}</p>
              )}
            </div>
            <div className="flex items-center gap-3 px-2 pt-1.5">
              <button
                onClick={() => setLikedComments(ids => { const next = new Set(ids); if (liked) next.delete(comment.id); else next.add(comment.id); return next; })}
                className={`flex items-center gap-1 text-xs font-semibold transition ${liked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}
              >
                <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />{liked ? 'Liked' : 'Like'}
              </button>
              <button onClick={() => startReply(comment)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-violet-600 dark:hover:text-violet-300">
                <MessageCircle className="h-3.5 w-3.5" />Reply
              </button>
              {node.replies.length > 0 && (
                <span className="text-xs text-slate-400">{node.replies.length} {node.replies.length === 1 ? 'reply' : 'replies'}</span>
              )}
            </div>
          </div>
        </article>

        {/* Nested replies (indented under the parent) */}
        {node.replies.length > 0 && (
          <div className="ml-6 mt-1 space-y-1 border-l-2 border-violet-200 pl-3 dark:border-violet-900/60 sm:ml-9">
            {shownReplies.map(replyNode => renderComment(replyNode, depth + 1))}
            {hiddenReplies > 0 && (
              <button
                onClick={() => toggleThread(comment.id)}
                className="ml-2 mt-1 text-xs font-semibold text-violet-600 transition hover:text-violet-700 dark:text-violet-400"
              >
                {repliesVisible ? 'Show fewer replies' : `View ${hiddenReplies} more ${hiddenReplies === 1 ? 'reply' : 'replies'}`}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="border-t border-slate-200 bg-slate-50/80 dark:border-zinc-800 dark:bg-zinc-950/30">
      <div className="max-h-[30rem] space-y-2 overflow-y-auto px-4 py-5 sm:px-6">
        {tree.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-zinc-700">Start the conversation.</p>}
        {tree.map(node => renderComment(node, 0))}

        {hasMore && (
          <div className="pt-2 text-center">
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="rounded-full border border-violet-300 px-4 py-1.5 text-xs font-semibold text-violet-600 transition hover:bg-violet-50 disabled:opacity-50 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/40"
            >
              {loadingMore ? 'Loading…' : 'Load more comments'}
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
        {errorMessage && <p className="mb-3 text-sm text-red-600">{errorMessage}</p>}
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
            <span>Replying to <strong>@{replyTo.profiles?.username || 'member'}</strong></span>
            <button onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X className="h-4 w-4" /></button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <Avatar profile={profile} />
          <div className="flex flex-1 gap-2">
            <MentionInput
              value={newComment}
              onChange={setNewComment}
              placeholder={replyTo ? `Reply to ${replyTo.profiles?.username || 'member'}...` : 'Write a thoughtful comment...'}
              rows={1}
              className="min-h-10 w-full flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              aria-label="Post comment"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Avatar({ profile }: { profile?: { avatar_url?: string; username?: string } | null }) {
  return <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white">{profile?.avatar_url ? <LazyImage src={profile.avatar_url} alt={profile.username || 'Profile'} className="h-8 w-8" /> : <span>{profile?.username?.charAt(0).toUpperCase() || '?'}</span>}</div>;
}
