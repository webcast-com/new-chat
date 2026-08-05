import { useState, useEffect, useCallback } from 'react';
import { supabase, Post } from '../lib/supabase';
import PostCard from './PostCard';
import { Loader2, TrendingUp, Flame, Clock, Sparkles } from 'lucide-react';

interface TrendingPost extends Post {
  trending_score?: number;
}

type TimeFilter = '24h' | '7d' | 'all';

export default function Trending() {
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7d');

  const loadTrendingPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*, profiles(*)');

      // Apply time filter
      const now = new Date();
      if (timeFilter === '24h') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        query = query.gte('created_at', yesterday.toISOString());
      } else if (timeFilter === '7d') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', weekAgo.toISOString());
      }

      // Get all matching posts
      const { data, error } = await query;

      if (error) throw error;

      // Calculate trending score on client side for now
      // Score = (likes * 1 + comments * 3 + shares * 5) * time_decay
      const scoredPosts = (data || []).map(post => {
        const shares = post.shares_count || 0;
        const hoursSincePost = (now.getTime() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);

        let timeDecay: number;
        if (hoursSincePost < 1) {
          timeDecay = 1.0;
        } else {
          timeDecay = 1.0 / (1.0 + Math.pow(hoursSincePost, 1.5));
        }

        const engagementScore =
          post.likes_count * 1.0 +
          post.comments_count * 3.0 +
          shares * 5.0;

        return {
          ...post,
          trending_score: engagementScore * timeDecay
        };
      });

      // Sort by trending score
      scoredPosts.sort((a, b) => (b.trending_score || 0) - (a.trending_score || 0));

      setPosts(scoredPosts.slice(0, 20));
    } catch (error) {
      console.error('Error loading trending posts:', error);
    } finally {
      setLoading(false);
    }
  }, [timeFilter]);

  useEffect(() => {
    loadTrendingPosts();
  }, [loadTrendingPosts]);

  const formatScore = (score?: number) => {
    if (!score) return '0';
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}k`;
    }
    return score.toFixed(0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Trending Posts</h2>
            <p className="text-slate-600 text-sm">Posts with the most engagement</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTimeFilter('24h')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              timeFilter === '24h'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            Hot
          </button>
          <button
            onClick={() => setTimeFilter('7d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              timeFilter === '7d'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            This Week
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              timeFilter === 'all'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            All Time
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-full">
              <TrendingUp className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <p className="text-slate-600 font-medium">No trending posts yet</p>
              <p className="text-slate-500 text-sm">Check back later for popular content</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, index) => (
            <div key={post.id} className="relative">
              {index < 3 && (
                <div className="absolute -left-3 top-6 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ${
                    index === 0 ? 'bg-gradient-to-br from-violet-400 to-fuchsia-500' :
                    index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' :
                    'bg-gradient-to-br from-indigo-600 to-violet-700'
                  }`}>
                    {index + 1}
                  </div>
                </div>
              )}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                <PostCard post={post} onUpdate={loadTrendingPosts} />
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-violet-500" />
                      Score: {formatScore(post.trending_score)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
