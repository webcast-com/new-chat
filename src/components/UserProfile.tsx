import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { CreditCard as Edit2, Check, X, Loader2, Users } from 'lucide-react';
import LazyImage from './LazyImage';

export default function UserProfile() {
  const { profile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
  });
  const [stats, setStats] = useState({ posts: 0, friends: 0, following: 0, followers: 0 });
  const [following, setFollowing] = useState<Profile[]>([]);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [connectionView, setConnectionView] = useState<'following' | 'followers'>('following');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name,
        bio: profile.bio,
      });
      loadStats();
    }
  }, [profile]);

  const loadStats = async () => {
    if (!profile) return;

    const [postsData, friendsData, followingData, followerData] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
      supabase.from('friendships').select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`),
      supabase.from('connections').select('following_id').eq('follower_id', profile.id),
      supabase.from('connections').select('follower_id').eq('following_id', profile.id),
    ]);

    const followingIds = followingData.data?.map((connection) => connection.following_id) || [];
    const followerIds = followerData.data?.map((connection) => connection.follower_id) || [];
    const [followingProfiles, followerProfiles] = await Promise.all([
      followingIds.length > 0
        ? supabase.from('profiles').select('*').in('id', followingIds)
        : Promise.resolve({ data: [], error: null }),
      followerIds.length > 0
        ? supabase.from('profiles').select('*').in('id', followerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (followingProfiles.error) throw followingProfiles.error;
    if (followerProfiles.error) throw followerProfiles.error;

    setFollowing(followingProfiles.data || []);
    setFollowers(followerProfiles.data || []);
    setStats({
      posts: postsData.count || 0,
      friends: friendsData.count || 0,
      following: followingIds.length,
      followers: followerIds.length,
    });
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          bio: editForm.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      setEditing(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="bg-white/95 rounded-2xl shadow-xl shadow-indigo-100/60 border border-indigo-100 overflow-hidden">
      <div className="h-32 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500"></div>
      <div className="px-6 pb-6">
        <div className="flex justify-between items-start -mt-12 mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-xl overflow-hidden">
            {profile?.avatar_url ? (
              <LazyImage
                src={profile.avatar_url}
                alt={profile.username}
                className="w-24 h-24"
              />
            ) : (
              <span>{profile?.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="mt-14 flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-all"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="mt-14 flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200/60"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all outline-none resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <h1 className="text-2xl font-bold text-slate-900">
              {profile?.full_name || profile?.username}
            </h1>
            <p className="text-slate-600 mt-1">@{profile?.username}</p>
            {profile?.bio && (
              <p className="text-slate-700 mt-3 leading-relaxed">{profile.bio}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{stats.posts}</div>
            <div className="text-sm text-slate-600">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{stats.friends}</div>
            <div className="text-sm text-slate-600">Friends</div>
          </div>
          <button
            onClick={() => setConnectionView('following')}
            className={`text-center rounded-lg transition-colors ${connectionView === 'following' ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
          >
            <div className="text-2xl font-bold text-slate-900">{stats.following}</div>
            <div className="text-sm text-slate-600">Following</div>
          </button>
          <button
            onClick={() => setConnectionView('followers')}
            className={`text-center rounded-lg transition-colors ${connectionView === 'followers' ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
          >
            <div className="text-2xl font-bold text-slate-900">{stats.followers}</div>
            <div className="text-sm text-slate-600">Followers</div>
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-violet-600" />
            <h2 className="font-bold text-slate-900">
              {connectionView === 'following' ? 'Following' : 'Followers'}
            </h2>
          </div>
          {(connectionView === 'following' ? following : followers).length === 0 ? (
            <p className="text-sm text-slate-500">No {connectionView} yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(connectionView === 'following' ? following : followers).map((connection) => (
                <div key={connection.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold">
                    {connection.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {connection.full_name || connection.username}
                    </p>
                    <p className="text-sm text-slate-500 truncate">@{connection.username}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
