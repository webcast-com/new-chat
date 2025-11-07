import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { UserPlus, Check, X, Loader2 } from 'lucide-react';

export default function PeopleDiscovery() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [friendRequests, setFriendRequests] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    try {
      const [usersData, requestsData] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .neq('id', profile.id),
        supabase
          .from('friendships')
          .select('recipient_id')
          .eq('requester_id', profile.id)
          .eq('status', 'pending'),
      ]);

      if (usersData.data) setUsers(usersData.data);
      if (requestsData.data) {
        setFriendRequests(new Set(requestsData.data.map((r) => r.recipient_id)));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    if (!profile || actionLoading) return;

    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('friendships')
        .insert([{ requester_id: profile.id, recipient_id: userId, status: 'pending' }]);

      if (error) throw error;

      setFriendRequests((prev) => new Set([...prev, userId]));
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (userId: string) => {
    if (!profile || actionLoading) return;

    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('requester_id', profile.id)
        .eq('recipient_id', userId);

      if (error) throw error;

      setFriendRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (error) {
      console.error('Error canceling request:', error);
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Discover People</h2>

      {users.length === 0 ? (
        <p className="text-slate-600 text-center py-8">No users available.</p>
      ) : (
        <div className="space-y-4">
          {users.map((user) => {
            const hasRequested = friendRequests.has(user.id);
            const isLoading = actionLoading === user.id;

            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {user.full_name || user.username}
                    </h3>
                    <p className="text-slate-600 text-sm">@{user.username}</p>
                    {user.bio && (
                      <p className="text-slate-600 text-sm mt-1 line-clamp-1">{user.bio}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    hasRequested
                      ? handleCancelRequest(user.id)
                      : handleSendRequest(user.id)
                  }
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 flex-shrink-0 ml-2 ${
                    hasRequested
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : hasRequested ? (
                    <>
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Cancel</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
