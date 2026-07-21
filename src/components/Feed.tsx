import { useState, useEffect } from 'react';
import { supabase, Post } from '../lib/supabase';
import PostCard from './PostCard';
import Stories from './Stories';
import { SearchX } from 'lucide-react';

interface FeedProps {
  refreshKey: number;
  searchQuery: string;
}

export default function Feed({ refreshKey, searchQuery }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
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
      <Stories />
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
        visiblePosts.map((post) => (
          <PostCard key={post.id} post={post} onUpdate={loadPosts} />
        ))
      )}
    </div>
  );
}
