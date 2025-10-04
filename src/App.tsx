import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Feed from './components/Feed';
import Profile from './components/Profile';
import Connections from './components/Connections';
import Trending from './components/Trending';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState<'feed' | 'profile' | 'connections' | 'trending'>('feed');

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
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <Sidebar activeView={activeView} onViewChange={setActiveView} />
          </aside>

          <main className="lg:col-span-9">
            <div className="max-w-3xl mx-auto">
              {activeView === 'feed' && <Feed />}
              {activeView === 'profile' && <Profile />}
              {activeView === 'connections' && <Connections />}
              {activeView === 'trending' && <Trending />}
            </div>
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
