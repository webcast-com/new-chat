import { useState } from 'react';
import { Share2, Share } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AuthPrompt from './AuthPrompt';

interface ShareButtonProps {
  postId: string;
  onShareChange: () => void;
}

export default function ShareButton({ postId, onShareChange }: ShareButtonProps) {
  const { user, profile } = useAuth();
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const handleShare = async () => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    if (!profile || loading) return;

    setLoading(true);
    try {
      if (isShared) {
        await supabase
          .from('shares')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', profile.id);
        setIsShared(false);
      } else {
        setShowInput(true);
      }
      onShareChange();
    } catch (error) {
      console.error('Error toggling share:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmShare = async () => {
    if (!profile || loading) return;

    setLoading(true);
    try {
      await supabase
        .from('shares')
        .insert([{ post_id: postId, user_id: profile.id, shared_content: shareMessage }]);
      setIsShared(true);
      setShowInput(false);
      setShareMessage('');
      onShareChange();
    } catch (error) {
      console.error('Error sharing post:', error);
    } finally {
      setLoading(false);
    }
  };

  if (showInput) {
    return (
      <>
        <div className="w-full">
          <textarea
            value={shareMessage}
            onChange={(e) => setShareMessage(e.target.value)}
            placeholder="Say something about this post..."
            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none text-sm"
            rows={2}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleConfirmShare}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50 text-sm font-medium"
            >
              Share
            </button>
            <button
              onClick={() => {
                setShowInput(false);
                setShareMessage('');
              }}
              className="flex-1 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 transition-all text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleShare}
        disabled={loading}
        className={`flex items-center gap-2 transition-all px-3 py-2 rounded-lg ${
          isShared
            ? 'text-green-600 bg-green-50'
            : 'text-slate-600 hover:bg-slate-100'
        } disabled:opacity-50`}
      >
        {isShared ? <Share className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
        <span className="text-sm font-medium hidden sm:inline">Share</span>
      </button>
      <AuthPrompt isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} action="share posts" />
    </>
  );
}
