import { useState } from 'react';
import { Check, Copy, ExternalLink, Link2, MessageCircle, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AuthPrompt from './AuthPrompt';

interface ShareButtonProps {
  postId: string;
  onShareChange: () => void;
}

export default function ShareButton({ postId, onShareChange }: ShareButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const shareUrl = (() => {
    const url = new URL(window.location.href);
    url.hash = `post-${postId}`;
    return url.toString();
  })();

  const recordShare = async () => {
    if (!user) {
      setShowAuthPrompt(true);
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('shares')
        .insert([{ post_id: postId, user_id: user.id }]);

      if (error) return false;
      onShareChange();
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      await recordShare();
      setCopied(true);
      setShowMenu(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check out this post', url: shareUrl });
        await recordShare();
      } catch {
        return;
      }
      return;
    }

    setShowMenu((isOpen) => !isOpen);
  };

  const openSocialShare = async (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    await recordShare();
    setShowMenu(false);
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
        </button>

        {showMenu && (
          <div className="absolute bottom-full right-0 z-20 mb-2 w-56 rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-xl shadow-black/30" role="menu">
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
          </div>
        )}
      </div>
      <AuthPrompt isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} action="share posts" />
    </>
  );
}
