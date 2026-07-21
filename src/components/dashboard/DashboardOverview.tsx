import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, Heart, MessageCircle, TrendingUp, Sparkles, ArrowUpRight } from 'lucide-react';

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
      <div className="space-y-6" aria-label="Loading dashboard" aria-busy="true">
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-800" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl bg-zinc-800" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-violet-950/20 sm:p-8">
        <div className="relative z-10 max-w-xl">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-violet-100">
            <Sparkles className="h-4 w-4" />
            Workshop overview
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {profile?.full_name || profile?.username}.</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-indigo-100 sm:text-base">Keep building your community. Your latest activity and engagement snapshot are ready below.</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            Workshop status: active
          </div>
        </div>
        <Sparkles className="absolute -right-5 -top-5 h-40 w-40 rotate-12 text-white/10" />
      </section>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
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
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-600">{metric.title}</p>
              <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-violet-500" />
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-lg border border-indigo-100">
            <p className="text-slate-600 text-sm mb-1">Engagement Rate</p>
            <p className="text-2xl font-bold text-indigo-600">0%</p>
            <p className="text-xs text-slate-500 mt-2">Track your engagement patterns</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-lg border border-violet-100">
            <p className="text-slate-600 text-sm mb-1">Most Active Day</p>
            <p className="text-2xl font-bold text-violet-600">N/A</p>
            <p className="text-xs text-slate-500 mt-2">Based on your posting history</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-lg border border-indigo-100">
            <p className="text-slate-600 text-sm mb-1">Avg Likes per Post</p>
            <p className="text-2xl font-bold text-indigo-600">0</p>
            <p className="text-xs text-slate-500 mt-2">Average engagement per post</p>
          </div>
        </div>
      </div>
    </div>
  );
}
