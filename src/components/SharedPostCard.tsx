import { useEffect, useState } from 'react';
import { supabase, Post } from '../lib/supabase';
import { Repeat2 } from 'lucide-react';
import LazyImage from './LazyImage';

interface SharedPostCardProps {
  /** The already-joined post (with profiles) when available. */
  post?: Post | null;
  /** Fallback: fetch the post by id (realtime payloads don't include joins). */
  postId?: string | null;
  className?: string;
  /** Small variant for inside chat bubbles. */
  compact?: boolean;
}

/**
 * Phase 3 — a compact "quote card" of a post, used for feed reposts,
 * DM shares and group shares. Self-fetches when only the id is known.
 */
const SharedPostCard: React.FC<SharedPostCardProps> = ({ post, postId, className, compact }) => {
  const [loadedPost, setLoadedPost] = useState<Post | null | undefined>(post);

  useEffect(() => {
    if (post) {
      setLoadedPost(post);
      return;
    }
    if (!postId) {
      setLoadedPost(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('posts')
          .select('*, profiles(*)')
          .eq('id', postId)
          .maybeSingle();
        if (!cancelled) setLoadedPost(data || null);
      } catch {
        if (!cancelled) setLoadedPost(null);
      }
    })();
    return () => { cancelled = true; };
  }, [post, postId]);

  if (loadedPost === undefined) {
    return (
      <div className={`animate-pulse rounded-xl border border-slate-200 bg-slate-100 p-3 dark:border-zinc-700 dark:bg-zinc-800 ${className || ''}`}>
        <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-zinc-700" />
        <div className="mt-2 h-3 w-2/3 rounded bg-slate-200 dark:bg-zinc-700" />
      </div>
    );
  }

  if (!loadedPost) return null;

  const author = loadedPost.profiles?.username || 'Community member';
  const hasMedia = Boolean(loadedPost.image_url);
  const thumbnail = loadedPost.media_type === 'video' ? (loadedPost.poster_url || loadedPost.image_url) : loadedPost.image_url;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800 ${
        compact ? 'max-w-[260px]' : ''
      } ${className || ''}`}
    >
      <div className="flex gap-2 p-2.5">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[11px] font-bold text-slate-700 dark:text-zinc-200">
            <Repeat2 className="h-3 w-3 shrink-0 text-violet-500" />
            <span className="truncate">Post by @{author}</span>
          </p>
          <p className={`mt-1 break-words text-slate-600 dark:text-zinc-300 ${compact ? 'line-clamp-2 text-xs' : 'line-clamp-3 text-sm'}`}>
            {loadedPost.content || (hasMedia ? 'Photo / video post' : '')}
          </p>
        </div>
        {thumbnail && (
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-zinc-700">
            <LazyImage src={thumbnail} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedPostCard;
