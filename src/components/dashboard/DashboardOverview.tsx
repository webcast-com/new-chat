import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, Heart, MessageCircle, TrendingUp, Loader2 } from 'lucide-react';

type MetricCard = {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
};

export default function DashboardOverview() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadMetrics();
    }
  }, [profile]);

  const loadMetrics = async () => {
    if (!profile) return;

    try {
      const [postsRes, followersRes, likesRes, commentsRes] = await Promise.all([
        supabase.from('posts').select('id').eq('user_id', profile.id),
        supabase.from('connections').select('id').eq('following_id', profile.id),
        supabase.from('likes').select('id').eq('user_id', profile.id),
        supabase.from('comments').select('id').eq('user_id', profile.id),
      ]);

      const metricsData: MetricCard[] = [
        {
          title: 'Total Posts',
          value: postsRes.data?.length || 0,
          icon: <TrendingUp className="w-6 h-6" />,
          color: 'from-indigo-500 to-violet-600',
        },
        {
          title: 'Followers',
          value: followersRes.data?.length || 0,
          icon: <Users className="w-6 h-6" />,
          color: 'from-violet-500 to-fuchsia-600',
        },
        {
          title: 'Likes Received',
          value: likesRes.data?.length || 0,
          icon: <Heart className="w-6 h-6" />,
          color: 'from-fuchsia-500 to-violet-600',
        },
        {
          title: 'Comments Made',
          value: commentsRes.data?.length || 0,
          icon: <MessageCircle className="w-6 h-6" />,
          color: 'from-indigo-500 to-violet-600',
        },
      ];

      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading metrics:', error);
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
    <div className="space-y-6 bg-[#657acb]">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className={`rounded-xl border border-slate-200 p-6 shadow-sm transition-shadow hover:shadow-md ${
              idx === 0 ? 'bg-[#9b9b9b]' : idx === 1 ? 'bg-[#22a1af] [text-shadow:1px_1px_3px_rgba(0,0,0,1)]' : idx === 2 ? 'bg-[#8c4bc2]' : 'bg-[#48d699]'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`bg-gradient-to-br ${metric.color} p-3 rounded-lg text-white`}>
                {metric.icon}
              </div>
              {metric.trend && (
                <span className={`text-sm font-semibold ${metric.trend > 0 ? 'text-violet-600' : 'text-slate-600'}`}>
                  {metric.trend > 0 ? '+' : ''}{metric.trend}%
                </span>
              )}
            </div>
            <p className={`text-sm font-medium text-black ${
              idx === 0 ? 'bg-[#9b9b9b] [text-shadow:1px_1px_3px_rgba(155,155,155,1)]' : idx === 1 ? '[text-shadow:1px_1px_3px_rgba(40,174,194,1)]' : idx === 2 ? '[text-shadow:1px_1px_3px_rgba(134,38,218,1)]' : ''
            }`}>{metric.title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity Summary */}
      <div className="rounded-2xl border border-slate-200 bg-[#b23b3b] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-lg border border-indigo-100">
            <p className="text-sm text-black mb-1">Engagement Rate</p>
            <p className="text-2xl font-bold text-indigo-600">0%</p>
            <p className="text-xs text-black mt-2">Track your engagement patterns</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-lg border border-violet-100">
            <p className="text-sm text-black mb-1">Most Active Day</p>
            <p className="text-2xl font-bold text-violet-600">N/A</p>
            <p className="text-xs text-black mt-2">Based on your posting history</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-lg border border-indigo-100">
            <p className="text-sm text-black mb-1">Avg Likes per Post</p>
            <p className="text-2xl font-bold text-indigo-600">0</p>
            <p className="text-xs text-black mt-2">Average engagement per post</p>
          </div>
        </div>
      </div>
    </div>
  );
}
