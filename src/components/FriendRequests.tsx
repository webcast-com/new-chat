import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { UserPlus, Check, X, Loader2, Users } from 'lucide-react';
import AuthPrompt from './AuthPrompt';
import MessageButton from './MessageButton';

interface FriendRequest {
  id: string;
  requester: Profile;
  status: string;
  created_at: string;
}

interface Friendship {
  id: string;
  friend: Profile;
  status: string;
  created_at: string;
}

export default function FriendRequests() {
  const { user, profile } = useAuth();
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'friends'>('incoming');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get incoming friend requests (where current user is recipient)
      const { data: incoming } = await supabase
        .from('friendships')
        .select('id, status, created_at, requester_id')
        .eq('recipient_id', profile.id)
        .eq('status', 'pending');

      // Get outgoing friend requests (where current user is requester)
      const { data: outgoing } = await supabase
        .from('friendships')
        .select('id, status, created_at, recipient_id')
        .eq('requester_id', profile.id)
        .eq('status', 'pending');

      // Get accepted friendships
      const { data: acceptedAsRequester } = await supabase
        .from('friendships')
        .select('id, status, created_at, recipient_id')
        .eq('requester_id', profile.id)
        .eq('status', 'accepted');

      const { data: acceptedAsRecipient } = await supabase
        .from('friendships')
        .select('id, status, created_at, requester_id')
        .eq('recipient_id', profile.id)
        .eq('status', 'accepted');

      // Fetch profiles for incoming requests
      if (incoming && incoming.length > 0) {
        const requesterIds = incoming.map(r => r.requester_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', requesterIds);

        const incomingWithProfiles = incoming.map(req => ({
          id: req.id,
          status: req.status,
          created_at: req.created_at,
          requester: profiles?.find(p => p.id === req.requester_id) as Profile
        })).filter(r => r.requester);

        setIncomingRequests(incomingWithProfiles);
      } else {
        setIncomingRequests([]);
      }

      // Fetch profiles for outgoing requests
      if (outgoing && outgoing.length > 0) {
        const recipientIds = outgoing.map(r => r.recipient_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', recipientIds);

        const outgoingWithProfiles = outgoing.map(req => ({
          id: req.id,
          status: req.status,
          created_at: req.created_at,
          requester: profiles?.find(p => p.id === req.recipient_id) as Profile
        })).filter(r => r.requester);

        setOutgoingRequests(outgoingWithProfiles);
      } else {
        setOutgoingRequests([]);
      }

      // Build friends list
      const friendsList: Friendship[] = [];

      if (acceptedAsRequester && acceptedAsRequester.length > 0) {
        const recipientIds = acceptedAsRequester.map(r => r.recipient_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', recipientIds);

        acceptedAsRequester.forEach(f => {
          const friendProfile = profiles?.find(p => p.id === f.recipient_id);
          if (friendProfile) {
            friendsList.push({
              id: f.id,
              friend: friendProfile,
              status: f.status,
              created_at: f.created_at
            });
          }
        });
      }

      if (acceptedAsRecipient && acceptedAsRecipient.length > 0) {
        const requesterIds = acceptedAsRecipient.map(r => r.requester_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', requesterIds);

        acceptedAsRecipient.forEach(f => {
          const friendProfile = profiles?.find(p => p.id === f.requester_id);
          if (friendProfile) {
            friendsList.push({
              id: f.id,
              friend: friendProfile,
              status: f.status,
              created_at: f.created_at
            });
          }
        });
      }

      setFriends(friendsList);
    } catch (error) {
      console.error('Error loading friend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    if (!profile || actionLoading) return;

    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!profile || actionLoading) return;

    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!profile || actionLoading) return;

    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setOutgoingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error canceling friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!profile || actionLoading) return;

    setActionLoading(friendshipId);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      setFriends(prev => prev.filter(f => f.id !== friendshipId));
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

  const tabs = [
    { id: 'incoming' as const, label: 'Incoming', count: incomingRequests.length, icon: UserPlus },
    { id: 'outgoing' as const, label: 'Sent', count: outgoingRequests.length, icon: Users },
    { id: 'friends' as const, label: 'Friends', count: friends.length, icon: Check },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200 p-4 sm:p-6">
        <h2 className="text-xl font-bold sm:text-2xl text-slate-900">Friends</h2>
        <p className="text-slate-600 text-sm mt-1">Manage your friend requests and connections</p>
      </div>

      <div className="flex border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex min-h-12 flex-1 items-center justify-center gap-1 px-2 py-3 text-xs font-medium sm:gap-2 sm:px-4 sm:text-sm transition-all ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                tab.id === 'incoming'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === 'incoming' && (
          <>
            {incomingRequests.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No pending friend requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomingRequests.map(request => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-lg overflow-hidden">
                        {request.requester.avatar_url ? (
                          <img src={request.requester.avatar_url} alt={request.requester.username} className="w-full h-full object-cover" />
                        ) : (
                          request.requester.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{request.requester.full_name || request.requester.username}</p>
                        <p className="text-sm text-slate-500">@{request.requester.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        disabled={actionLoading === request.id}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50"
                      >
                        {actionLoading === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="hidden sm:inline">Accept</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={actionLoading === request.id}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">Decline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'outgoing' && (
          <>
            {outgoingRequests.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <UserPlus className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No pending sent requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {outgoingRequests.map(request => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-lg overflow-hidden">
                        {request.requester.avatar_url ? (
                          <img src={request.requester.avatar_url} alt={request.requester.username} className="w-full h-full object-cover" />
                        ) : (
                          request.requester.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{request.requester.full_name || request.requester.username}</p>
                        <p className="text-sm text-slate-500">@{request.requester.username}</p>
                        <p className="text-xs text-slate-400">Request pending</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelRequest(request.id)}
                      disabled={actionLoading === request.id}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all disabled:opacity-50"
                    >
                      {actionLoading === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          <span className="hidden sm:inline">Cancel</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'friends' && (
          <>
            {friends.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>You haven't added any friends yet</p>
                <p className="text-sm text-slate-500 mt-1">Discover people to send friend requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map(friendship => (
                  <div
                    key={friendship.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-lg overflow-hidden">
                        {friendship.friend.avatar_url ? (
                          <img src={friendship.friend.avatar_url} alt={friendship.friend.username} className="w-full h-full object-cover" />
                        ) : (
                          friendship.friend.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{friendship.friend.full_name || friendship.friend.username}</p>
                        <p className="text-sm text-slate-500">@{friendship.friend.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageButton userId={friendship.friend.id} username={friendship.friend.username} />
                      <button
                        onClick={() => handleRemoveFriend(friendship.id)}
                        disabled={actionLoading === friendship.id}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all disabled:opacity-50"
                      >
                        {actionLoading === friendship.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <X className="w-4 h-4" />
                            <span className="hidden sm:inline">Remove</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <AuthPrompt isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} action="manage friends" />
    </div>
  );
}
