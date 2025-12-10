import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Feed from './components/Feed';
import UserProfile from './components/UserProfile';
import PeopleDiscovery from './components/PeopleDiscovery';
import { Loader2, Home, Users, User, LogOut, Search } from 'lucide-react';

function MainApp() {
  const { user, profile, loading, signOut } = useAuth();
  const [activeView, setActiveView] = useState<'feed' | 'profile' | 'people'>('feed');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Social Hub
            </h1>

            <div className="flex-1 max-w-md hidden sm:block">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveView('feed')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'feed'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Home className="w-5 h-5" />
                  <span>Home</span>
                </button>
                <button
                  onClick={() => setActiveView('people')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'people'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>Discover</span>
                </button>
                <button
                  onClick={() => setActiveView('profile')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeView === 'profile'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Profile</span>
                </button>
              </nav>

              {profile && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
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
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2">
            <div className="flex justify-around gap-2">
              <button
                onClick={() => setActiveView('feed')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  activeView === 'feed'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="hidden xs:inline text-sm">Home</span>
              </button>
              <button
                onClick={() => setActiveView('people')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  activeView === 'people'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600'
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="hidden xs:inline text-sm">Discover</span>
              </button>
              <button
                onClick={() => setActiveView('profile')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  activeView === 'profile'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="hidden xs:inline text-sm">Profile</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="lg:col-span-3 pb-20 lg:pb-0">
            {activeView === 'feed' && <Feed />}
            {activeView === 'profile' && <UserProfile />}
            {activeView === 'people' && <PeopleDiscovery />}
          </main>
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
