import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Feed from './components/Feed';
import CreatePost from './components/CreatePost';
import UserProfile from './components/UserProfile';
import PeopleDiscovery from './components/PeopleDiscovery';
import FriendRequests from './components/FriendRequests';
import Messages from './components/Messages';
import Dashboard from './components/Dashboard';
import Contacts from './components/Contacts';
import Trending from './components/Trending';
import FutureEnhancements from './components/FutureEnhancements';
import { Loader2, Home, Users, User, LogOut, Search, Mail, BarChart3, UserPlus, Sparkles, Plus, X, Bell } from 'lucide-react';

function MainApp() {
  const { user, profile, loading, signOut } = useAuth();
  const [activeView, setActiveView] = useState<'feed' | 'profile' | 'people' | 'friends' | 'messages' | 'dashboard' | 'trending' | 'tools'>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-indigo-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-indigo-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-2xl shadow-xl shadow-black/30 w-full max-w-md p-8 text-center border border-zinc-800">
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Profile unavailable</h2>
          <p className="text-slate-600 mb-6">
            We couldn’t load your profile from Supabase. Please sign in again.
          </p>
          <button
            onClick={handleSignOut}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-500 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-violet-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-indigo-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-indigo-950/90 backdrop-blur-md border-b border-violet-900/40 shadow-2xl text-white">
        <div className="flex justify-between items-center px-4 py-1 bg-gradient-to-r from-indigo-950 via-violet-950 to-indigo-950 border-b border-violet-800/30 text-xs">
          <div className="flex items-center space-x-2">
            {['bg-violet-400', 'bg-fuchsia-400', 'bg-indigo-400', 'bg-purple-400', 'bg-violet-300', 'bg-indigo-300'].map((color, i) => (
              <span
                key={color}
                className={`w-2 h-2 rounded-full ${color} animate-pulse shadow-sm shadow-white`}
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
            <span className="ml-2 font-semibold text-violet-200 hidden sm:inline">
              Santa Zoza Nation &bull; Kanashi
            </span>
          </div>
          <span className="text-indigo-200 hidden sm:inline">Connect. Create. Belong.</span>
        </div>

        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setActiveView('feed')}
              className="flex min-w-0 items-center space-x-2 sm:space-x-3 cursor-pointer group text-left"
            >
              <div className="h-9 w-9 shrink-0 rounded-xl sm:h-10 sm:w-10 bg-gradient-to-tr from-indigo-600 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-900/50 group-hover:scale-105 transition-transform">
                <span className="text-2xl">🎅</span>
              </div>
              <div>
                <h1 className="truncate font-extrabold text-sm sm:text-lg tracking-tight bg-gradient-to-r from-violet-200 via-white to-indigo-300 bg-clip-text text-transparent flex items-center gap-1.5">
                  SANTA&apos;S TOY WORKSHOP
                  <Sparkles className="w-4 h-4 text-violet-300 inline animate-spin" style={{ animationDuration: '6s' }} />
                </h1>
                <p className="hidden text-xs text-slate-400 items-center gap-1 md:flex">
                  <span>Elves At Work</span> <span>&bull;</span> <span className="text-violet-300 font-medium">100% Christmas Magic</span>
                </p>
              </div>
            </button>

            <div className="flex flex-1 max-w-md items-center justify-end gap-2 sm:justify-start">
              <div className="relative hidden flex-1 sm:block">
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search the community..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setActiveView('feed');
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-all outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsCreatePostOpen(true)}
                aria-label="Create a post"
                title="Create a post"
                className="flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-white shadow-lg shadow-violet-950/30 transition-all hover:bg-violet-400"
              >
                <Plus className="h-5 w-5" />
                <span className="hidden md:inline">Create</span>
              </button>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-violet-900/50 hover:text-white rounded-lg transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="grid min-w-0 grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">
          {/* Left Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div
              className="bg-white/95 rounded-2xl border border-indigo-100 p-6 sticky top-24"
              style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 1)' }}
            >
              <nav className="space-y-2" style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 1)' }}>
                <button
                  onClick={() => setActiveView('feed')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'feed'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  <span>Home</span>
                </button>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'dashboard'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                  style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 1)' }}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveView('trending')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'trending'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Trending</span>
                </button>
                <button
                  onClick={() => setActiveView('tools')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'tools'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                >
                  <Bell className="w-5 h-5" />
                  <span>Community Tools</span>
                </button>
                <button
                  onClick={() => setActiveView('people')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'people'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Discover</span>
                </button>
                <button
                  onClick={() => setActiveView('friends')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'friends'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Friends</span>
                </button>
                <button
                  onClick={() => setActiveView('messages')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'messages'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span>Messages</span>
                </button>
                <button
                  onClick={() => setActiveView('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'profile'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Profile</span>
                </button>
              </nav>

              {profile && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{profile.username}</p>
                      <p className="text-sm text-slate-600 truncate">@{profile.username}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Mobile Navigation */}
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 border-t border-indigo-100 px-1 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(79,70,229,0.08)] backdrop-blur-md">
            <div className="grid grid-cols-7 gap-1">
              <button
                onClick={() => setActiveView('feed')}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] leading-none transition-all sm:flex-row sm:gap-2 sm:px-2 sm:text-xs ${
                  activeView === 'feed'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="truncate">Home</span>
              </button>
              <button
                onClick={() => setActiveView('dashboard')}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] leading-none transition-all sm:flex-row sm:gap-2 sm:px-2 sm:text-xs ${
                  activeView === 'dashboard'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="truncate">Dashboard</span>
              </button>
              <button
                onClick={() => setActiveView('people')}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] leading-none transition-all sm:flex-row sm:gap-2 sm:px-2 sm:text-xs ${
                  activeView === 'people'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="truncate">Discover</span>
              </button>
              <button
                onClick={() => setActiveView('friends')}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] leading-none transition-all sm:flex-row sm:gap-2 sm:px-2 sm:text-xs ${
                  activeView === 'friends'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600'
                }`}
              >
                <UserPlus className="w-5 h-5" />
                <span className="truncate">Friends</span>
              </button>
              <button
                onClick={() => setActiveView('messages')}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] leading-none transition-all sm:flex-row sm:gap-2 sm:px-2 sm:text-xs ${
                  activeView === 'messages'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600'
                }`}
              >
                <Mail className="w-5 h-5" />
                <span className="truncate">Messages</span>
              </button>
              <button
                onClick={() => setActiveView('profile')}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] leading-none transition-all sm:flex-row sm:gap-2 sm:px-2 sm:text-xs ${
                  activeView === 'profile'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-600'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="truncate">Profile</span>
              </button>
              <button
                onClick={() => setActiveView('tools')}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] leading-none transition-all sm:flex-row sm:gap-2 sm:px-2 sm:text-xs ${
                  activeView === 'tools' ? 'bg-violet-50 text-violet-700' : 'text-slate-600'
                }`}
              >
                <Bell className="w-5 h-5" />
                <span className="truncate">Tools</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="order-2 min-w-0 pb-24 lg:order-none lg:col-span-3 lg:pb-0">
            {activeView === 'feed' && <Feed refreshKey={postsRefreshKey} searchQuery={searchQuery} />}
            {activeView === 'trending' && <Trending />}
            {activeView === 'tools' && <FutureEnhancements />}
            {activeView === 'dashboard' && user && <Dashboard />}
            {activeView === 'profile' && <UserProfile />}
            {activeView === 'people' && <PeopleDiscovery onStartMessage={() => setActiveView('messages')} />}
            {activeView === 'friends' && <FriendRequests />}
            {activeView === 'messages' && user && <Messages />}
          </main>

          {/* Right Sidebar - Contacts */}
          <aside className="hidden lg:block lg:col-span-1 order-3">
            <Contacts onStartMessage={() => setActiveView('messages')} />
          </aside>
        </div>
      </div>

      {isCreatePostOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-24 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Create a post"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsCreatePostOpen(false);
          }}
        >
          <div className="relative w-full max-w-2xl">
            <button
              type="button"
              onClick={() => setIsCreatePostOpen(false)}
              aria-label="Close create post"
              className="absolute right-3 top-3 z-10 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <CreatePost
              onPostCreated={() => {
                setIsCreatePostOpen(false);
                setPostsRefreshKey((key) => key + 1);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
