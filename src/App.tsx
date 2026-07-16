import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Feed from './components/Feed';
import UserProfile from './components/UserProfile';
import PeopleDiscovery from './components/PeopleDiscovery';
import FriendRequests from './components/FriendRequests';
import Messages from './components/Messages';
import Dashboard from './components/Dashboard';
import Contacts from './components/Contacts';
import LazyImage from './components/LazyImage';
import { Loader2, Home, Users, User, LogOut, Search, Mail, BarChart3, UserPlus } from 'lucide-react';

function MainApp() {
  const { user, profile, loading, signOut } = useAuth();
  const [activeView, setActiveView] = useState<'feed' | 'profile' | 'people' | 'friends' | 'messages' | 'dashboard'>('feed');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Profile unavailable</h2>
          <p className="text-slate-600 mb-6">
            We couldn’t load your profile from Supabase. Please sign in again.
          </p>
          <button
            onClick={handleSignOut}
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50 to-violet-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-red-900/40 shadow-2xl text-white">
        <div className="flex justify-between items-center px-4 py-1 bg-gradient-to-r from-red-950 via-emerald-950 to-red-950 border-b border-red-800/30 text-xs">
          <div className="flex items-center space-x-2">
            {['bg-red-500', 'bg-yellow-400', 'bg-emerald-400', 'bg-blue-400', 'bg-pink-400', 'bg-amber-300'].map((color, i) => (
              <span
                key={color}
                className={`w-2 h-2 rounded-full ${color} animate-pulse shadow-sm shadow-white`}
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
            <span className="ml-2 font-semibold text-amber-200 hidden sm:inline">
              Santa Zoza Nation &bull; Kanashi
            </span>
          </div>
          <span className="text-emerald-200 hidden sm:inline">Connect. Create. Belong.</span>
        </div>

        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
              Social Hub
            </h1>

            <div className="flex-1 max-w-md hidden sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search the community..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-200 hover:bg-red-900/50 hover:text-white rounded-lg transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveView('feed')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'feed'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  <span>Home</span>
                </button>
                <button
                  onClick={() => setActiveView('dashboard')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'dashboard'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveView('people')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'people'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Discover</span>
                </button>
                <button
                  onClick={() => setActiveView('friends')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'friends'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Friends</span>
                </button>
                <button
                  onClick={() => setActiveView('messages')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'messages'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span>Messages</span>
                </button>
                <button
                  onClick={() => setActiveView('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'profile'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/60'
                      : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'
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
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-indigo-100 px-2 py-2 shadow-[0_-6px_20px_rgba(79,70,229,0.08)]">
            <div className="flex justify-around gap-1 overflow-x-auto">
              <button
                onClick={() => setActiveView('feed')}
                className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg transition-all min-w-fit ${
                  activeView === 'feed'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="hidden xs:inline text-xs">Home</span>
              </button>
              <button
                onClick={() => setActiveView('dashboard')}
                className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg transition-all min-w-fit ${
                  activeView === 'dashboard'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="hidden xs:inline text-xs">Dashboard</span>
              </button>
              <button
                onClick={() => setActiveView('people')}
                className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg transition-all min-w-fit ${
                  activeView === 'people'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="hidden xs:inline text-xs">Discover</span>
              </button>
              <button
                onClick={() => setActiveView('friends')}
                className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg transition-all min-w-fit ${
                  activeView === 'friends'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600'
                }`}
              >
                <UserPlus className="w-5 h-5" />
                <span className="hidden xs:inline text-xs">Friends</span>
              </button>
              <button
                onClick={() => setActiveView('messages')}
                className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg transition-all min-w-fit ${
                  activeView === 'messages'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600'
                }`}
              >
                <Mail className="w-5 h-5" />
                <span className="hidden xs:inline text-xs">Messages</span>
              </button>
              <button
                onClick={() => setActiveView('profile')}
                className={`flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-lg transition-all min-w-fit ${
                  activeView === 'profile'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="hidden xs:inline text-xs">Profile</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="lg:col-span-3 pb-20 lg:pb-0 order-2 lg:order-none">
            {activeView === 'feed' && <Feed />}
            {activeView === 'dashboard' && user && <Dashboard />}
            {activeView === 'profile' && <UserProfile />}
            {activeView === 'people' && <PeopleDiscovery onStartMessage={(userId) => {
              if (user) {
                setActiveView('messages');
              } else {
                setActiveView('auth');
              }
            }} />}
            {activeView === 'friends' && <FriendRequests />}
            {activeView === 'messages' && user && <Messages />}
            {activeView === 'auth' && <Auth />}
          </main>

          {/* Right Sidebar - Contacts */}
          <aside className="hidden lg:block lg:col-span-1 order-3">
            <Contacts onStartMessage={(userId) => {
              if (user) {
                setActiveView('messages');
              } else {
                setActiveView('auth');
              }
            }} />
          </aside>
        </div>
      </div>
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
