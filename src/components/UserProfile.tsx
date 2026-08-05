import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { useRef } from 'react';
import { kenyaLocations } from '../data/kenyaLocations';
import { detectCountyFromCoords, isValidKenyaPoint, reverseGeocode, suggestConstituency } from '../lib/geo';
import { CreditCard as Edit2, Check, X, Loader2, Users, Search, ArrowUpDown, Camera, LocateFixed } from 'lucide-react';
import LazyImage from './LazyImage';
import ProfileShareButton from './ProfileShareButton';

export default function UserProfile() {
  const { profile, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [county, setCounty] = useState('');
  const [constituency, setConstituency] = useState('');
  // Phase 6 — GPS auto-detect
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState('');
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    location: '',
    age: '',
    work: '',
    education: '',
    gender: '',
  });
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState({ posts: 0, friends: 0, following: 0, followers: 0 });
  const [following, setFollowing] = useState<Profile[]>([]);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [connectionView, setConnectionView] = useState<'following' | 'followers'>('following');
  const [connectionSearch, setConnectionSearch] = useState('');
  const [connectionSort, setConnectionSort] = useState<'recent' | 'name'>('recent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name,
        bio: profile.bio,
        location: profile.location || '',
        age: profile.age?.toString() || '',
        work: profile.work || '',
        education: profile.education || '',
        gender: profile.gender || '',
      });
      const [savedConstituency = '', savedCounty = ''] = (profile.location || '').split(', ').map((value) => value.trim());
      const selectedCounty = profile.county || savedCounty;
      const selectedConstituency = profile.constituency || savedConstituency;
      if (kenyaLocations[selectedCounty]?.includes(selectedConstituency)) {
        setCounty(selectedCounty);
        setConstituency(selectedConstituency);
      } else if (kenyaLocations[selectedCounty]) {
        setCounty(selectedCounty);
        setConstituency('');
      } else {
        setCounty('');
        setConstituency('');
      }
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

  // Phase 6 — GPS auto-detect: ask for the browser location, map it to the
  // nearest Kenya county, and pre-fill the county/constituency selects.
  const handleDetectLocation = async () => {
    setDetectingLocation(true);
    setLocationNotice('');
    try {
      if (!('geolocation' in navigator)) {
        setLocationNotice('Geolocation is not supported in this browser.');
        return;
      }
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 300000,
        });
      });
      const { latitude, longitude } = position.coords;
      const point = { lat: latitude, lng: longitude };
      if (!isValidKenyaPoint(point)) {
        setLocationNotice('Your location appears to be outside Kenya — choose your county manually.');
        return;
      }
      const detected = detectCountyFromCoords(latitude, longitude);
      if (!detected) {
        setLocationNotice('Could not map your coordinates to a Kenya county — choose manually.');
        return;
      }
      setCounty(detected.county);
      setConstituency(suggestConstituency(detected.county, point) || '');

      // Best-effort: enrich from public reverse geocoding (no key needed).
      const geo = await reverseGeocode(point);
      if (geo.county && kenyaLocations[geo.county]) setCounty(geo.county);
      if (geo.city) {
        const match = kenyaLocations[geo.county || detected.county]?.find(
          (c) => c.toLowerCase().includes(geo.city!.toLowerCase()) || geo.city!.toLowerCase().includes(c.toLowerCase())
        );
        if (match) setConstituency(match);
      }
      setLocationNotice(`Detected: ${geo.county || detected.county}${geo.city ? ` (${geo.city})` : ''}. Confirm and save.`);
    } catch (error) {
      const message = (error as { code?: number })?.code === 1
        ? 'Location permission denied — enable location in your browser or choose manually.'
        : 'Unable to detect your location.';
      setLocationNotice(message);
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    const selectedLocation = constituency && county ? `${constituency}, ${county}` : county || null;

    // Phase 6 — when a location is set and we don't already have GPS, clear
    // stale coordinates (the "Detect my location" flow sets them; manual picks
    // without GPS should not keep old readings).
    const hasDetectedCoords = profile.lat != null && profile.lng != null && county === profile.county;
    const lat = hasDetectedCoords ? profile.lat : null;
    const lng = hasDetectedCoords ? profile.lng : null;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name,
          bio: editForm.bio,
          location: selectedLocation,
          county: county || null,
          constituency: constituency || null,
          lat,
          lng,
          location_updated_at: lat != null ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      if (!user) throw new Error('Your session has expired. Please sign in again.');

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          profile_details: {
            location: selectedLocation,
            county: county || null,
            constituency: constituency || null,
            age: editForm.age ? Number(editForm.age) : null,
            work: editForm.work || null,
            education: editForm.education || null,
            gender: editForm.gender || null,
          },
        },
      });

      if (metadataError) throw metadataError;
      setEditing(false);
      window.location.reload();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Error updating profile:', message);
      window.alert(`Unable to update profile: ${message}`);
    }
  };

  const handlePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert('Image must be smaller than 5MB.');
      return;
    }

    setUploadingPicture(true);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `${profile.id}/profile.${extension}`;
      const { error: uploadError } = await supabase.storage.from('profile-pictures').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('profiles').update({
        avatar_url: `${data.publicUrl}?v=${Date.now()}`,
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id);
      if (updateError) throw updateError;
      window.location.reload();
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setPreviewUrl(null);
      window.alert('Unable to update your profile picture.');
    } finally {
      setUploadingPicture(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  const activeConnections = [...(connectionView === 'following' ? following : followers)]
    .filter((connection) => {
      const query = connectionSearch.trim().toLowerCase();
      return !query || [connection.username, connection.full_name, connection.bio]
        .some((value) => value?.toLowerCase().includes(query));
    })
    .sort((a, b) => connectionSort === 'name'
      ? (a.full_name || a.username).localeCompare(b.full_name || b.username)
      : 0);

  return (
    <div className="bg-white/95 rounded-2xl shadow-xl shadow-indigo-100/60 border border-indigo-100 overflow-hidden">
      <div className="h-32 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500"></div>
      <div className="px-6 pb-6">
        <div className="flex justify-between items-start -mt-12 mb-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-xl overflow-hidden">
              {previewUrl || profile?.avatar_url ? (
                <LazyImage src={previewUrl || profile?.avatar_url || ''} alt={profile?.username || 'Profile picture'} className="w-24 h-24" />
              ) : (
                <span>{profile?.username.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPicture} className="absolute bottom-0 right-0 rounded-full bg-violet-600 p-2 text-white shadow-lg transition hover:bg-violet-700 disabled:opacity-50" aria-label="Upload profile picture">
              {uploadingPicture ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePictureUpload} className="hidden" />
          </div>
          {!editing ? (
            <div className="mt-14 flex gap-2">
              <ProfileShareButton username={profile?.username || ''} fullName={profile?.full_name || ''} />
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-indigo-700 transition-all hover:bg-indigo-100"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className="text-sm font-medium text-slate-700">County</label>
                  <button
                    type="button"
                    onClick={() => void handleDetectLocation()}
                    disabled={detectingLocation}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-100 disabled:opacity-50"
                  >
                    {detectingLocation ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                    {detectingLocation ? 'Detecting…' : 'Detect my location'}
                  </button>
                </div>
                {locationNotice && (
                  <p className={`mb-2 rounded-lg px-3 py-1.5 text-xs ${locationNotice.startsWith('Detected') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {locationNotice}
                  </p>
                )}
                <select value={county} onChange={(e) => { setCounty(e.target.value); setConstituency(''); }} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"><option value="">Select county</option>{Object.keys(kenyaLocations).map((countyName) => <option key={countyName} value={countyName}>{countyName}</option>)}</select>
              </div>
              <label className="text-sm font-medium text-slate-700">Constituency<select value={constituency} onChange={(e) => setConstituency(e.target.value)} disabled={!county} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 font-normal outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"><option value="">{county ? 'Select constituency' : 'Choose county first'}</option>{county && kenyaLocations[county].map((constituencyName) => <option key={constituencyName} value={constituencyName}>{constituencyName}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">Age<input type="number" min="13" max="120" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} placeholder="Age" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" /></label>
              <label className="text-sm font-medium text-slate-700">Work<input type="text" value={editForm.work} onChange={(e) => setEditForm({ ...editForm, work: e.target.value })} placeholder="Company or role" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" /></label>
              <label className="text-sm font-medium text-slate-700">Education<input type="text" value={editForm.education} onChange={(e) => setEditForm({ ...editForm, education: e.target.value })} placeholder="School or institution" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200" /></label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Gender<select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"><option value="">Prefer not to say</option><option>Woman</option><option>Man</option><option>Non-binary</option><option>Another identity</option></select></label>
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
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
              {profile?.location && <span className="rounded-full bg-indigo-50 px-3 py-1">{profile.location}</span>}
              {profile?.work && <span className="rounded-full bg-indigo-50 px-3 py-1">Works at {profile.work}</span>}
              {profile?.education && <span className="rounded-full bg-indigo-50 px-3 py-1">Studied at {profile.education}</span>}
              {profile?.age && <span className="rounded-full bg-indigo-50 px-3 py-1">{profile.age} years old</span>}
              {profile?.gender && <span className="rounded-full bg-indigo-50 px-3 py-1">{profile.gender}</span>}
            </div>
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
          <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-600" />
              <h2 className="font-bold text-slate-900">
                {connectionView === 'following' ? 'Following' : 'Followers'}
              </h2>
            </div>
            <div className="flex gap-2">
              <label className="relative flex-1 sm:w-52">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <span className="sr-only">Search {connectionView}</span>
                <input
                  type="search"
                  value={connectionSearch}
                  onChange={(event) => setConnectionSearch(event.target.value)}
                  placeholder="Search people"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                />
              </label>
              <label className="relative">
                <ArrowUpDown className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <span className="sr-only">Sort {connectionView}</span>
                <select
                  value={connectionSort}
                  onChange={(event) => setConnectionSort(event.target.value as 'recent' | 'name')}
                  className="h-9 rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                >
                  <option value="recent">Recent</option>
                  <option value="name">Name</option>
                </select>
              </label>
            </div>
          </div>
          {(connectionView === 'following' ? following : followers).length === 0 ? (
            <p className="text-sm text-slate-500">No {connectionView} yet.</p>
          ) : activeConnections.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No people match your search.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeConnections.map((connection) => (
                <div key={connection.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold text-white">
                    {connection.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {connection.full_name || connection.username}
                    </p>
                    <p className="truncate text-sm text-slate-500">@{connection.username}</p>
                    {connection.bio && <p className="mt-1 truncate text-xs text-slate-500">{connection.bio}</p>}
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
