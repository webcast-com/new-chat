import { useState } from 'react';
import { Check, ChevronDown, Copy, Share2 } from 'lucide-react';
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

  const [menuOpen, setMenuOpen] = useState(false);

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

      if (!error) {
        onShareChange();
      }
    } finally {
      setLoading(false);
    }

    return true;
  };

  const handleCopyLink = async () => {
    if (!(await recordShare())) return;

    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setMenuOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlatformShare = async (platform: string) => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent('Check out this post');
    const urls: Record<string, string> = {
      Facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      'X': `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`,
      LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      WhatsApp: `https://wa.me/?text=${shareText}%20${shareUrl}`,
    };

    window.open(urls[platform], '_blank', 'noopener,noreferrer');
    await recordShare();
    setMenuOpen(false);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((open) => !open)}
          disabled={loading}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={`flex items-center gap-2 transition-all px-3 py-2 rounded-lg ${
            copied
              ? 'text-green-600 bg-green-50'
              : 'bg-[#4eb584] text-[#c2d3eb] hover:bg-[#4eb584]'
          } disabled:opacity-50`}
        >
          {copied ? <Check className="w-5 h-5 text-black" /> : <Share2 className="w-5 h-5 text-black" />}
          <span className="text-sm font-medium text-black hidden sm:inline">
            {copied ? 'Link Copied!' : 'Share'}
          </span>
          <ChevronDown className="w-4 h-4 text-black" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg" role="menu">
            {['Facebook', 'X', 'LinkedIn', 'WhatsApp'].map((platform) => (
              <button
                key={platform}
                onClick={() => handlePlatformShare(platform)}
                className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                role="menuitem"
              >
                Share to {platform}
              </button>
            ))}
            <button
              onClick={handleCopyLink}
              disabled={loading}
              className="flex w-full items-center gap-2 rounded-md border-t border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              role="menuitem"
            >
              <Copy className="h-4 w-4" />
              Copy link
            </button>
          </div>
        )}
      </div>
      <AuthPrompt isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} action="share posts" />
    </>
  );
}
