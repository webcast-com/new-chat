import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { supabase, Post } from '../lib/supabase';
import PostCard from './PostCard';
import Stories from './Stories';
import { movies } from '../movies/data/movies';
import { ArrowRight, SearchX, Star } from 'lucide-react';

interface FeedProps {
  refreshKey: number;
  searchQuery: string;
  onCreatePost?: () => void;
  onAboutCreator?: () => void;
  onBrowseMovies?: () => void;
}

const INITIAL_POST_COUNT = 4;
const POST_BATCH_SIZE = 4;

export default function Feed({ refreshKey, searchQuery, onCreatePost, onAboutCreator, onBrowseMovies }: FeedProps) {
  const featuredMovies = movies.slice(0, 5);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_POST_COUNT);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const nextPosts = data || [];
      setPosts(nextPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [refreshKey]);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visiblePosts = normalizedSearchQuery
    ? posts.filter((post) =>
        post.content.toLowerCase().includes(normalizedSearchQuery) ||
        post.profiles?.username.toLowerCase().includes(normalizedSearchQuery) ||
        post.profiles?.full_name.toLowerCase().includes(normalizedSearchQuery)
      )
    : posts;

  useEffect(() => {
    setVisibleCount(INITIAL_POST_COUNT);
  }, [normalizedSearchQuery]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || visibleCount >= visiblePosts.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + POST_BATCH_SIZE, visiblePosts.length));
      },
      { rootMargin: '400px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [visibleCount, visiblePosts.length]);

  if (loading) {
    return (
      <div className="space-y-6" aria-label="Loading community feed" aria-busy="true">
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-zinc-800" />
          ))}
        </div>
        {[1, 2].map((item) => (
          <div key={item} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex animate-pulse gap-3">
              <div className="h-10 w-10 rounded-full bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-zinc-800" />
                <div className="h-3 w-20 rounded bg-zinc-800" />
              </div>
            </div>
            <div className="mt-5 h-4 w-11/12 animate-pulse rounded bg-zinc-800" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Stories onCreatePost={onCreatePost} onAboutCreator={onAboutCreator} />
      <section className="overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-950/70 via-zinc-900 to-fuchsia-950/50 p-4 shadow-lg shadow-violet-950/20 sm:p-5" aria-labelledby="featured-movies-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Now showing</p>
            <h2 id="featured-movies-heading" className="mt-1 text-xl font-bold text-white">Featured movies</h2>
          </div>
          <button
            type="button"
            onClick={onBrowseMovies}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-violet-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            Browse all <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {featuredMovies.map((movie) => (
            <div key={movie.id} className="group min-w-0">
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-800 shadow-md">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  onError={(event) => { event.currentTarget.src = `https://placehold.co/500x750/1a1a1a/f5c518?text=${encodeURIComponent(movie.title)}`; }}
                />
                <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-1 text-xs font-semibold text-white backdrop-blur">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {movie.rating.toFixed(1)}
                </div>
              </div>
              <h3 className="mt-2 truncate text-sm font-semibold text-white">{movie.title}</h3>
              <p className="truncate text-xs text-zinc-400">{movie.year} · {movie.genre[0]}</p>
            </div>
          ))}
        </div>
      </section>
      {visiblePosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/80 p-10 text-center shadow-sm">
          <SearchX className="mx-auto h-10 w-10 text-violet-400" />
          <p className="mt-4 text-lg font-semibold text-white">
            {normalizedSearchQuery ? 'No posts match your search.' : 'Your community is ready for its first post.'}
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            {normalizedSearchQuery ? 'Try a different keyword or browse the latest conversations.' : 'Share a project, toy idea, or bit of workshop magic.'}
          </p>
        </div>
      ) : (
        <>
          {visiblePosts.slice(0, visibleCount).map((post) => (
            <PostCard key={post.id} post={post} onUpdate={loadPosts} />
          ))}
          {visibleCount < visiblePosts.length && (
            <div ref={loadMoreRef} className="space-y-3 py-2" aria-label="Loading more posts" aria-busy="true">
              <div className="h-24 animate-pulse rounded-2xl bg-zinc-900" />
              <div className="h-24 animate-pulse rounded-2xl bg-zinc-900" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
