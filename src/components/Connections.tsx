import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import AuthPrompt from './AuthPrompt';

export default function Connections() {
  const { user, profile } = useAuth();
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    try {
      const [usersData, connectionsData] = await Promise.all([
        supabase.from('profiles').select('*').neq('id', profile.id),
        supabase.from('connections').select('following_id').eq('follower_id', profile.id),
      ]);

      if (usersData.data) setAllUsers(usersData.data);
      if (connectionsData.data) {
        setFollowing(new Set(connectionsData.data.map((c) => c.following_id)));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    if (!profile || actionLoading) return;

    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('connections')
        .insert([{ follower_id: profile.id, following_id: userId }]);

      if (error) throw error;

      setFollowing((prev) => new Set([...prev, userId]));
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!profile || actionLoading) return;

    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('follower_id', profile.id)
        .eq('following_id', userId);

      if (error) throw error;

      setFollowing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (error) {
      console.error('Error unfollowing user:', error);
    } finally {
      setActionLoading(null);
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
    <>
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Discover People</h2>

          {allUsers.length === 0 ? (
            <p className="text-slate-600 text-center py-8">No other users yet.</p>
          ) : (
            <div className="space-y-4">
              {allUsers.map((discoveredUser) => {
                const isFollowing = following.has(discoveredUser.id);
                const isLoading = actionLoading === discoveredUser.id;

                return (
                  <div
                    key={discoveredUser.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-lg">
                        {discoveredUser.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {discoveredUser.full_name || discoveredUser.username}
                        </h3>
                        <p className="text-slate-600 text-sm">@{discoveredUser.username}</p>
                        {discoveredUser.bio && (
                          <p className="text-slate-600 text-sm mt-1 line-clamp-1">{discoveredUser.bio}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        isFollowing ? handleUnfollow(discoveredUser.id) : handleFollow(discoveredUser.id)
                      }
                      disabled={isLoading || !user}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 ${
                        isFollowing
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-md hover:shadow-lg'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isFollowing ? (
                        <>
                          <UserMinus className="w-4 h-4" />
                          <span>Unfollow</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <AuthPrompt isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} action="follow users" />
    </>
  );
}
