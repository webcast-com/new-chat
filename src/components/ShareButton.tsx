import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Link2, Loader2, MessageCircle, Repeat2, Search, Send, Share2, Users, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AuthPrompt from './AuthPrompt';

interface ShareButtonProps {
  postId: string;
  onShareChange: () => void;
  /** Phase 3 — optional share count shown next to the label. */
  shareCount?: number;
}

type ShareTarget = 'external' | 'feed' | 'dm' | 'group';

interface ChatCandidate {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

interface GroupCandidate {
  id: string;
  name: string;
  description?: string | null;
}

export default function ShareButton({ postId, onShareChange, shareCount }: ShareButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const [repostCaption, setRepostCaption] = useState('');
  const [reposting, setReposting] = useState(false);
  const [picker, setPicker] = useState<null | 'dm' | 'group'>(null);
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<(ChatCandidate | GroupCandidate)[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [pickerDone, setPickerDone] = useState<string | null>(null);
  const shareUrl = (() => {
    const url = new URL(window.location.href);
    url.hash = `post-${postId}`;
    return url.toString();
  })();

  const recordShare = async (target: ShareTarget = 'external', targetId?: string) => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('shares')
        .upsert(
          { post_id: postId, user_id: user.id, target_type: target, ...(targetId ? { target_id: targetId } : {}) },
          { onConflict: 'user_id,post_id', ignoreDuplicates: true },
        );
      if (error) console.warn('Error recording share:', error.message);
      onShareChange();
      return true;
    } catch (error) {
      console.warn('Error recording share:', error);
      return false;
    }
  };

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copiedWithFallback = document.execCommand('copy');
        textarea.remove();
        if (!copiedWithFallback) throw new Error('Copy command was rejected');
      }

      await recordShare('external');
      setCopied(true);
      setShowMenu(false);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying share link:', error);
      setShareError('Unable to copy the link.');
    }
  };

  const handleShare = async () => {
    setShareError('');
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check out this post', url: shareUrl });
        await recordShare('external');
      } catch {
        return;
      }
      return;
    }

    setShowMenu((isOpen) => !isOpen);
  };

  const openSocialShare = async (url: string) => {
    const shareWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!shareWindow) {
      setShareError('Your browser blocked the share window.');
      return;
    }

    await recordShare('external');
    setShowMenu(false);
  };

  // ── Repost to feed ──
  const handleRepost = async () => {
    if (!user || reposting) return;
    setReposting(true);
    setShareError('');
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: repostCaption.trim(),
          shared_post_id: postId,
        })
        .select('id')
        .single();
      if (error) throw error;
      await recordShare('feed', data?.id);
      setRepostOpen(false);
      setRepostCaption('');
      setShowMenu(false);
    } catch (error) {
      console.error('Error reposting:', error);
      setShareError('Unable to repost right now.');
    } finally {
      setReposting(false);
    }
  };

  // ── Picker (DM / group) ──
  const openPicker = async (kind: 'dm' | 'group') => {
    setPicker(kind);
    setSearch('');
    setCandidates([]);
    setPickerDone(null);
    setShareError('');
    setCandidatesLoading(true);
    try {
      if (kind === 'dm' && user) {
        const ids = new Set<string>();
        const [f1, f2, conn] = await Promise.all([
          supabase.from('friendships').select('recipient_id').eq('requester_id', user.id).eq('status', 'accepted'),
          supabase.from('friendships').select('requester_id').eq('recipient_id', user.id).eq('status', 'accepted'),
          supabase.from('connections').select('following_id').eq('follower_id', user.id),
        ]);
        (f1.data || []).forEach(r => ids.add(r.recipient_id));
        (f2.data || []).forEach(r => ids.add(r.requester_id));
        (conn.data || []).forEach(r => ids.add(r.following_id));
        ids.delete(user.id);
        const list = [...ids];
        if (list.length === 0) {
          setCandidates([]);
          return;
        }
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', list)
          .limit(100);
        setCandidates((profiles || []) as ChatCandidate[]);
      } else if (kind === 'group' && user) {
        const { data: memberships } = await supabase
          .from('chat_group_members')
          .select('group_id')
          .eq('user_id', user.id);
        const ids = [...new Set((memberships || []).map(m => m.group_id))];
        if (ids.length === 0) {
          setCandidates([]);
          return;
        }
        const { data: groups } = await supabase
          .from('chat_groups')
          .select('id, name, description')
          .in('id', ids)
          .limit(100);
        setCandidates((groups || []) as GroupCandidate[]);
      }
    } catch (error) {
      console.error('Error loading share targets:', error);
      setShareError('Unable to load contacts.');
    } finally {
      setCandidatesLoading(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(c =>
      'username' in c
        ? c.username.toLowerCase().includes(q) || (c.full_name || '').toLowerCase().includes(q)
        : c.name.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const handlePick = async (candidate: ChatCandidate | GroupCandidate) => {
    if (!user) return;
    setLoading(true);
    setShareError('');
    try {
      if (picker === 'dm') {
        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            recipient_id: candidate.id,
            content: 'Shared a post with you 📎',
            shared_post_id: postId,
          });
        if (error) throw error;
        await recordShare('dm', candidate.id);
      } else if (picker === 'group') {
        const { error } = await supabase
          .from('chat_group_messages')
          .insert({
            group_id: candidate.id,
            sender_id: user.id,
            content: 'Shared a post 📎',
            shared_post_id: postId,
          });
        if (error) throw error;
        await recordShare('group', candidate.id);
      }
      setPickerDone('username' in candidate ? `@${candidate.username}` : candidate.name);
      setTimeout(() => {
        setPicker(null);
        setPickerDone(null);
        setShowMenu(false);
      }, 1400);
    } catch (error) {
      console.error('Error sharing:', error);
      setShareError('Unable to send the shared post.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={handleShare}
          disabled={loading}
          aria-expanded={showMenu}
          aria-haspopup="menu"
          className={`flex items-center gap-2 transition-all px-3 py-2 rounded-lg ${
            copied
              ? 'text-green-600 bg-green-50'
              : 'text-slate-600 hover:bg-slate-100'
          } disabled:opacity-50`}
        >
          {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
          <span className="text-sm font-medium hidden sm:inline">
            {copied ? 'Link Copied!' : 'Share'}
          </span>
          {typeof shareCount === 'number' && shareCount > 0 && (
            <span className="text-xs font-semibold text-slate-400">{shareCount}</span>
          )}
        </button>

        {showMenu && (
          <div className="absolute bottom-full right-0 z-20 mb-2 w-64 rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-xl shadow-black/30" role="menu">
            {repostOpen ? (
              <div className="p-1">
                <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Repost to your feed</p>
                <textarea
                  value={repostCaption}
                  onChange={(e) => setRepostCaption(e.target.value)}
                  placeholder="Say something about this post (optional)"
                  rows={2}
                  maxLength={500}
                  autoFocus
                  className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-violet-500"
                />
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setRepostOpen(false)} className="flex-1 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700">
                    Back
                  </button>
                  <button
                    onClick={() => void handleRepost()}
                    disabled={reposting}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {reposting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
                    Repost
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">Share in-app</p>
                <button onClick={() => setRepostOpen(true)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" role="menuitem">
                  <Repeat2 className="h-4 w-4 text-violet-400" /> Repost to feed
                </button>
                <button onClick={() => void openPicker('dm')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" role="menuitem">
                  <Send className="h-4 w-4 text-sky-400" /> Send in a chat
                </button>
                <button onClick={() => void openPicker('group')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" role="menuitem">
                  <Users className="h-4 w-4 text-emerald-400" /> Send to a group
                </button>

                <div className="my-1.5 border-t border-zinc-800" />
                <button onClick={copyLink} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" role="menuitem">
                  <Copy className="h-4 w-4 text-violet-400" /> Copy link
                </button>
                <button onClick={() => openSocialShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" role="menuitem">
                  <ExternalLink className="h-4 w-4 text-blue-400" /> Facebook
                </button>
                <button onClick={() => openSocialShare(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" role="menuitem">
                  <MessageCircle className="h-4 w-4 text-sky-400" /> X / Twitter
                </button>
                <button onClick={() => openSocialShare(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" role="menuitem">
                  <Link2 className="h-4 w-4 text-emerald-400" /> WhatsApp
                </button>
              </>
            )}
            {shareError && <p className="px-2 pt-1 text-xs text-rose-400">{shareError}</p>}
          </div>
        )}
        {shareError && !showMenu && (
          <p className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow" role="status">
            {shareError}
          </p>
        )}
      </div>

      {/* Picker modal: DM or group */}
      {picker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={picker === 'dm' ? 'Send post to a chat' : 'Send post to a group'}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <h3 className="font-bold text-white">
                {picker === 'dm' ? 'Send to a chat' : 'Send to a group'}
              </h3>
              <button onClick={() => setPicker(null)} aria-label="Close" className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {pickerDone ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-emerald-400">
                <Check className="h-5 w-5" /> Shared to {pickerDone}!
              </div>
            ) : (
              <>
                <div className="border-b border-zinc-800 p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={picker === 'dm' ? 'Search contacts…' : 'Search your groups…'}
                      autoFocus
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto p-2">
                  {candidatesLoading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-zinc-400">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                    </div>
                  ) : filteredCandidates.length === 0 ? (
                    <p className="py-8 text-center text-sm text-zinc-500">
                      {picker === 'dm' ? 'No contacts yet — add friends to share with them.' : 'You are not in any groups yet.'}
                    </p>
                  ) : (
                    filteredCandidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        onClick={() => void handlePick(candidate)}
                        disabled={loading}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {'username' in candidate ? (
                          <>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-xs font-bold text-white">
                              {candidate.avatar_url ? (
                                <img src={candidate.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                candidate.username.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{candidate.full_name || candidate.username}</p>
                              <p className="truncate text-xs text-zinc-400">@{candidate.username}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                              <Users className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{candidate.name}</p>
                              <p className="truncate text-xs text-zinc-400">{candidate.description || 'Group chat'}</p>
                            </div>
                          </>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
            {shareError && picker && <p className="border-t border-zinc-800 px-4 py-2 text-xs text-rose-400">{shareError}</p>}
          </div>
        </div>
      )}

      <AuthPrompt isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} action="share posts" />
    </>
  );
}
