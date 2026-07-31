import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import SEO from './components/SEO';
import Feed from './components/Feed';
import { supabase, Profile } from './lib/supabase';
const CreatePost = lazy(() => import('./components/CreatePost'));
const UserProfile = lazy(() => import('./components/UserProfile'));
const PeopleDiscovery = lazy(() => import('./components/PeopleDiscovery'));
const FriendRequests = lazy(() => import('./components/FriendRequests'));
const Messages = lazy(() => import('./components/Messages'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Contacts = lazy(() => import('./components/Contacts'));
const Trending = lazy(() => import('./components/Trending'));
const FutureEnhancements = lazy(() => import('./components/FutureEnhancements'));
const CreatorAbout = lazy(() => import('./components/CreatorAbout'));
const SnakesAndLadders = lazy(() => import('./games/snakes-ladders/App'));
const MoviesApp = lazy(() => import('./movies/MoviesApp'));
const LiveScoreDashboard = lazy(() => import('./livescore/App'));
import {
  Home, Users, User, LogOut, Search, Mail, BarChart3, UserPlus,
  Sparkles, Plus, X, Bell, Gamepad2, Film, Moon, Sun, ChevronDown,
  Bookmark, Settings, CheckCheck, TrendingUp, Info,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────── */
type ActiveView = 'feed' | 'profile' | 'people' | 'friends' | 'messages' | 'dashboard' | 'trending' | 'tools' | 'about' | 'game' | 'movies' | 'live-scores';

type NotifItem = {
  id: string;
  kind: 'comment' | 'follow';
  msg: string;
  time: string;
};

/* ─── Dark-mode hook ─────────────────────────────────────────────── */
function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState<boolean>(() => {
    const s = localStorage.getItem('darkMode');
    return s !== null ? s === 'true' : true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', String(dark));
  }, [dark]);

  return [dark, () => setDark(d => !d)];
}

/* ─── Skeleton ───────────────────────────────────────────────────── */
function ContentSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 ${className}`}
      aria-busy="true"
      aria-label="Loading content"
    >
      <div className="h-5 w-1/3 animate-pulse rounded bg-zinc-800" />
      <div className="h-32 animate-pulse rounded-xl bg-zinc-800" />
      <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-800" />
    </div>
  );
}

/* ─── Notification bell ──────────────────────────────────────────── */
function NotificationBell({ profile }: { profile: Profile | null }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('notif-read') ?? '[]')); }
    catch { return new Set(); }
  });
  const ref = useRef<HTMLDivElement>(null);
  const unread = items.filter(n => !readIds.has(n.id)).length;

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const [{ data: comments }, { data: follows }] = await Promise.all([
          supabase
            .from('comments')
            .select('id, content, created_at, profiles(username)')
            .neq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(6),
          supabase
            .from('connections')
            .select('id, created_at, follower:profiles!connections_follower_id_fkey(username)')
            .eq('following_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(4),
        ]);
        const list: NotifItem[] = [];
        comments?.forEach((c) => list.push({
          id: `c${c.id}`, kind: 'comment',
          msg: `${c.profiles?.[0]?.username ?? 'Someone'} commented: "${c.content.slice(0, 45)}${c.content.length > 45 ? '…' : ''}"`,
          time: c.created_at,
        }));
        follows?.forEach((f) => list.push({
          id: `f${f.id}`, kind: 'follow',
          msg: `${f.follower?.[0]?.username ?? 'Someone'} started following you`,
          time: f.created_at,
        }));
        list.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setItems(list.slice(0, 8));
      } catch { /* network errors ignored */ }
    })();
  }, [profile]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const markAllRead = () => {
    const ids = new Set(items.map(n => n.id));
    setReadIds(ids);
    localStorage.setItem('notif-read', JSON.stringify([...ids]));
  };

  const fmt = (t: string) => {
    const d = Math.floor((Date.now() - new Date(t).getTime()) / 60000);
    if (d < 1) return 'now'; if (d < 60) return `${d}m`; if (d < 1440) return `${Math.floor(d / 60)}h`; return `${Math.floor(d / 1440)}d`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-all hover:bg-violet-900/60 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-violet-500 px-0.5 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-fade-in-up absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-100">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-violet-400 transition hover:bg-zinc-800 hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="scrollbar-thin max-h-72 divide-y divide-zinc-800 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">No notifications yet</p>
            ) : items.map(n => {
              const isRead = readIds.has(n.id);
              return (
                <div key={n.id} className={`flex gap-3 px-4 py-3 transition hover:bg-zinc-800/60 ${!isRead ? 'bg-violet-950/30' : ''}`}>
                  <span className="mt-0.5 text-base">{n.kind === 'comment' ? '💬' : '👤'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${!isRead ? 'text-zinc-100' : 'text-zinc-400'}`}>{n.msg}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{fmt(n.time)} ago</p>
                  </div>
                  {!isRead && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Avatar / account menu ──────────────────────────────────────── */
function AvatarMenu({ profile, onSignOut, onNavigate }: {
  profile: Profile | null;
  onSignOut: () => void;
  onNavigate: (v: ActiveView) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const menuItems: { label: string; icon: React.ElementType; view: ActiveView }[] = [
    { label: 'View Profile', icon: User, view: 'profile' },
    { label: 'Dashboard', icon: BarChart3, view: 'dashboard' },
    { label: 'Saved Posts', icon: Bookmark, view: 'feed' },
    { label: 'Settings', icon: Settings, view: 'tools' },
    { label: 'About the creator', icon: Info, view: 'about' },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-all hover:bg-violet-900/60 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-md">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt={profile.username} className="h-full w-full object-cover" />
            : profile?.username?.charAt(0).toUpperCase()}
        </div>
        <ChevronDown className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform duration-150 sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="animate-fade-in-up absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          <div className="border-b border-zinc-700 px-4 py-3">
            <p className="truncate font-semibold text-zinc-100">{profile?.username}</p>
            <p className="truncate text-xs text-zinc-400">@{profile?.username}</p>
          </div>
          <div className="py-1">
            {menuItems.map(({ label, icon: Icon, view }) => (
              <button
                key={label}
                onClick={() => { onNavigate(view); setOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400"
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
            <div className="my-1 border-t border-zinc-700" />
            <button
              onClick={onSignOut}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-950/40 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-400"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sidebar nav item ───────────────────────────────────────────── */
function NavItem({ active, icon: Icon, label, badge, onClick }: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
        active
          ? 'bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30'
          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 active:scale-[0.98]'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-violet-400" />
      )}
      <Icon className={`h-5 w-5 shrink-0 transition-colors ${active ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
      <span className="truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

/* ─── Mobile nav item ────────────────────────────────────────────── */
function MobileNavItem({ active, icon: Icon, label, badge, onClick }: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex min-w-[60px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] leading-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:min-w-0 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-xs ${
        active
          ? 'text-violet-400 font-semibold'
          : 'text-slate-500 hover:text-slate-300 active:scale-95'
      }`}
    >
      {active && (
        <span className="absolute left-1/2 top-0.5 h-0.5 w-6 -translate-x-1/2 rounded-full bg-violet-400 sm:hidden" />
      )}
      <div className="relative">
        <Icon className={`h-5 w-5 ${active ? 'drop-shadow-[0_0_4px_rgba(167,139,250,0.7)]' : ''}`} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-violet-500 px-0.5 text-[8px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ─── Game view ──────────────────────────────────────────────────── */
function GameView() {
  return (
    <Suspense fallback={<ContentSkeleton className="mx-auto mt-6 max-w-5xl" />}>
      <SnakesAndLadders />
    </Suspense>
  );
}

/* ─── Public (unauthenticated) feed ──────────────────────────────── */
function PublicFeed() {
  const [showAuth, setShowAuth] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [showMovies, setShowMovies] = useState(false);
  const [showFreeBets, setShowFreeBets] = useState(false);

  const returnToCommunity = () => {
    window.history.pushState({}, '', '/');
    setShowGame(false);
    setShowMovies(false);
    setShowFreeBets(false);
  };

  if (showMovies || showFreeBets) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-indigo-950">
        <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-4">
          <button
            type="button"
            onClick={returnToCommunity}
            className="rounded-lg border border-violet-500/40 bg-violet-950/80 px-4 py-2 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            ← Back to community
          </button>
        </div>
        <Suspense fallback={<ContentSkeleton className="mx-auto mt-6 max-w-5xl" />}>
          {showMovies ? <MoviesApp /> : <LiveScoreDashboard />}
        </Suspense>
      </div>
    );
  }

  if (showGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-indigo-950">
        <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-4">
          <button
            type="button"
            onClick={returnToCommunity}
            className="rounded-lg border border-violet-500/40 bg-violet-950/80 px-4 py-2 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            ← Back to community
          </button>
        </div>
        <GameView />
      </div>
    );
  }

  if (showAuth) return <Auth />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-indigo-950">
      <SEO view="feed" />
      <header className="sticky top-0 z-40 border-b border-violet-900/40 bg-indigo-950/90 text-white shadow-2xl backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-900/50">
              <span className="text-2xl">🎅</span>
            </div>
            <h1 className="truncate text-sm font-extrabold tracking-tight sm:text-lg">Hyper</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowMovies(true)}
              className="flex items-center gap-1.5 rounded-lg border border-fuchsia-400/60 bg-fuchsia-950/70 px-2 py-2 text-xs font-medium text-fuchsia-100 transition-colors hover:bg-fuchsia-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 sm:gap-2 sm:px-3 sm:text-sm"
            >
              <Film className="h-4 w-4" />
              <span>Watch Movies</span>
            </button>
            <button
              type="button"
              onClick={() => { window.history.pushState({}, '', '/sure-bets'); setShowFreeBets(true); }}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-400/60 bg-emerald-950/70 px-2 py-2 text-xs font-medium text-emerald-100 transition-colors hover:bg-emerald-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:gap-2 sm:px-3 sm:text-sm"
            >
              <TrendingUp className="h-4 w-4" />
              <span>Today&apos;s Free Bets</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGame(true)}
              className="hidden items-center gap-2 rounded-lg border border-violet-400/60 bg-violet-950/70 px-3 py-2 text-sm font-medium text-violet-100 transition-colors hover:bg-violet-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:flex"
            >
              <Gamepad2 className="h-4 w-4" />
              Play
            </button>
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="rounded-lg bg-violet-600 px-2.5 py-2 text-xs font-medium text-white transition-colors hover:bg-violet-500 active:scale-95 active:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:px-4 sm:text-sm"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
        <Feed refreshKey={0} searchQuery="" />
      </main>
    </div>
  );
}

/* ─── Main authenticated app ─────────────────────────────────────── */
function MainApp() {
  const { user, profile, loading, signOut } = useAuth();
  const [dark, toggleDark] = useDarkMode();
  const [activeView, setActiveView] = useState<ActiveView>(() => window.location.hash.startsWith('#profile-') ? 'profile' : 'feed');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash.startsWith('#profile-')) setActiveView('profile');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [postsRefreshKey, setPostsRefreshKey] = useState(0);
  const [messageRecipientId, setMessageRecipientId] = useState<string | null>(null);

  const handleStartMessage = (userId: string) => {
    setMessageRecipientId(userId);
    setActiveView('messages');
  };

  const handleSignOut = async () => {
    try { await signOut(); } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-slate-950 to-indigo-950 p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-6 pt-12" aria-label="Loading community" aria-busy="true">
          <div className="h-14 animate-pulse rounded-2xl bg-zinc-900" />
          <ContentSkeleton />
          <ContentSkeleton />
        </div>
      </div>
    );
  }

  if (!user) return <PublicFeed />;

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-slate-950 to-indigo-950 p-4">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center shadow-xl">
          <h2 className="mb-3 text-2xl font-bold text-zinc-100">Profile unavailable</h2>
          <p className="mb-6 text-zinc-400">We couldn&apos;t load your profile. Please sign in again.</p>
          <button
            onClick={handleSignOut}
            className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const navItems: { id: ActiveView; icon: React.ElementType; label: string }[] = [
    { id: 'feed',      icon: Home,       label: 'Home' },
    { id: 'dashboard', icon: BarChart3,  label: 'Dashboard' },
    { id: 'trending',  icon: TrendingUp, label: 'Trending' },
    { id: 'people',    icon: Users,      label: 'Discover' },
    { id: 'friends',   icon: UserPlus,   label: 'Friends' },
    { id: 'messages',  icon: Mail,       label: 'Messages' },
    { id: 'game',      icon: Gamepad2,   label: 'Play' },
    { id: 'movies',    icon: Film,       label: 'Movies' },
    { id: 'live-scores', icon: TrendingUp, label: 'Live Scores' },
    { id: 'tools',     icon: Sparkles,   label: 'Community' },
    { id: 'about',     icon: Info,       label: 'About creator' },
    { id: 'profile',   icon: User,       label: 'Profile' },
  ];

  const mobileNavItems = navItems.filter(n =>
    ['feed', 'dashboard', 'people', 'friends', 'messages', 'profile', 'game', 'movies', 'live-scores', 'trending', 'about'].includes(n.id)
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? 'bg-gradient-to-br from-zinc-950 via-slate-950 to-indigo-950' : 'bg-slate-50'}`}>
      <SEO view={activeView} profileName={profile.username} />

      {/* ── Top banner ── */}
      <div className="flex justify-between items-center px-4 py-1 bg-gradient-to-r from-indigo-950 via-violet-950 to-indigo-950 border-b border-violet-800/30 text-xs">
        <div className="flex items-center gap-2">
          {['bg-violet-400', 'bg-fuchsia-400', 'bg-indigo-400', 'bg-purple-400', 'bg-violet-300', 'bg-indigo-300'].map((c, i) => (
            <span key={c} className={`h-2 w-2 rounded-full ${c} animate-pulse`} style={{ animationDelay: `${i * 200}ms` }} />
          ))}
          <span className="ml-2 hidden font-semibold text-violet-200 sm:inline">Santa Zoza Nation &bull; Kanashi</span>
        </div>
        <span className="hidden text-indigo-200 sm:inline">Connect. Create. Belong.</span>
      </div>

      {/* ── Main header ── */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b shadow-xl transition-colors ${dark ? 'bg-indigo-950/90 border-violet-900/40 text-white' : 'bg-white/95 border-slate-200 text-slate-900'}`}>
        <div className="mx-auto w-full max-w-7xl px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center justify-between gap-3">

            {/* Brand */}
            <button
              type="button"
              onClick={() => setActiveView('feed')}
              className="flex min-w-0 items-center gap-2.5 text-left transition-opacity hover:opacity-90 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded-lg sm:gap-3"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-900/50 sm:h-10 sm:w-10">
                <span className="text-xl">🎅</span>
              </div>
              <div>
                <h1 className="truncate text-sm font-extrabold tracking-tight sm:text-base">
                  hyperlink
                </h1>
                <p className="hidden text-xs text-slate-400 md:block">Elves at work &bull; <span className="text-violet-400 font-medium">zoza nation</span></p>
              </div>
            </button>

            {/* Search — desktop only */}
            <div className="relative hidden flex-1 max-w-sm sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search the community…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') setActiveView('feed'); }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 py-2 pl-9 pr-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/40"
              />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Mobile Live Scores shortcut */}
              <button
                type="button"
                onClick={() => setActiveView('live-scores')}
                aria-label="Open Live Scores"
                title="Live Scores"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-300 transition hover:bg-emerald-900/60 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 lg:hidden"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m12 7 2 1.5-.75 2.4h-2.5L10 8.5 12 7Z" fill="currentColor" stroke="none" />
                  <path d="m5.8 8.5 4.2 2.4M18.2 8.5 14 10.9M8.2 17.5l2.1-5.6M15.8 17.5l-2.1-5.6M8.2 17.5h7.6" />
                </svg>
              </button>

              {/* Mobile game shortcut */}
              <button
                type="button"
                onClick={() => setActiveView('game')}
                aria-label="Play Snakes and Ladders"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-violet-300 transition hover:bg-violet-900/60 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 lg:hidden"
              >
                <Gamepad2 className="h-5 w-5" />
              </button>

              {/* Create post */}
              <button
                type="button"
                onClick={() => setIsCreatePostOpen(true)}
                aria-label="Create a post"
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-2 text-sm font-medium text-white shadow transition hover:bg-violet-500 active:scale-95 active:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:px-4"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
              </button>

              {/* Dark mode toggle */}
              <button
                type="button"
                onClick={toggleDark}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-violet-900/60 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </button>

              {/* Notification bell */}
              <NotificationBell profile={profile} />

              {/* Avatar / account menu */}
              <AvatarMenu
                profile={profile}
                onSignOut={handleSignOut}
                onNavigate={v => setActiveView(v)}
              />
            </div>
          </div>
          <nav aria-label="Primary navigation" className="mt-3 hidden items-center gap-1 overflow-x-auto border-t border-violet-900/30 pt-2 lg:flex">
            {navItems.slice(0, 7).map(item => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? 'bg-violet-600 text-white shadow-sm' : dark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {active && <span className="absolute inset-x-3 -bottom-2 h-0.5 rounded-full bg-violet-300" />}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── Layout ── */}
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="grid min-w-0 grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">

          {/* Left sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className={`sticky top-24 rounded-2xl border p-4 ${dark ? 'border-zinc-800 bg-zinc-900/80' : 'border-slate-200 bg-white'}`}>
              <nav className="space-y-0.5">
                {navItems.map(item => (
                  <NavItem
                    key={item.id}
                    active={activeView === item.id}
                    icon={item.icon}
                    label={item.label}
                    onClick={() => setActiveView(item.id)}
                  />
                ))}
              </nav>

              {/* Dark mode toggle */}
              <div className={`mt-4 border-t pt-4 ${dark ? 'border-zinc-800' : 'border-slate-200'}`}>
                <button
                  onClick={toggleDark}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${dark ? 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  {dark ? 'Light mode' : 'Dark mode'}
                </button>
              </div>

              {/* Profile mini-card */}
              <div className={`mt-4 border-t pt-4 ${dark ? 'border-zinc-800' : 'border-slate-200'}`}>
                <button
                  onClick={() => setActiveView('profile')}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-zinc-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-[0.98]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white shadow-md">
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt={profile.username} className="h-full w-full rounded-full object-cover" />
                      : profile.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${dark ? 'text-zinc-100' : 'text-slate-900'}`}>{profile.username}</p>
                    <p className="truncate text-xs text-zinc-500">@{profile.username}</p>
                  </div>
                </button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="order-2 mx-auto min-w-0 w-full max-w-3xl pb-24 lg:order-none lg:col-span-3 lg:max-w-none lg:pb-0">
            <Suspense fallback={<ContentSkeleton />}>
              {activeView === 'feed'      && (
                <Feed
                  refreshKey={postsRefreshKey}
                  searchQuery={searchQuery}
                  onCreatePost={() => setIsCreatePostOpen(true)}
                  onAboutCreator={() => setActiveView('about')}
                  onBrowseMovies={() => setActiveView('movies')}
                />
              )}
              {activeView === 'trending'  && <Trending />}
              {activeView === 'tools'     && <FutureEnhancements />}
              {activeView === 'about'     && <CreatorAbout />}
              {activeView === 'game'      && <GameView />}
              {activeView === 'movies'    && <MoviesApp />}
              {activeView === 'live-scores' && <LiveScoreDashboard />}
              {activeView === 'dashboard' && user && <Dashboard />}
              {activeView === 'profile'   && <UserProfile />}
              {activeView === 'people'    && <PeopleDiscovery onStartMessage={handleStartMessage} />}
              {activeView === 'friends'   && <FriendRequests onStartMessage={handleStartMessage} />}
              {activeView === 'messages'  && user && <Messages initialRecipientId={messageRecipientId} />}
            </Suspense>
          </main>

          {/* Right sidebar */}
          <aside className="hidden lg:block lg:col-span-1 order-3">
            <Suspense fallback={<ContentSkeleton />}>
              <Contacts onStartMessage={handleStartMessage} />
            </Suspense>
          </aside>
        </div>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 px-1 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
      >
        <div className="flex gap-0.5 overflow-x-auto scrollbar-hide sm:grid sm:grid-cols-8">
          {mobileNavItems.map(item => (
            <MobileNavItem
              key={item.id}
              active={activeView === item.id}
              icon={item.icon}
              label={item.label}
              onClick={() => setActiveView(item.id)}
            />
          ))}
        </div>
      </nav>

      {/* ── Create post modal ── */}
      {isCreatePostOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-24 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Create a post"
          onMouseDown={e => { if (e.target === e.currentTarget) setIsCreatePostOpen(false); }}
        >
          <div className="relative w-full max-w-2xl">
            <button
              type="button"
              onClick={() => setIsCreatePostOpen(false)}
              aria-label="Close create post"
              className="absolute right-3 top-3 z-10 rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <X className="h-5 w-5" />
            </button>
            <Suspense fallback={<ContentSkeleton />}>
              <CreatePost
                onPostCreated={() => {
                  setIsCreatePostOpen(false);
                  setPostsRefreshKey(k => k + 1);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────────── */
function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
