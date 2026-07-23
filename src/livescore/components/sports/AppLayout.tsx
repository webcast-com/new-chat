import React, { useEffect, useState } from 'react';
import { LiveMatch, standings, Sport } from '@/app/data/sportsData';
import Header from './Header';
import Breadcrumb from './Breadcrumb';
import TabNavigation from './TabNavigation';
import HeroSection, { LiveMatchTicker } from './HeroSection';
import StatsBar from './StatsBar';
import QuickLinks from './QuickLinks';
import LiveScores from './LiveScores';
import FeaturedMatch from './FeaturedMatch';
import UpcomingMatches from './UpcomingMatches';
import TopScorers from './TopScorers';
import Standings from './Standings';
import NewsFeed from './NewsFeed';
import TransfersFeed from './TransfersFeed';
import Footer from './Footer';
import BackToTop from './BackToTop';
import { useScoreSimulator } from './ScoreSimulator';
import { Wifi, WifiOff, Loader2, Database, Radio, Crown, Sparkles, ArrowRight, Check, X } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { SureBets } from './SureBets';
import { MainTab } from './TabNavigation';
import About from '@/app/pages/About';
import AccessibilityStatement from '@/app/pages/AccessibilityStatement';
import Advertise from '@/app/pages/Advertise';
import Careers from '@/app/pages/Careers';
import Contact from '@/app/pages/Contact';
import CookiePolicy from '@/app/pages/CookiePolicy';
import HelpCenter from '@/app/pages/HelpCenter';
import Partners from '@/app/pages/Partners';
import Press from '@/app/pages/Press';
import PrivacyPolicy from '@/app/pages/PrivacyPolicy';
import TermsOfService from '@/app/pages/TermsOfService';
import { setPageMeta } from '@/utils/seoMeta';

type InformationalPage = 'about' | 'careers' | 'press' | 'contact' | 'advertise' | 'partners' | 'help' | 'terms' | 'privacy' | 'cookies' | 'accessibility';
const informationalPages: Record<InformationalPage, React.ComponentType> = {
  about: About,
  careers: Careers,
  press: Press,
  contact: Contact,
  advertise: Advertise,
  partners: Partners,
  help: HelpCenter,
  terms: TermsOfService,
  privacy: PrivacyPolicy,
  cookies: CookiePolicy,
  accessibility: AccessibilityStatement,
};

const AppLayout: React.FC = () => {
  const [activeSport, setActiveSport] = useState<Sport>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<LiveMatch | null>(null);
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [activePage, setActivePage] = useState<InformationalPage | null>(null);
  const [showPricingPopup, setShowPricingPopup] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const { matches: simulatedMatches, source, loading, error } = useScoreSimulator();

  useEffect(() => {
    if (authLoading || user?.plan === 'premium') return;

    const popupTimer = window.setTimeout(() => setShowPricingPopup(true), 2000);
    return () => window.clearTimeout(popupTimer);
  }, [authLoading, user?.plan]);

  useEffect(() => {
    if (activePage) {
      setPageMeta(activePage);
      return;
    }

    setPageMeta(activeTab === 'dashboard' ? 'home' : 'sureBets');
  }, [activePage, activeTab]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
        {!activePage && (
          <Header
            activeSport={activeSport}
            onSportChange={setActiveSport}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}

        {activePage ? (
          React.createElement(informationalPages[activePage])
        ) : (
          <>
            {/* Breadcrumb Navigation */}
            <Breadcrumb activeTab={activeTab} activeSport={activeSport} />

        {/* Main tab nav */}
        <TabNavigation activeTab={activeTab} onChange={setActiveTab} />

        {activeTab !== 'sure-bets' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-2" aria-label="Premium predictions promotion">
            <div className="relative overflow-hidden rounded-2xl border border-[#00d4ff]/20 bg-gradient-to-r from-[#00d4ff]/10 via-[#161b22] to-[#00ff88]/10 px-5 py-4 sm:px-7 sm:py-5 shadow-lg shadow-[#00d4ff]/5">
              <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#00ff88]/10 blur-3xl" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#00ff88] text-[#0d1117] shadow-lg shadow-[#00d4ff]/20">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <h2 className="text-base font-bold text-white sm:text-lg">Premium Predictions</h2>
                      <Sparkles className="h-4 w-4 text-[#00ff88]" />
                    </div>
                    <p className="max-w-2xl text-sm text-gray-400">Get expert picks, live API-powered predictions, and deeper match insights for just KSh 100.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('sure-bets')}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#00ff88] px-4 py-2.5 text-sm font-bold text-[#0d1117] shadow-lg shadow-[#00d4ff]/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Unlock Premium
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* Data source indicator */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3">
              <div className="flex items-center gap-2 text-xs">
                {loading ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Fetching live data...
                  </span>
                ) : source === 'supabase-edge' ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400">
                    <Database className="w-3 h-3" />
                    Supabase Edge Function
                  </span>
                ) : source === 'api-live' ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-400">
                    <Wifi className="w-3 h-3" />
                    Live API Data ({simulatedMatches.length} matches)
                  </span>
                ) : source === 'fallback-demo' ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#00d4ff]/10 border border-[#00d4ff]/20 rounded-full text-[#00d4ff]">
                    <Radio className="w-3 h-3" />
                    Demo Data ({simulatedMatches.length} matches) {error && `- ${error.split(' - ')[0]}`}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400">
                    <Database className="w-3 h-3" />
                    {source}
                  </span>
                )}
                {error && error.toLowerCase().includes('error') && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 ml-2">
                    <WifiOff className="w-3 h-3" />
                    {error.split(':')[0]}
                  </span>
                )}
                <span className="ml-auto text-[rgb(17,16,16)]">Auto-refreshes every 30s</span>
              </div>
            </div>

            <LiveMatchTicker matches={simulatedMatches} onMatchClick={setSelectedMatch} />

            <HeroSection featuredMatches={simulatedMatches} onMatchClick={setSelectedMatch} />
            <StatsBar />
            <QuickLinks onSportChange={setActiveSport} />
            <LiveScores matches={simulatedMatches} activeSport={activeSport} searchQuery={searchQuery} onMatchClick={setSelectedMatch} />
            <UpcomingMatches />
            <TopScorers />
            <Standings standings={standings} />
            <TransfersFeed />
            <NewsFeed />
          </>
        )}

        {activeTab === 'sure-bets' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <SureBets onUpgrade={() => setShowPricingPopup(true)} />
          </div>
        )}

        <FeaturedMatch match={selectedMatch} onClose={() => setSelectedMatch(null)} />
          </>
        )}

        {!activePage && <Footer onNavigate={(href) => setActivePage(href.slice(1) as InformationalPage)} />}
        <BackToTop />

        {showPricingPopup && user?.plan !== 'premium' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pricing-popup-title">
            <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-gray-800 shadow-[0_24px_40px_-12px_rgba(139,92,246,0.25)] transition-transform duration-300 hover:-translate-y-2">
              <button
                type="button"
                onClick={() => setShowPricingPopup(false)}
                aria-label="Close premium offer"
                className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="inline-block rounded-full bg-gradient-to-br from-violet-500 to-pink-500 px-2.5 py-1 text-[10px] font-bold tracking-widest text-white">PRO</span>
              <h2 id="pricing-popup-title" className="mt-3 text-4xl font-extrabold leading-none text-gray-900">
                KSh 100<span className="ml-1 text-sm font-medium text-gray-500">/ unlimited predictions</span>
              </h2>
              <p className="mt-3 text-sm text-gray-500">Unlock the insight you need before the match starts.</p>
              <ul className="my-5 space-y-2 text-sm text-gray-600">
                {['Unlimited predictions', 'Live API-powered picks', 'Priority support'].map((feature) => (
                  <li key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 font-bold text-emerald-500" />{feature}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setShowPricingPopup(false)}
                className="w-full rounded-lg bg-gray-800 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gradient-to-br hover:from-violet-500 hover:to-pink-500"
              >
                Choose Pro
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default AppLayout;
