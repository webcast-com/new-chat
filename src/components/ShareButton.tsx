import { useState } from 'react';
import { Share2 } from 'lucide-react';
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

  const handleShare = async () => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    setLoading(true);
    try {
      // Try to insert share into database
      const { error } = await supabase
        .from('shares')
        .insert([{ post_id: postId, user_id: user.id }]);

      // If successful, call onShareChange
      if (!error) {
        onShareChange();
      }

      // Also copy link to clipboard
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Share might already exist, just copy link
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleShare}
        disabled={loading}
        className={`flex items-center gap-2 transition-all px-3 py-2 rounded-lg ${
          copied
            ? 'text-green-600 bg-green-50'
            : 'text-slate-600 hover:bg-slate-100'
        } disabled:opacity-50`}
      >
        <Share2 className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">
          {copied ? 'Link Copied!' : 'Share'}
        </span>
      </button>
      <AuthPrompt isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} action="share posts" />
    </>
  );
}
