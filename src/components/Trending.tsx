import { useState, useEffect } from 'react';
import { supabase, Post } from '../lib/supabase';
import PostCard from './PostCard';
import { Loader2, TrendingUp } from 'lucide-react';

export default function Trending() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrendingPosts();
  }, []);

  const loadTrendingPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .order('likes_count', { ascending: false })
        .order('comments_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading trending posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Trending Posts</h2>
        </div>
        <p className="text-slate-600">Most popular posts across the platform</p>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-600">No trending posts yet.</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onUpdate={loadTrendingPosts} />
        ))
      )}
    </div>
  );
}
