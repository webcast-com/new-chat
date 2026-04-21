import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { CreditCard as Edit2, Check, X, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import LazyImage from './LazyImage';

export default function UserProfile() {
  const { profile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
  });
  const [stats, setStats] = useState({ posts: 0, friends: 0 });
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

    const [postsData, friendsData] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
      supabase.from('friendships').select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},recipient_id.eq.${profile.id}`),
    ]);

    setStats({
      posts: postsData.count || 0,
      friends: friendsData.count || 0,
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="h-32 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
      <div className="px-6 pb-6">
        <div className="flex justify-between items-start -mt-12 mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-xl overflow-hidden">
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
              className="mt-14 flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="mt-14 flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
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
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
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

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{stats.posts}</div>
            <div className="text-sm text-slate-600">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{stats.friends}</div>
            <div className="text-sm text-slate-600">Friends</div>
          </div>
        </div>
      </div>
    </div>
  );
}
