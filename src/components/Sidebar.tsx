import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Home, Users, CircleUser as UserCircle, LogOut, TrendingUp } from 'lucide-react';

interface SidebarProps {
  activeView: 'feed' | 'profile' | 'connections' | 'trending';
  onViewChange: (view: 'feed' | 'profile' | 'connections' | 'trending') => void;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState({ posts: 0, following: 0, followers: 0 });

  useEffect(() => {
    loadStats();
  }, [profile]);

  const loadStats = async () => {
    if (!profile) return;

    const [postsData, followingData, followersData] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
      supabase.from('connections').select('id', { count: 'exact', head: true }).eq('follower_id', profile.id),
      supabase.from('connections').select('id', { count: 'exact', head: true }).eq('following_id', profile.id),
    ]);

    setStats({
      posts: postsData.count || 0,
      following: followingData.count || 0,
      followers: followersData.count || 0,
    });
  };

  const menuItems = [
    { id: 'feed' as const, icon: Home, label: 'Home' },
    { id: 'trending' as const, icon: TrendingUp, label: 'Trending' },
    { id: 'connections' as const, icon: Users, label: 'Connections' },
    { id: 'profile' as const, icon: UserCircle, label: 'Profile' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-6">
      <div className="flex flex-col items-center mb-6 pb-6 border-b border-slate-200">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl mb-3">
          {profile?.username.charAt(0).toUpperCase()}
        </div>
        <h3 className="font-bold text-slate-900 text-lg">{profile?.username}</h3>
        <p className="text-slate-600 text-sm mt-1">{profile?.bio || 'No bio yet'}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-200">
        <div className="text-center">
          <div className="font-bold text-slate-900 text-xl">{stats.posts}</div>
          <div className="text-slate-600 text-xs">Posts</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-slate-900 text-xl">{stats.followers}</div>
          <div className="text-slate-600 text-xs">Followers</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-slate-900 text-xl">{stats.following}</div>
          <div className="text-slate-600 text-xs">Following</div>
        </div>
      </div>

      <nav className="space-y-2 mb-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        onClick={signOut}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
      >
        <LogOut className="w-5 h-5" />
        <span className="font-medium">Sign Out</span>
      </button>
    </div>
  );
}
