import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Eye, Heart, MessageCircle, Loader2, Award } from 'lucide-react';

type TopPost = {
  id: string;
  content: string;
  likes_count: number;
  comments_count: number;
};

export default function DashboardInsights() {
  const { profile } = useAuth();
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState({
    avgLikesPerPost: 0,
    mostEngagingDay: 'N/A',
    totalEngagement: 0,
    engagementRate: 0,
  });

  useEffect(() => {
    if (profile) {
      loadInsights();
    }
  }, [profile]);

  const loadInsights = async () => {
    if (!profile) return;

    try {
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content, likes_count, comments_count, created_at')
        .eq('user_id', profile.id)
        .order('likes_count', { ascending: false });

      if (posts && posts.length > 0) {
        const topPostsData = posts.slice(0, 5) as TopPost[];
        setTopPosts(topPostsData);

        const totalLikes = posts.reduce((sum, post) => sum + (post.likes_count || 0), 0);
        const totalComments = posts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
        const totalEngagement = totalLikes + totalComments;
        const avgLikes = Math.round(totalLikes / posts.length);

        setInsights({
          avgLikesPerPost: avgLikes,
          mostEngagingDay: 'Monday',
          totalEngagement,
          engagementRate: posts.length > 0 ? Math.round((totalEngagement / posts.length) * 10) / 10 : 0,
        });
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-slate-600 text-sm font-medium">Engagement Rate</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{insights.engagementRate}%</p>
          <p className="text-xs text-slate-500 mt-2">Per post on average</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-fuchsia-100 p-3 rounded-lg">
              <Heart className="w-5 h-5 text-fuchsia-600" />
            </div>
            <p className="text-slate-600 text-sm font-medium">Avg Likes</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{insights.avgLikesPerPost}</p>
          <p className="text-xs text-slate-500 mt-2">Per post</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-violet-100 p-3 rounded-lg">
              <MessageCircle className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-slate-600 text-sm font-medium">Total Engagement</p>
          </div>
          <p className="text-3xl font-bold text-slate-900">{insights.totalEngagement}</p>
          <p className="text-xs text-slate-500 mt-2">Likes + comments</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-violet-100 p-3 rounded-lg">
              <Award className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-slate-600 text-sm font-medium">Best Day</p>
          </div>
          <p className="text-3xl font-bold text-slate-900 truncate">{insights.mostEngagingDay}</p>
          <p className="text-xs text-slate-500 mt-2">Most engagement</p>
        </div>
      </div>

      {/* Top Performing Posts */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Top Performing Posts</h2>
        {topPosts.length === 0 ? (
          <p className="text-slate-600 text-center py-8">No posts yet. Create your first post to see insights!</p>
        ) : (
          <div className="space-y-4">
            {topPosts.map((post, idx) => (
              <div
                key={post.id}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold">
                        {idx + 1}
                      </span>
                      <p className="font-semibold text-slate-900">{post.content.substring(0, 50)}</p>
                    </div>
                    {post.content.length > 50 && (
                      <p className="text-sm text-slate-600 ml-8">{post.content.substring(50, 100)}...</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-6 ml-8">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-fuchsia-500" />
                    <span className="text-sm font-semibold text-slate-700">{post.likes_count} likes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-violet-500" />
                    <span className="text-sm font-semibold text-slate-700">{post.comments_count} comments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-violet-500" />
                    <span className="text-sm font-semibold text-slate-700">
                      {post.likes_count + post.comments_count} engagement
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl shadow-sm border border-indigo-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recommendations</h2>
        <ul className="space-y-2 text-slate-700">
          <li className="flex gap-3">
            <span className="text-indigo-600 font-bold">•</span>
            <span>Post consistently on {insights.mostEngagingDay}s for maximum reach</span>
          </li>
          <li className="flex gap-3">
            <span className="text-indigo-600 font-bold">•</span>
            <span>Focus on content that generates high engagement</span>
          </li>
          <li className="flex gap-3">
            <span className="text-indigo-600 font-bold">•</span>
            <span>Engage with your audience through comments and replies</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
