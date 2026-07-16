import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { UserPlus, UserMinus, Loader2, Search, Users } from 'lucide-react';
import MessageButton from './MessageButton';
import AuthPrompt from './AuthPrompt';

interface PeopleDiscoveryProps {
  onStartMessage?: (userId: string) => void;
}

type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'following';

interface UserWithStatus extends Profile {
  friendStatus: FriendStatus;
  friendshipId?: string;
}

export default function PeopleDiscovery({ onStartMessage }: PeopleDiscoveryProps) {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(users.filter(u =>
        u.username.toLowerCase().includes(query) ||
        (u.full_name?.toLowerCase().includes(query))
      ));
    }
  }, [searchQuery, users]);

  const loadData = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get all users except current user
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profile.id);

      if (usersError) throw usersError;

      // Get friendships where user is requester
      const { data: sentRequests } = await supabase
        .from('friendships')
        .select('id, recipient_id, status')
        .eq('requester_id', profile.id);

      // Get friendships where user is recipient
      const { data: receivedRequests } = await supabase
        .from('friendships')
        .select('id, requester_id, status')
        .eq('recipient_id', profile.id);

      // Get connections (following)
      const { data: following } = await supabase
        .from('connections')
        .select('following_id')
        .eq('follower_id', profile.id);

      const sentMap = new Map(sentRequests?.map(r => [r.recipient_id, { id: r.id, status: r.status }]) || []);
      const receivedMap = new Map(receivedRequests?.map(r => [r.requester_id, { id: r.id, status: r.status }]) || []);
      const followingSet = new Set(following?.map(f => f.following_id) || []);

      // Combine data
      const usersWithStatus: UserWithStatus[] = (allUsers || []).map(u => {
        let friendStatus: FriendStatus = 'none';
        let friendshipId: string | undefined;

        if (sentMap.has(u.id)) {
          const sent = sentMap.get(u.id)!;
          if (sent.status === 'accepted') {
            friendStatus = 'friends';
          } else {
            friendStatus = 'pending_sent';
          }
          friendshipId = sent.id;
        } else if (receivedMap.has(u.id)) {
          const received = receivedMap.get(u.id)!;
          if (received.status === 'accepted') {
            friendStatus = 'friends';
          } else {
            friendStatus = 'pending_received';
          }
          friendshipId = received.id;
        } else if (followingSet.has(u.id)) {
          friendStatus = 'following';
        }

        return { ...u, friendStatus, friendshipId };
      });

      setUsers(usersWithStatus);
      setFilteredUsers(usersWithStatus);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    if (!profile || actionLoading) return;

    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('friendships')
        .insert([{ requester_id: profile.id, recipient_id: userId, status: 'pending' }]);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (userId: string, friendshipId?: string) => {
    if (!profile || actionLoading || !friendshipId) return;

    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error canceling request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = async (userId: string, friendshipId?: string) => {
    if (!profile || actionLoading || !friendshipId) return;

    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', friendshipId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setActionLoading(null);
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
      await loadData();
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
      await loadData();
    } catch (error) {
      console.error('Error unfollowing user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (userId: string, friendshipId?: string) => {
    if (!profile || actionLoading || !friendshipId) return;

    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setActionLoading(null);
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Discover People</h2>
          <p className="text-slate-600 text-sm">Find and connect with others</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-600">No users found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((discoveredUser) => {
            const isLoading = actionLoading === discoveredUser.id;

            return (
              <div
                key={discoveredUser.id}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 overflow-hidden">
                    {discoveredUser.avatar_url ? (
                      <img src={discoveredUser.avatar_url} alt={discoveredUser.username} className="w-full h-full object-cover" />
                    ) : (
                      discoveredUser.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {discoveredUser.full_name || discoveredUser.username}
                    </h3>
                    <p className="text-slate-600 text-sm">@{discoveredUser.username}</p>
                    {discoveredUser.bio && (
                      <p className="text-slate-600 text-sm mt-1 line-clamp-1">{discoveredUser.bio}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <MessageButton
                    userId={discoveredUser.id}
                    username={discoveredUser.username}
                    onClick={onStartMessage || (() => {})}
                  />

                  {discoveredUser.friendStatus === 'friends' && (
                    <button
                      onClick={() => handleRemoveFriend(discoveredUser.id, discoveredUser.friendshipId)}
                      disabled={isLoading || !user}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all disabled:opacity-50 bg-green-100 text-green-700 hover:bg-green-200"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                      <span className="hidden sm:inline">Friends</span>
                    </button>
                  )}

                  {discoveredUser.friendStatus === 'pending_sent' && (
                    <button
                      onClick={() => handleCancelRequest(discoveredUser.id, discoveredUser.friendshipId)}
                      disabled={isLoading || !user}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all disabled:opacity-50 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel'}
                    </button>
                  )}

                  {discoveredUser.friendStatus === 'pending_received' && (
                    <>
                      <button
                        onClick={() => handleAcceptRequest(discoveredUser.id, discoveredUser.friendshipId)}
                        disabled={isLoading || !user}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all disabled:opacity-50 bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-md"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept'}
                      </button>
                    </>
                  )}

                  {discoveredUser.friendStatus === 'following' && (
                    <button
                      onClick={() => handleUnfollow(discoveredUser.id)}
                      disabled={isLoading || !user}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all disabled:opacity-50 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
                      <span className="hidden sm:inline">Following</span>
                    </button>
                  )}

                  {discoveredUser.friendStatus === 'none' && (
                    <>
                      <button
                        onClick={() => handleFollow(discoveredUser.id)}
                        disabled={isLoading || !user}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all disabled:opacity-50 bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        <span className="hidden sm:inline">Follow</span>
                      </button>
                      <button
                        onClick={() => handleSendRequest(discoveredUser.id)}
                        disabled={isLoading || !user}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all disabled:opacity-50 bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-md"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        <span className="hidden sm:inline">Add Friend</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AuthPrompt isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} action="connect with users" />
    </div>
  );
}
