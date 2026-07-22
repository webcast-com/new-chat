import React, { useState } from 'react';
import { Search, Menu, X, Bell, User, TrendingUp, LogOut, ChevronDown, Crown } from 'lucide-react';
import { Sport } from '@/app/data/sportsData';
import { useAuth } from '@/app/context/AuthContext';
import AuthModal from './AuthModal';

interface HeaderProps {
  activeSport: Sport;
  onSportChange: (sport: Sport) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const sports: { key: Sport; label: string }[] = [
  { key: 'all', label: 'All Sports' },
  { key: 'football', label: 'Football' },
  { key: 'basketball', label: 'Basketball' },
  { key: 'soccer', label: 'Soccer' },
  { key: 'baseball', label: 'Baseball' },
  { key: 'tennis', label: 'Tennis' },
];

const Header: React.FC<HeaderProps> = ({ activeSport, onSportChange, searchQuery, onSearchChange }) => {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName = user?.name || user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();
  const isPremium = user?.plan === 'premium';
  const expiresLabel = isPremium && user?.plan_expires_at
    ? `Premium until ${new Date(user.plan_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : null;

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0d1117]/95 backdrop-blur-xl border-b border-white/5">
        {/* Top bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0066ff] flex items-center justify-center shadow-lg shadow-[#00d4ff]/20">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#00ff88] rounded-full animate-pulse border-2 border-[#0d1117]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Score<span className="text-[#00d4ff]">Hub</span>
                </h1>
                <p className="text-[10px] -mt-0.5 tracking-widest uppercase text-[rgb(141,197,255)]">Live Sports</p>
              </div>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search teams, matches, leagues..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff]/50 focus:bg-white/10 transition-all"
                />
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="md:hidden p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <Search className="w-5 h-5" />
              </button>

              <button className="relative p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/10 border transition-all ${isPremium ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${isPremium ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-[#00d4ff] to-[#0066ff]'}`}>
                      {isPremium ? <Crown className="w-3.5 h-3.5" /> : initials}
                    </div>
                    <span className="hidden sm:block text-sm text-white max-w-[100px] truncate">{displayName}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-[#161b22] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-20">
                        <div className="px-4 py-3 border-b border-white/5">
                          <p className="text-sm font-medium text-white truncate">{displayName}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          {isPremium ? (
                            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded-full text-[10px] font-semibold text-amber-400">
                              <Crown className="w-3 h-3" /> Premium Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-500">
                              Free Plan
                            </span>
                          )}
                          {expiresLabel && (
                            <p className="text-[10px] text-amber-400/70 mt-0.5">{expiresLabel}</p>
                          )}
                        </div>
                        <div className="p-1">
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#0066ff] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.97] transition-all shadow-lg shadow-[#00d4ff]/20"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile search */}
        {searchOpen && (
          <div className="md:hidden px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search teams, matches, leagues..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff]/50 transition-all"
              />
            </div>
          </div>
        )}

        {/* Sport tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className={`${mobileMenuOpen ? 'flex flex-col gap-1 py-2' : 'hidden lg:flex'} items-start lg:items-center lg:flex-row gap-0 lg:gap-1`}>
            {sports.map((sport) => (
              <button
                key={sport.key}
                onClick={() => {
                  onSportChange(sport.key);
                  setMobileMenuOpen(false);
                }}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap w-full lg:w-auto text-left ${
                  activeSport === sport.key
                    ? 'text-[#00d4ff] bg-[#00d4ff]/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {sport.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Header;
