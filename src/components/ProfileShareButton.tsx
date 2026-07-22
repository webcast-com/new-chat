import { useState } from 'react';
import { Check, Copy, ExternalLink, Link2, MessageCircle, Share2 } from 'lucide-react';

interface ProfileShareButtonProps {
  username: string;
  fullName: string;
}

export default function ProfileShareButton({ username, fullName }: ProfileShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const profileUrl = (() => {
    const url = new URL(window.location.href);
    url.hash = `profile-${username}`;
    return url.toString();
  })();
  const shareTitle = `Connect with ${fullName || `@${username}`}`;

  const copyLink = async () => {
    setShareError('');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(profileUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = profileUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copiedWithFallback = document.execCommand('copy');
        textarea.remove();
        if (!copiedWithFallback) throw new Error('Copy command was rejected');
      }

      setCopied(true);
      setShowMenu(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setShareError('Unable to copy the profile link.');
    }
  };

  const openSocialShare = (url: string) => {
    const shareWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!shareWindow) setShareError('Your browser blocked the share window.');
    else setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setShareError('');
          setShowMenu((isOpen) => !isOpen);
        }}
        aria-expanded={showMenu}
        aria-haspopup="menu"
        className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-all ${copied ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
      >
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        <span>{copied ? 'Link copied' : 'Share profile'}</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-xl shadow-black/30" role="menu">
          <button type="button" onClick={copyLink} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" role="menuitem">
            <Copy className="h-4 w-4 text-violet-400" /> Copy profile link
          </button>
          <button type="button" onClick={() => openSocialShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" role="menuitem">
            <ExternalLink className="h-4 w-4 text-blue-400" /> Facebook
          </button>
          <button type="button" onClick={() => openSocialShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(profileUrl)}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" role="menuitem">
            <MessageCircle className="h-4 w-4 text-sky-400" /> X / Twitter
          </button>
          <button type="button" onClick={() => openSocialShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" role="menuitem">
            <ExternalLink className="h-4 w-4 text-blue-300" /> LinkedIn
          </button>
          <button type="button" onClick={() => openSocialShare(`https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${profileUrl}`)}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800" role="menuitem">
            <Link2 className="h-4 w-4 text-emerald-400" /> WhatsApp
          </button>
        </div>
      )}
      {shareError && <p className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 shadow" role="status">{shareError}</p>}
    </div>
  );
}
