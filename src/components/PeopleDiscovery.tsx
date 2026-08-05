import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { UserPlus, UserMinus, Loader2, MapPin, Navigation, Search, Users } from 'lucide-react';
import MessageButton from './MessageButton';
import { distanceKm, formatDistanceKm } from '../lib/geo';
import AuthPrompt from './AuthPrompt';

interface PeopleDiscoveryProps {
  onStartMessage?: (userId: string) => void;
}

type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'following';
type DiscoveryScope = 'all' | 'county' | 'constituency' | 'near';
type GenderFilter = 'any' | 'woman' | 'man' | 'non-binary';
type AgeFilter = 'any' | '18-24' | '25-34' | '35-44' | '45+';

interface UserWithStatus extends Profile {
  friendStatus: FriendStatus;
  friendshipId?: string;
}

/** Profiles store gender as 'Woman' | 'Man' | 'Non-binary' | '' — normalize for matching. */
function normalizeGender(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function matchesAgeFilter(age: number | null | undefined, filter: AgeFilter): boolean {
  if (filter === 'any' || age == null) return filter === 'any';
  switch (filter) {
    case '18-24': return age >= 18 && age <= 24;
    case '25-34': return age >= 25 && age <= 34;
    case '35-44': return age >= 35 && age <= 44;
    case '45+': return age >= 45;
    default: return true;
  }
}

export default function PeopleDiscovery({ onStartMessage }: PeopleDiscoveryProps) {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [discoveryScope, setDiscoveryScope] = useState<DiscoveryScope>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('any');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('any');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile]);

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();
    const currentCounty = profile?.county;
    const currentConstituency = profile?.constituency;
    const hasGps = profile?.lat != null && profile?.lng != null;
    setFilteredUsers(users.filter((discoveredUser) => {
      const matchesSearch = !query || discoveredUser.username.toLowerCase().includes(query) ||
        discoveredUser.full_name?.toLowerCase().includes(query) ||
        discoveredUser.county?.toLowerCase().includes(query) ||
        discoveredUser.constituency?.toLowerCase().includes(query);
      const matchesLocation = discoveryScope === 'all' ||
        (discoveryScope === 'county' && Boolean(currentCounty) && discoveredUser.county === currentCounty) ||
        (discoveryScope === 'constituency' && Boolean(currentConstituency) && discoveredUser.county === currentCounty && discoveredUser.constituency === currentConstituency) ||
        (discoveryScope === 'near' && hasGps && discoveredUser.lat != null && discoveredUser.lng != null &&
          distanceKm({ lat: profile.lat!, lng: profile.lng! }, { lat: discoveredUser.lat, lng: discoveredUser.lng }) <= 25);
      const matchesGender = genderFilter === 'any' || normalizeGender(discoveredUser.gender) === genderFilter;
      const matchesAge = matchesAgeFilter(discoveredUser.age, ageFilter);
      return matchesSearch && matchesLocation && matchesGender && matchesAge;
    }).sort((a, b) => {
      // Phase 6 — when in near-me scope, sort by distance ascending.
      if (discoveryScope === 'near' && hasGps) {
        const da = a.lat != null && a.lng != null
          ? distanceKm({ lat: profile.lat!, lng: profile.lng! }, { lat: a.lat, lng: a.lng }) : Infinity;
        const db = b.lat != null && b.lng != null
          ? distanceKm({ lat: profile.lat!, lng: profile.lng! }, { lat: b.lat, lng: b.lng }) : Infinity;
        return da - db;
      }
      return 0;
    }));
  }, [discoveryScope, genderFilter, ageFilter, profile?.county, profile?.constituency, profile?.lat, profile?.lng, searchQuery, users]);

  useEffect(() => {
    setDiscoveryScope(profile?.county ? 'county' : 'all');
  }, [profile?.county]);

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

      <div className="mb-4 flex flex-wrap gap-2">
        {([
          ['all', 'Everyone'],
          ['county', profile?.county ? `In ${profile.county}` : 'My county'],
          ['constituency', profile?.constituency ? `In ${profile.constituency}` : 'My constituency'],
          ['near', 'Near me (25 km)'],
        ] as [DiscoveryScope, string][]).map(([scope, label]) => (
          <button
            key={scope}
            type="button"
            disabled={(scope === 'county' && !profile?.county) || (scope === 'constituency' && !profile?.constituency) || (scope === 'near' && (!profile?.lat || !profile?.lng))}
            onClick={() => setDiscoveryScope(scope)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${discoveryScope === scope ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, username, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
        />
      </div>

      {/* Gender + age filters */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gender</span>
        {([
          ['any', 'Any'],
          ['woman', 'Women'],
          ['man', 'Men'],
          ['non-binary', 'Non-binary'],
        ] as [GenderFilter, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setGenderFilter(value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${genderFilter === value ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</span>
        {([
          ['any', 'Any age'],
          ['18-24', '18–24'],
          ['25-34', '25–34'],
          ['35-44', '35–44'],
          ['45+', '45+'],
        ] as [AgeFilter, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setAgeFilter(value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${ageFilter === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-600">No people found — try adjusting the search, location, gender, or age filters</p>
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
                    {(discoveredUser.constituency || discoveredUser.county) && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-blue-600"><MapPin className="h-3.5 w-3.5" />{[discoveredUser.constituency, discoveredUser.county].filter(Boolean).join(', ')}</p>
                    )}
                    {(discoveredUser.gender || discoveredUser.age) && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs">
                        {discoveredUser.gender && <span className="rounded-full bg-fuchsia-50 px-2 py-0.5 font-medium text-fuchsia-700">{discoveredUser.gender}</span>}
                        {discoveryScope === 'near' && profile?.lat != null && profile.lng != null && discoveredUser.lat != null && discoveredUser.lng != null && (
                          <span className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                            <Navigation className="h-3 w-3" />
                            {formatDistanceKm(distanceKm({ lat: profile.lat, lng: profile.lng }, { lat: discoveredUser.lat, lng: discoveredUser.lng }))}
                          </span>
                        )}
                        {discoveredUser.age != null && <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">{discoveredUser.age} yrs</span>}
                      </p>
                    )}
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
