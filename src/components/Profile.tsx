import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Post } from '../lib/supabase';
import PostCard from './PostCard';
import { CreditCard as Edit2, Check, X, Loader2 } from 'lucide-react';

export default function Profile() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
  });

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name,
        bio: profile.bio,
      });
      loadUserPosts();
    }
  }, [profile]);

  const loadUserPosts = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
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

  const handleCancel = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      bio: profile?.bio || '',
    });
    setEditing(false);
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
        <div className="px-6 pb-6">
          <div className="flex justify-between items-start -mt-12 mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-xl">
              {profile?.username.charAt(0).toUpperCase()}
            </div>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="mt-14 flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
              >
                <Edit2 className="w-4 h-4" />
                <span className="font-medium">Edit Profile</span>
              </button>
            ) : (
              <div className="mt-14 flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span className="font-medium">Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                  <span className="font-medium">Cancel</span>
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={profile?.username}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                  placeholder="Tell us about yourself"
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
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Your Posts</h2>
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-600">You haven't posted anything yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onUpdate={loadUserPosts} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
