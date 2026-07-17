import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Activity, Bell, CalendarClock, Flag, Lock, MessageSquarePlus, Plus, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Tab = 'notifications' | 'groups' | 'schedule' | 'activity' | 'privacy' | 'moderation';

type Notification = { id: string; kind: string; title: string; body: string; read_at: string | null; created_at: string };
type Group = { id: string; name: string; description: string; created_at: string };
type ScheduledPost = { id: string; content: string; scheduled_for: string; published_at: string | null };
type ActivityEvent = { id: string; kind: string; title: string; detail: string; created_at: string };

const tabs = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'groups', label: 'Group chats', icon: Users },
  { id: 'schedule', label: 'Scheduled posts', icon: CalendarClock },
  { id: 'activity', label: 'Activity timeline', icon: Activity },
  { id: 'privacy', label: 'Privacy', icon: Lock },
  { id: 'moderation', label: 'Moderation', icon: Flag },
] as const;

export default function FutureEnhancements() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('notifications');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Community tools</h1>
        <p className="mt-1 text-sm text-slate-600">Stay informed, plan ahead, and keep your community healthy.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${activeTab === id ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
      </div>
      {profile && activeTab === 'notifications' && <Notifications userId={profile.id} />}
      {profile && activeTab === 'groups' && <Groups userId={profile.id} />}
      {profile && activeTab === 'schedule' && <Schedule userId={profile.id} />}
      {profile && activeTab === 'activity' && <ActivityTimeline userId={profile.id} />}
      {profile && activeTab === 'privacy' && <Privacy userId={profile.id} />}
      {profile && activeTab === 'moderation' && <Moderation userId={profile.id} />}
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{children}</section>;
}

function Notifications({ userId }: { userId: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => { load(); }, [userId]);
  const load = async () => { const { data } = await supabase.from('notification_events').select('*').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(50); setItems(data || []); };
  const markAllRead = async () => { await supabase.from('notification_events').update({ read_at: new Date().toISOString() }).eq('recipient_id', userId).is('read_at', null); load(); };
  return <Panel><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Notification center</h2><p className="text-sm text-slate-500">Likes, comments, friend requests, and messages in one place.</p></div><button onClick={markAllRead} className="text-sm font-semibold text-violet-600 hover:text-violet-800">Mark all read</button></div>{items.length === 0 ? <Empty text="You’re all caught up." /> : <div className="space-y-2">{items.map((item) => <div key={item.id} className={`rounded-xl border p-4 ${item.read_at ? 'border-slate-100 bg-white' : 'border-violet-100 bg-violet-50'}`}><div className="flex items-start gap-3"><Bell className="mt-0.5 h-4 w-4 text-violet-600" /><div><p className="font-medium text-slate-900">{item.title}</p><p className="text-sm text-slate-600">{item.body}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p></div></div></div>)}</div>}</Panel>;
}

function Groups({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { const { data } = await supabase.from('chat_groups').select('*').or(`owner_id.eq.${userId},chat_group_members.user_id.eq.${userId}`).order('created_at', { ascending: false }); setGroups(data || []); };
  useEffect(() => { load(); }, [userId]);
  const create = async (event: FormEvent) => { event.preventDefault(); if (!name.trim()) return; setBusy(true); const { data, error } = await supabase.from('chat_groups').insert({ owner_id: userId, name: name.trim(), description: description.trim() }).select().single(); if (!error && data) { await supabase.from('chat_group_members').insert({ group_id: data.id, user_id: userId }); setName(''); setDescription(''); load(); } setBusy(false); };
  return <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]"><Panel><h2 className="mb-1 text-lg font-bold text-slate-900">Create a group chat</h2><p className="mb-4 text-sm text-slate-500">Start a shared conversation and invite friends from the group.</p><form onSubmit={create} className="space-y-3"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" maxLength={80} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this group about?" rows={3} className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" /><button disabled={busy || !name.trim()} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{busy ? 'Creating...' : 'Create group'}</button></form></Panel><Panel><h2 className="mb-4 text-lg font-bold text-slate-900">Your groups</h2>{groups.length === 0 ? <Empty text="No group chats yet." /> : <div className="space-y-3">{groups.map((group) => <div key={group.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-100 p-2 text-violet-700"><MessageSquarePlus className="h-5 w-5" /></div><div><p className="font-semibold text-slate-900">{group.name}</p><p className="text-sm text-slate-500">{group.description || 'No description yet'}</p></div></div></div>)}</div>}</Panel></div>;
}

function Schedule({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [content, setContent] = useState('');
  const [scheduledFor, setScheduledFor] = useState('');
  const load = async () => { const { data } = await supabase.from('scheduled_posts').select('*').eq('user_id', userId).order('scheduled_for'); setPosts(data || []); };
  useEffect(() => { load(); }, [userId]);
  const schedule = async (event: FormEvent) => { event.preventDefault(); if (!content.trim() || !scheduledFor) return; const { error } = await supabase.from('scheduled_posts').insert({ user_id: userId, content: content.trim(), scheduled_for: new Date(scheduledFor).toISOString() }); if (!error) { setContent(''); setScheduledFor(''); load(); } };
  return <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]"><Panel><h2 className="mb-1 text-lg font-bold text-slate-900">Schedule a post</h2><p className="mb-4 text-sm text-slate-500">Queue a post for the time your audience is ready to see it.</p><form onSubmit={schedule} className="space-y-3"><textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your post..." rows={5} className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" /><input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full rounded-lg border border-slate-300 px-3 py-2" /><button disabled={!content.trim() || !scheduledFor} className="rounded-lg bg-violet-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Schedule post</button></form></Panel><Panel><h2 className="mb-4 text-lg font-bold text-slate-900">Upcoming posts</h2>{posts.length === 0 ? <Empty text="Your queue is empty." /> : <div className="space-y-3">{posts.map((post) => <div key={post.id} className="rounded-xl border border-slate-200 p-4"><p className="text-slate-800">{post.content}</p><p className="mt-2 text-sm font-medium text-violet-600">{new Date(post.scheduled_for).toLocaleString()}</p></div>)}</div>}</Panel></div>;
}

function ActivityTimeline({ userId }: { userId: string }) {
  const [items, setItems] = useState<ActivityEvent[]>([]);
  useEffect(() => { supabase.from('activity_events').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100).then(({ data }) => setItems(data || [])); }, [userId]);
  return <Panel><h2 className="mb-1 text-lg font-bold text-slate-900">Activity timeline</h2><p className="mb-4 text-sm text-slate-500">A chronological view of what is happening around your account.</p>{items.length === 0 ? <Empty text="Your activity timeline will appear here." /> : <div className="space-y-4">{items.map((item) => <div key={item.id} className="flex gap-3 border-l-2 border-violet-200 pl-4"><div><p className="font-medium text-slate-900">{item.title}</p><p className="text-sm text-slate-600">{item.detail}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p></div></div>)}</div>}</Panel>;
}

function Privacy({ userId }: { userId: string }) {
  const [settings, setSettings] = useState({ profile_visibility: 'public', allow_friend_requests: true, allow_messages: true, show_activity: true });
  const [saved, setSaved] = useState(false);
  useEffect(() => { supabase.from('user_privacy_settings').select('*').eq('user_id', userId).maybeSingle().then(({ data }) => { if (data) setSettings({ profile_visibility: data.profile_visibility, allow_friend_requests: data.allow_friend_requests, allow_messages: data.allow_messages, show_activity: data.show_activity }); }); }, [userId]);
  const update = async (next: typeof settings) => { setSettings(next); setSaved(false); const { error } = await supabase.from('user_privacy_settings').upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() }); if (!error) setSaved(true); };
  return <Panel><h2 className="mb-1 text-lg font-bold text-slate-900">Server-enforced privacy</h2><p className="mb-5 text-sm text-slate-500">These settings are stored with your account and can be enforced by database policies.</p><div className="space-y-3"><label className="block text-sm font-medium text-slate-700">Profile visibility<select value={settings.profile_visibility} onChange={(e) => update({ ...settings, profile_visibility: e.target.value })} className="mt-1 block w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2"><option value="public">Everyone</option><option value="friends">Friends only</option><option value="private">Only me</option></select></label>{[['allow_friend_requests', 'Allow friend requests'], ['allow_messages', 'Allow direct messages'], ['show_activity', 'Show my activity timeline']].map(([key, label]) => <label key={key} className="flex max-w-xl items-center justify-between rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-700">{label}<input type="checkbox" checked={settings[key as keyof typeof settings] as boolean} onChange={(e) => update({ ...settings, [key]: e.target.checked })} className="h-5 w-5 accent-violet-600" /></label>)}</div>{saved && <p className="mt-4 text-sm font-medium text-emerald-600">Privacy settings saved.</p>}</Panel>;
}

function Moderation({ userId }: { userId: string }) {
  const [targetType, setTargetType] = useState('post');
  const [targetId, setTargetId] = useState('');
  const [reason, setReason] = useState('');
  const [sent, setSent] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!targetId.trim() || reason.trim().length < 3) return; const { error } = await supabase.from('moderation_reports').insert({ reporter_id: userId, target_type: targetType, target_id: targetId.trim(), reason: reason.trim() }); if (!error) { setTargetId(''); setReason(''); setSent(true); } };
  return <Panel><h2 className="mb-1 text-lg font-bold text-slate-900">Content moderation</h2><p className="mb-5 text-sm text-slate-500">Report content or accounts that violate community guidelines. Reports are private.</p><form onSubmit={submit} className="max-w-xl space-y-3"><select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="post">Post</option><option value="comment">Comment</option><option value="profile">Profile</option><option value="message">Message</option></select><input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="Content or profile ID" className="w-full rounded-lg border border-slate-300 px-3 py-2" /><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell moderators what happened" rows={4} className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2" /><button disabled={!targetId.trim() || reason.trim().length < 3} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Submit report</button></form>{sent && <p className="mt-4 text-sm font-medium text-emerald-600">Thanks. Your report was submitted for review.</p>}</Panel>;
}

function Empty({ text }: { text: string }) { return <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">{text}</div>; }
