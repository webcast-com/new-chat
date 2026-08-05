import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Post, Profile } from '../lib/supabase';
import {
  Bell, BellOff, Check, Copy, Edit3, Hash, Loader2, LogOut, Megaphone, MessageSquarePlus, MoreHorizontal,
  Plus, Search, Send, Shield, Trash2, UserMinus, UserPlus, Users, X,
} from 'lucide-react';
import SharedPostCard from './SharedPostCard';
import AuthPrompt from './AuthPrompt';

type GroupRole = 'owner' | 'admin' | 'member';

interface GroupInfo {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  invite_code: string | null;
  avatar_url: string | null;
  created_at: string;
  member_count: number;
  my_role: GroupRole;
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  kind?: 'message' | 'broadcast';
  broadcast_by?: string | null;
  shared_post_id?: string | null;
  shared_post?: Post | null;
}

interface GroupMember {
  user_id: string;
  role: GroupRole;
  joined_at: string;
  broadcast_muted?: boolean;
  profile?: Profile;
}

function makeInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const values = new Uint32Array(8);
  crypto.getRandomValues(values);
  for (const v of values) code += alphabet[v % alphabet.length];
  return code;
}

function formatTime(dateString: string) {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Groups() {
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Compose
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  // Broadcast (owner/admin)
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  // Members / invite / edit
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState<Profile[]>([]);
  const [inviteSearching, setInviteSearching] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [joinNotice, setJoinNotice] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const joiningRef = useRef(false);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || null,
    [groups, selectedGroupId]
  );

  const loadGroups = useCallback(async () => {
    if (!user) return;
    try {
      const { data: memberships } = await supabase
        .from('chat_group_members')
        .select('group_id, role')
        .eq('user_id', user.id);

      const ids = (memberships || []).map((m) => m.group_id);
      if (ids.length === 0) {
        setGroups([]);
        return;
      }
      const { data: groupsData, error } = await supabase
        .from('chat_groups')
        .select('*, chat_group_members(count)')
        .in('id', ids)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const roleMap = new Map((memberships || []).map((m) => [m.group_id, m.role as GroupRole]));
      setGroups((groupsData || []).map((g) => ({
        id: g.id,
        owner_id: g.owner_id,
        name: g.name,
        description: g.description,
        invite_code: g.invite_code,
        avatar_url: g.avatar_url,
        created_at: g.created_at,
        member_count: (g.chat_group_members as unknown as { count: number }[])?.length ?? 0,
        my_role: roleMap.get(g.id) ?? 'member',
      })));
    } catch (error) {
      console.error('Error loading groups:', error);
      setErrorMessage('Unable to load your groups.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMessages = useCallback(async (groupId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('chat_group_messages')
        .select('*, shared_post:shared_post_id(*, profiles(*))')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages((data || []) as GroupMessage[]);
    } catch (error) {
      console.error('Error loading messages:', error);
      setErrorMessage('Unable to load messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadMembers = useCallback(async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_group_members')
        .select('user_id, role, joined_at, broadcast_muted')
        .eq('group_id', groupId);
      if (error) throw error;

      const ids = (data || []).map((m) => m.user_id);
      let profiles: Profile[] = [];
      if (ids.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', ids);
        profiles = (profilesData || []) as Profile[];
      }
      const profileMap = new Map(profiles.map((p) => [p.id, p]));
      setMembers((data || []).map((m) => ({
        user_id: m.user_id,
        role: m.role as GroupRole,
        joined_at: m.joined_at,
        broadcast_muted: m.broadcast_muted ?? false,
        profile: profileMap.get(m.user_id),
      })));
    } catch (error) {
      console.error('Error loading members:', error);
    }
  }, []);

  // Initial load + join-by-invite handling (#join-CODE hash)
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void loadGroups();
    const match = window.location.hash.match(/^#join-([A-Za-z0-9]+)$/);
    if (match && !joiningRef.current) {
      joiningRef.current = true;
      const code = match[1].toUpperCase();
      (async () => {
        try {
          const { data, error } = await supabase.rpc('join_group_with_invite', { p_invite_code: code });
          if (error) throw error;
          setJoinNotice(`You joined the group! 🎉`);
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          await loadGroups();
          if (data) setSelectedGroupId(data as string);
        } catch (error) {
          console.error('Error joining group:', error);
          setErrorMessage('That invite code is invalid or expired.');
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } finally {
          joiningRef.current = false;
        }
      })();
    }
  }, [user, loadGroups]);

  // Select first group after load
  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    } else if (groups.length === 0 && selectedGroupId) {
      setSelectedGroupId(null);
    }
  }, [groups, selectedGroupId]);

  // Load messages + members for the selected group
  useEffect(() => {
    if (!selectedGroupId || !user) {
      setMessages([]);
      setMembers([]);
      return;
    }
    void loadMessages(selectedGroupId);
    void loadMembers(selectedGroupId);

    const channel = supabase
      .channel(`group-messages:${selectedGroupId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_group_messages', filter: `group_id=eq.${selectedGroupId}` },
        ({ new: message }) => {
          setMessages((current) =>
            current.some((m) => m.id === (message as GroupMessage).id)
              ? current
              : [...current, message as GroupMessage]
          );
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [selectedGroupId, user, loadMessages, loadMembers]);

  // Live member-list updates
  useEffect(() => {
    if (!selectedGroupId || !user) return;
    const channel = supabase
      .channel(`group-members:${selectedGroupId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_group_members', filter: `group_id=eq.${selectedGroupId}` },
        () => {
          void loadMembers(selectedGroupId);
          void loadGroups();
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [selectedGroupId, user, loadMembers, loadGroups]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !newName.trim() || creating) return;
    setCreating(true);
    setErrorMessage('');
    const inviteCode = makeInviteCode();
    try {
      const { data, error } = await supabase
        .from('chat_groups')
        .insert({
          owner_id: user.id,
          name: newName.trim(),
          description: newDescription.trim(),
          invite_code: inviteCode,
        })
        .select('id')
        .single();
      if (error) throw error;

      const { error: membershipError } = await supabase
        .from('chat_group_members')
        .insert({ group_id: data.id, user_id: user.id, role: 'owner' });
      if (membershipError) throw membershipError;

      setNewName('');
      setNewDescription('');
      setShowCreate(false);
      await loadGroups();
      setSelectedGroupId(data.id);
    } catch (error) {
      console.error('Error creating group:', error);
      setErrorMessage('Unable to create the group.');
    } finally {
      setCreating(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!selectedGroup || !user || !trimmed || sending) return;
    setSending(true);
    setErrorMessage('');
    try {
      const { error } = await supabase
        .from('chat_group_messages')
        .insert({ group_id: selectedGroup.id, sender_id: user.id, content: trimmed });
      if (error) throw error;
      setContent('');
    } catch (error) {
      console.error('Error sending message:', error);
      setErrorMessage('Unable to send the message.');
    } finally {
      setSending(false);
    }
  };

  // ── Broadcast (owner/admin) ──
  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = broadcastContent.trim();
    if (!selectedGroup || !user || !trimmed || broadcasting) return;
    setBroadcasting(true);
    setErrorMessage('');
    setBroadcastResult(null);
    try {
      // Prefer the edge function (inserts the row AND sends web push to
      // non-muted members). Falls back to a direct insert when the function
      // is not deployed — the message still appears, just without pushes.
      let sent = false;
      try {
        const { data, error } = await supabase.functions.invoke('group-broadcast', {
          body: { groupId: selectedGroup.id, content: trimmed },
        });
        if (error) throw error;
        if (data?.ok) {
          sent = true;
          setBroadcastResult(
            `Broadcast sent to ${selectedGroup.member_count} members` +
            (typeof data.delivered === 'number' && data.delivered > 0 ? ` · ${data.delivered} push${data.delivered === 1 ? '' : 'es'} delivered` : '')
          );
        }
      } catch {
        // fall through to direct insert
      }
      if (!sent) {
        const { error } = await supabase
          .from('chat_group_messages')
          .insert({
            group_id: selectedGroup.id,
            sender_id: user.id,
            content: trimmed,
            kind: 'broadcast',
            broadcast_by: user.id,
          });
        if (error) throw error;
        setBroadcastResult('Broadcast sent (push notifications unavailable).');
      }
      setBroadcastContent('');
      setBroadcastOpen(false);
      window.setTimeout(() => setBroadcastResult(null), 5000);
    } catch (error) {
      console.error('Error sending broadcast:', error);
      setErrorMessage('Unable to send the broadcast.');
    } finally {
      setBroadcasting(false);
    }
  };

  const toggleBroadcastMute = async (target: GroupMember) => {
    if (!selectedGroup || !user || memberBusyId) return;
    setMemberBusyId(target.user_id);
    setErrorMessage('');
    try {
      const nextMuted = !target.broadcast_muted;
      const { error } = await supabase
        .from('chat_group_members')
        .update({ broadcast_muted: nextMuted })
        .eq('group_id', selectedGroup.id)
        .eq('user_id', target.user_id);
      if (error) throw error;
      await loadMembers(selectedGroup.id);
    } catch (error) {
      console.error('Error updating broadcast mute:', error);
      setErrorMessage('Unable to update broadcast settings.');
    } finally {
      setMemberBusyId(null);
    }
  };

  // ── Invite by username search ──
  const searchInvites = async (query: string) => {
    setInviteQuery(query);
    if (!query.trim() || !user || !selectedGroup) return;
    setInviteSearching(true);
    const q = query.trim().toLowerCase();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .ilike('username', `%${q}%`)
      .limit(8);
    setInviteResults((data || []) as Profile[]);
    setInviteSearching(false);
  };

  const inviteMember = async (target: Profile) => {
    if (!user || !selectedGroup || !target) return;
    setMemberBusyId(target.id);
    setErrorMessage('');
    try {
      const { error } = await supabase
        .from('chat_group_members')
        .insert({ group_id: selectedGroup.id, user_id: target.id, role: 'member' });
      if (error) throw error;
      await Promise.all([loadMembers(selectedGroup.id), loadGroups()]);
    } catch (error) {
      console.error('Error inviting member:', error);
      setErrorMessage(`Unable to invite @${target.username}.`);
    } finally {
      setMemberBusyId(null);
      setInviteQuery('');
      setInviteResults([]);
      setInviteOpen(false);
    }
  };

  const copyInviteLink = async () => {
    if (!selectedGroup?.invite_code) return;
    const url = `${window.location.origin}${window.location.pathname}#join-${selectedGroup.invite_code}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } catch {
      setErrorMessage('Unable to copy the invite link.');
    }
  };

  const regenerateInvite = async () => {
    if (!selectedGroup || !user) return;
    setErrorMessage('');
    try {
      const { error } = await supabase
        .from('chat_groups')
        .update({ invite_code: makeInviteCode() })
        .eq('id', selectedGroup.id);
      if (error) throw error;
      await loadGroups();
    } catch (error) {
      console.error('Error regenerating invite:', error);
      setErrorMessage('Unable to regenerate the invite code.');
    }
  };

  const saveGroupEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !user || !editName.trim() || savingEdit) return;
    setSavingEdit(true);
    setErrorMessage('');
    try {
      const { error } = await supabase
        .from('chat_groups')
        .update({ name: editName.trim(), description: editDescription.trim() })
        .eq('id', selectedGroup.id);
      if (error) throw error;
      setEditingGroup(false);
      await loadGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      setErrorMessage('Unable to update the group.');
    } finally {
      setSavingEdit(false);
    }
  };

  const canManage = (role?: GroupRole) => role === 'owner' || role === 'admin';

  const updateRole = async (target: GroupMember, newRole: GroupRole) => {
    if (!selectedGroup || !user || memberBusyId) return;
    setMemberBusyId(target.user_id);
    setErrorMessage('');
    try {
      const { error } = await supabase
        .from('chat_group_members')
        .update({ role: newRole })
        .eq('group_id', selectedGroup.id)
        .eq('user_id', target.user_id);
      if (error) throw error;
      await Promise.all([loadMembers(selectedGroup.id), loadGroups()]);
    } catch (error) {
      console.error('Error updating role:', error);
      setErrorMessage('Unable to update the member role.');
    } finally {
      setMemberBusyId(null);
    }
  };

  const removeMember = async (target: GroupMember) => {
    if (!selectedGroup || !user || memberBusyId) return;
    setMemberBusyId(target.user_id);
    setErrorMessage('');
    try {
      const { error } = await supabase
        .from('chat_group_members')
        .delete()
        .eq('group_id', selectedGroup.id)
        .eq('user_id', target.user_id);
      if (error) throw error;
      await Promise.all([loadMembers(selectedGroup.id), loadGroups()]);
    } catch (error) {
      console.error('Error removing member:', error);
      setErrorMessage('Unable to remove the member.');
    } finally {
      setMemberBusyId(null);
    }
  };

  const leaveGroup = async () => {
    if (!selectedGroup || !user || memberBusyId) return;
    setMemberBusyId('__leave__');
    setErrorMessage('');
    try {
      const { error } = await supabase
        .from('chat_group_members')
        .delete()
        .eq('group_id', selectedGroup.id)
        .eq('user_id', user.id);
      if (error) throw error;
      setSelectedGroupId(null);
      await loadGroups();
    } catch (error) {
      console.error('Error leaving group:', error);
      setErrorMessage('Unable to leave the group.');
    } finally {
      setMemberBusyId(null);
    }
  };

  const deleteGroup = async () => {
    if (!selectedGroup || !user || memberBusyId) return;
    if (!window.confirm(`Delete "${selectedGroup.name}"? This cannot be undone.`)) return;
    setMemberBusyId('__delete__');
    setErrorMessage('');
    try {
      const { error } = await supabase
        .from('chat_groups')
        .delete()
        .eq('id', selectedGroup.id);
      if (error) throw error;
      setSelectedGroupId(null);
      await loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      setErrorMessage('Unable to delete the group.');
    } finally {
      setMemberBusyId(null);
    }
  };

  // ── Guest state ──
  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Users className="mx-auto mb-3 h-12 w-12 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-900">Groups</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          Create group chats, invite friends, and manage members — sign in to get started.
        </p>
        <button
          onClick={() => setShowAuthPrompt(true)}
          className="mt-5 rounded-lg bg-violet-600 px-5 py-2 font-semibold text-white transition hover:bg-violet-500"
        >
          Sign in
        </button>
        <AuthPrompt isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} action="use groups" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {joinNotice && (
        <div className="flex items-center justify-between gap-2 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
          <span>{joinNotice}</span>
          <button onClick={() => setJoinNotice(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center justify-between gap-2 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="flex min-h-[420px] flex-col sm:flex-row">
        {/* ── Group list pane ── */}
        <div className={`w-full border-b border-slate-200 sm:w-60 sm:border-b-0 sm:border-r ${selectedGroup ? 'hidden sm:block' : ''}`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Your groups</h2>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="rounded-lg bg-violet-600 p-1.5 text-white transition hover:bg-violet-500"
              aria-label="Create group"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {showCreate && (
            <form onSubmit={createGroup} className="space-y-2 border-b border-slate-100 p-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Group name"
                maxLength={80}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="What is this group about? (optional)"
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                Create group
              </button>
            </form>
          )}

          <div className="max-h-72 overflow-y-auto p-2 sm:max-h-[420px]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : groups.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-zinc-400">
                No groups yet — create one to start chatting.
              </p>
            ) : (
              groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`mb-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                    selectedGroupId === group.id ? 'bg-violet-50 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:ring-violet-800' : 'hover:bg-slate-50 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
                    {group.avatar_url ? (
                      <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      group.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-zinc-100">{group.name}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3 w-3" /> {group.member_count}
                      {group.my_role !== 'member' && (
                        <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                          {group.my_role}
                        </span>
                      )}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Chat pane ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!selectedGroup ? (
            <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-slate-400">
              <Users className="mb-3 h-12 w-12 text-slate-200" />
              <p className="text-sm">Select a group or create a new one to start chatting.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-zinc-800">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-bold text-slate-900 dark:text-zinc-100">{selectedGroup.name}</h3>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${selectedGroup.my_role === 'owner' ? 'bg-amber-100 text-amber-700' : selectedGroup.my_role === 'admin' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                      {selectedGroup.my_role}
                    </span>
                  </div>
                  {selectedGroup.description && (
                    <p className="truncate text-xs text-slate-500">{selectedGroup.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canManage(selectedGroup.my_role) && (
                    <button
                      onClick={() => { setBroadcastOpen(!broadcastOpen); setBroadcastResult(null); }}
                      className={`rounded-lg p-2 transition ${broadcastOpen ? 'bg-amber-100 text-amber-600' : 'text-slate-500 hover:bg-amber-50 hover:text-amber-600'}`}
                      title="Broadcast to group"
                      aria-label="Broadcast to group"
                    >
                      <Megaphone className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setInviteOpen(!inviteOpen)}
                    className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-600"
                    title="Invite members"
                    aria-label="Invite members"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                  {canManage(selectedGroup.my_role) && (
                    <>
                      <button
                        onClick={() => { setEditingGroup(!editingGroup); setEditName(selectedGroup.name); setEditDescription(selectedGroup.description || ''); }}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-600"
                        title="Edit group"
                        aria-label="Edit group"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenFor(menuOpenFor === 'group' ? null : 'group')}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                          aria-label="Group options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuOpenFor === 'group' && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpenFor(null)} />
                            <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                              <button onClick={() => void regenerateInvite()} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                                <Hash className="h-3.5 w-3.5" /> New invite code
                              </button>
                              {selectedGroup.my_role === 'owner' && (
                                <button onClick={() => void deleteGroup()} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-3.5 w-3.5" /> Delete group
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Edit form */}
              {editingGroup && (
                <form onSubmit={saveGroupEdit} className="space-y-2 border-b border-slate-100 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={80}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500"
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={savingEdit || !editName.trim()} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                      {savingEdit ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" onClick={() => setEditingGroup(false)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Broadcast composer (owner/admin) */}
              {broadcastOpen && (
                <form onSubmit={sendBroadcast} className="border-b border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700">
                      <Megaphone className="h-3.5 w-3.5" /> Broadcast to {selectedGroup.member_count} members
                    </p>
                    <button type="button" onClick={() => setBroadcastOpen(false)} aria-label="Close broadcast composer">
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                  <textarea
                    value={broadcastContent}
                    onChange={(e) => setBroadcastContent(e.target.value)}
                    placeholder="Announcement for the whole group — sent to everyone (with push), not just the chat…"
                    rows={2}
                    maxLength={2000}
                    autoFocus
                    className="w-full resize-none rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-amber-800 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  {broadcastResult && (
                    <p className="mt-1.5 text-xs font-medium text-emerald-700">{broadcastResult}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      type="submit"
                      disabled={broadcasting || !broadcastContent.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:opacity-50"
                    >
                      {broadcasting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                      {broadcasting ? 'Broadcasting…' : 'Send broadcast'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBroadcastOpen(false)}
                      className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Invite panel */}
              {inviteOpen && (
                <div className="border-b border-slate-100 bg-violet-50/60 p-3 dark:border-zinc-800 dark:bg-violet-950/30">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Invite members</p>
                    <button onClick={() => setInviteOpen(false)} aria-label="Close invite panel"><X className="h-4 w-4 text-slate-400" /></button>
                  </div>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      value={inviteQuery}
                      onChange={(e) => void searchInvites(e.target.value)}
                      placeholder="Search by username…"
                      className="w-full rounded-lg border border-violet-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
                    />
                  </div>
                  {inviteSearching ? (
                    <div className="flex items-center gap-2 py-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…</div>
                  ) : inviteQuery && inviteResults.length === 0 ? (
                    <p className="py-2 text-xs text-slate-500">No users found.</p>
                  ) : (
                    <div className="space-y-1">
                      {inviteResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => void inviteMember(result)}
                          disabled={memberBusyId === result.id}
                          className="flex w-full items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-left text-sm shadow-sm transition hover:bg-violet-100 disabled:opacity-50"
                        >
                          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white">
                            {result.avatar_url ? <img src={result.avatar_url} alt="" className="h-full w-full object-cover" /> : result.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-800">@{result.username}</span>
                          {memberBusyId === result.id ? <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" /> : <UserPlus className="h-3.5 w-3.5 text-violet-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2.5 border-t border-violet-200/70 pt-2.5">
                    <p className="mb-1.5 text-xs font-semibold text-violet-700">Or share an invite link</p>
                    <div className="flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-600 ring-1 ring-violet-200">
                        {selectedGroup.invite_code ? `#join-${selectedGroup.invite_code}` : 'No invite code'}
                      </code>
                      <button
                        onClick={() => void copyInviteLink()}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
                      >
                        {copiedInvite ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedInvite ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50/70 p-3 dark:bg-zinc-950/40" style={{ maxHeight: '420px' }}>
                {loadingMessages ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-400 dark:text-zinc-500">No messages yet — start the conversation.</p>
                ) : (
                  messages.map((message) => {
                    const isMine = message.sender_id === user.id;
                    // Phase 5 — broadcasts render as full-width announcement cards
                    if (message.kind === 'broadcast') {
                      return (
                        <div key={message.id} className="my-2 overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
                          <div className="flex items-center gap-1.5 border-b border-amber-100 bg-amber-100/70 px-3 py-1.5">
                            <Megaphone className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Broadcast</span>
                            <span className="ml-auto text-[10px] text-amber-600/80">{formatTime(message.created_at)}</span>
                          </div>
                          <div className="px-3 py-2.5">
                            <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-zinc-100">{message.content}</p>
                            {(message.shared_post || message.shared_post_id) && (
                              <div className="mt-2">
                                <SharedPostCard post={message.shared_post} postId={message.shared_post_id} compact />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] ${message.shared_post ? '' : ''}`}>
                          <p className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${isMine ? 'bg-violet-600 text-white' : 'bg-white text-slate-800 dark:bg-zinc-800 dark:text-zinc-100'}`}>
                            {message.content}
                          </p>
                          {(message.shared_post || message.shared_post_id) && (
                            <div className="mt-1.5">
                              <SharedPostCard post={message.shared_post} postId={message.shared_post_id} compact />
                            </div>
                          )}
                          <p className={`mt-0.5 px-1 text-[10px] ${isMine ? 'text-right text-violet-300' : 'text-slate-400'}`}>{formatTime(message.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose */}
              <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Message ${selectedGroup.name}…`}
                  maxLength={2000}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <button
                  type="submit"
                  disabled={sending || !content.trim()}
                  aria-label="Send group message"
                  className="rounded-lg bg-violet-600 p-2 text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </button>
              </form>

              {/* Members strip */}
              <div className="border-t border-slate-100 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <Users className="h-3.5 w-3.5" /> Members · {members.length}
                  </p>
                  {selectedGroup.my_role !== 'owner' && (
                    <button
                      onClick={() => void leaveGroup()}
                      disabled={memberBusyId === '__leave__'}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-400 transition hover:text-red-600 disabled:opacity-50"
                    >
                      {memberBusyId === '__leave__' ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                      Leave
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {members.map((member) => {
                    const isMe = member.user_id === user.id;
                    const isOwner = member.role === 'owner';
                    const busy = memberBusyId === member.user_id;
                    return (
                      <div key={member.user_id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-slate-50 dark:hover:bg-zinc-800/60">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-xs font-bold text-white">
                          {member.profile?.avatar_url ? (
                            <img src={member.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            (member.profile?.username || '?').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-zinc-200">
                            {member.profile?.username || 'Member'}
                            {isMe && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                          </p>
                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            {member.role === 'owner' ? <Shield className="h-3 w-3 text-amber-500" /> : member.role === 'admin' ? <Shield className="h-3 w-3 text-sky-500" /> : <Users className="h-3 w-3" />}
                            {member.role}
                          </p>
                        </div>
                        {(isMe || canManage(selectedGroup.my_role)) && !isOwner && (
                          <button
                            onClick={() => void toggleBroadcastMute(member)}
                            disabled={busy}
                            title={member.broadcast_muted ? 'Unmute broadcasts' : 'Mute broadcasts'}
                            aria-label={member.broadcast_muted ? 'Unmute broadcasts' : 'Mute broadcasts'}
                            className={`rounded-md p-1 transition disabled:opacity-50 ${
                              member.broadcast_muted
                                ? 'text-amber-500 hover:bg-amber-50'
                                : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'
                            }`}
                          >
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : member.broadcast_muted ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        {!isMe && canManage(selectedGroup.my_role) && !isOwner && (
                          <div className="flex shrink-0 items-center gap-1">
                            {member.role === 'member' && canManage(selectedGroup.my_role) && (
                              <button
                                onClick={() => void updateRole(member, 'admin')}
                                disabled={busy}
                                title="Make admin"
                                className="rounded-md p-1 text-slate-400 transition hover:bg-sky-50 hover:text-sky-600 disabled:opacity-50"
                              >
                                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                              </button>
                            )}
                            {member.role === 'admin' && selectedGroup.my_role === 'owner' && (
                              <button
                                onClick={() => void updateRole(member, 'member')}
                                disabled={busy}
                                title="Demote to member"
                                className="rounded-md p-1 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
                              >
                                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                              </button>
                            )}
                            <button
                              onClick={() => void removeMember(member)}
                              disabled={busy}
                              title="Remove from group"
                              className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
