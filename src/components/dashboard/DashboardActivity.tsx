import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Heart, MessageCircle, UserPlus, FileText, Loader2 } from 'lucide-react';

type ActivityItem = {
  id: string;
  type: 'post' | 'like' | 'comment' | 'follow';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
};

export default function DashboardActivity() {
  const { profile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadActivities();
    }
  }, [profile]);

  const loadActivities = async () => {
    if (!profile) return;

    try {
      const [postsRes, commentsRes, likesRes, connectionsRes] = await Promise.all([
        supabase
          .from('posts')
          .select('id, content, created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('comments')
          .select('id, content, created_at, posts(content)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('likes')
          .select('id, posts(content), created_at')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('connections')
          .select('id, created_at')
          .eq('follower_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const activityList: ActivityItem[] = [];

      postsRes.data?.forEach((post) => {
        activityList.push({
          id: post.id,
          type: 'post',
          title: 'Posted',
          description: post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''),
          timestamp: post.created_at,
          icon: <FileText className="w-4 h-4" />,
          color: 'bg-blue-100 text-blue-600',
        });
      });

      commentsRes.data?.forEach((comment) => {
        activityList.push({
          id: comment.id,
          type: 'comment',
          title: 'Commented',
          description: comment.content.substring(0, 60) + (comment.content.length > 60 ? '...' : ''),
          timestamp: comment.created_at,
          icon: <MessageCircle className="w-4 h-4" />,
          color: 'bg-green-100 text-green-600',
        });
      });

      likesRes.data?.forEach((like) => {
        activityList.push({
          id: like.id,
          type: 'like',
          title: 'Liked a post',
          description: like.posts?.[0]?.content?.substring(0, 60) || 'a post',
          timestamp: like.created_at,
          icon: <Heart className="w-4 h-4" />,
          color: 'bg-red-100 text-red-600',
        });
      });

      connectionsRes.data?.forEach((connection) => {
        activityList.push({
          id: connection.id,
          type: 'follow',
          title: 'Started following',
          description: 'a new user',
          timestamp: connection.created_at,
          icon: <UserPlus className="w-4 h-4" />,
          color: 'bg-purple-100 text-purple-600',
        });
      });

      activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(activityList.slice(0, 50));
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-600">No activities yet. Start engaging!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4">
                <div className={`${activity.color} p-2 rounded-lg h-fit`}>
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{activity.title}</p>
                  <p className="text-slate-600 text-sm truncate">{activity.description}</p>
                  <p className="text-xs text-slate-500 mt-2">{formatDate(activity.timestamp)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
