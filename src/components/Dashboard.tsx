import { useState } from 'react';
import { BarChart3, Activity, TrendingUp, Settings, Bookmark, CalendarDays, Mail, UserPlus, Trophy, ChevronRight, Clock3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import DashboardOverview from './dashboard/DashboardOverview';
import DashboardActivity from './dashboard/DashboardActivity';
import DashboardInsights from './dashboard/DashboardInsights';
import DashboardSettings from './dashboard/DashboardSettings';

type DashboardTab = 'overview' | 'activity' | 'insights' | 'settings';

type RecentActivityItem = {
  id: string;
  text: string;
  createdAt: string;
  tone: string;
};

const events = [
  { day: '18', month: 'DEC', title: 'Gift exchange planning', time: 'Today · 6:00 PM' },
  { day: '21', month: 'DEC', title: 'Workshop game night', time: 'Saturday · 7:30 PM' },
];

export default function Dashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-white via-violet-50 to-fuchsia-50 p-5 shadow-sm dark:border-violet-900/60 dark:from-zinc-900 dark:via-violet-950/50 dark:to-zinc-900 sm:p-7">
        <div className="relative z-10">
          <p className="text-sm font-semibold text-violet-600 dark:text-violet-300">YOUR COMMUNITY HUB</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Good to see you, {profile?.full_name || profile?.username}.</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-zinc-300">You have a lively workshop today. Catch up with your people, plans, and saved inspiration.</p>
        </div>
        <SparkleDecoration />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Widget title="Recent activity" icon={Clock3} action="View all">
          <RecentActivity userId={profile?.id} />
        </Widget>

        <Widget title="Saved posts" icon={Bookmark} action="See saved">
          <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-3 dark:bg-zinc-800/70">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg">🎁</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800 dark:text-zinc-100">Holiday craft ideas</p><p className="text-xs text-slate-500">Saved from Ellie&apos;s workshop</p></div>
          </div>
          <p className="mt-3 text-sm text-slate-500">You have <span className="font-semibold text-violet-600 dark:text-violet-300">12 saved posts</span> to revisit.</p>
        </Widget>

        <Widget title="Friend requests" icon={UserPlus} action="Review">
          <div className="flex items-center gap-3"><Avatar initials="JW" color="from-sky-500 to-indigo-500" /><div className="flex-1"><p className="text-sm font-semibold text-slate-800 dark:text-zinc-100">Jordan Winter</p><p className="text-xs text-slate-500">3 mutual friends</p></div><button className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500">Accept</button></div>
        </Widget>

        <Widget title="Messages" icon={Mail} action="Inbox">
          <div className="flex items-center gap-3"><Avatar initials="EM" color="from-rose-500 to-orange-400" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-slate-800 dark:text-zinc-100">Ella Merry</p><span className="text-xs text-slate-400">10:24</span></div><p className="truncate text-xs text-slate-500">The game night plan looks great!</p></div><span className="h-2 w-2 rounded-full bg-violet-500" /></div>
          <p className="mt-3 text-sm text-slate-500"><span className="font-semibold text-violet-600 dark:text-violet-300">3 unread</span> conversations need you.</p>
        </Widget>

        <Widget title="Upcoming events" icon={CalendarDays} action="Calendar">
          <div className="space-y-2.5">{events.map(event => <div key={event.title} className="flex gap-3"><div className="w-10 rounded-lg bg-violet-100 py-1 text-center dark:bg-violet-900/60"><p className="text-sm font-bold text-violet-700 dark:text-violet-200">{event.day}</p><p className="text-[9px] font-bold tracking-wide text-violet-500">{event.month}</p></div><div><p className="text-sm font-semibold text-slate-800 dark:text-zinc-100">{event.title}</p><p className="text-xs text-slate-500">{event.time}</p></div></div>)}</div>
        </Widget>

        <Widget title="Your score" icon={Trophy} action="Leaderboard">
          <div className="flex items-end justify-between rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:from-amber-950/30 dark:to-orange-950/20"><div><p className="text-3xl font-bold text-amber-600 dark:text-amber-300">1,240</p><p className="text-xs text-slate-500">Workshop points</p></div><div className="text-right"><p className="text-sm font-bold text-slate-800 dark:text-zinc-100">#14</p><p className="text-xs text-emerald-600 dark:text-emerald-400">↑ 3 this week</p></div></div>
        </Widget>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => { const Icon = tab.icon; const isActive = activeTab === tab.id; return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}><Icon className="h-4 w-4" />{tab.label}</button>; })}
        </div>
      </div>

      {activeTab === 'overview' && <DashboardOverview />}
      {activeTab === 'activity' && <DashboardActivity />}
      {activeTab === 'insights' && <DashboardInsights />}
      {activeTab === 'settings' && <DashboardSettings />}
    </div>
  );
}

function RecentActivity({ userId }: { userId?: string }) {
  const [items, setItems] = useState<RecentActivityItem[]>([]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    Promise.all([
      supabase
        .from('activity_events')
        .select('id, kind, title, detail, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('notification_events')
        .select('id, kind, title, body, created_at')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(6),
    ]).then(([activityResult, notificationResult]) => {
      if (!active) return;
      const activityItems: RecentActivityItem[] = (activityResult.data || []).map((item) => ({
        id: `activity-${item.id}`,
        text: item.detail ? `${item.title}: ${item.detail}` : item.title,
        createdAt: item.created_at,
        tone: item.kind === 'comment' ? 'bg-fuchsia-500' : 'bg-violet-500',
      }));
      const notificationItems: RecentActivityItem[] = (notificationResult.data || []).map((item) => ({
        id: `notification-${item.id}`,
        text: item.body ? `${item.title}: ${item.body}` : item.title,
        createdAt: item.created_at,
        tone: item.kind === 'friend_request' ? 'bg-sky-500' : 'bg-violet-500',
      }));
      setItems([...activityItems, ...notificationItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ).slice(0, 3));
    });
    return () => { active = false; };
  }, [userId]);

  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-zinc-400">No recent activity yet.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const minutes = Math.max(0, Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 60000));
        const time = minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} hr ago` : `${Math.floor(minutes / 1440)} days ago`;
        return (
          <div key={item.id} className="flex gap-3">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.tone}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">{item.text}</p>
              <p className="mt-0.5 text-xs text-slate-500">{time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Widget({ title, icon: Icon, action, children }: { title: string; icon: React.ElementType; action: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-slate-900 dark:text-zinc-100"><span className="rounded-lg bg-violet-100 p-2 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300"><Icon className="h-4 w-4" /></span><h2 className="text-sm font-bold">{title}</h2></div><button className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-300">{action}<ChevronRight className="h-3.5 w-3.5" /></button></div>{children}</section>;
}

function Avatar({ initials, color }: { initials: string; color: string }) { return <span className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${color} text-xs font-bold text-white`}>{initials}</span>; }
function SparkleDecoration() { return <div aria-hidden="true" className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-violet-300/30 blur-2xl dark:bg-violet-500/20" />; }
