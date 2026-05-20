import { useState, useRef, useEffect } from 'react';
import { Heart, Smile } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AuthPrompt from './AuthPrompt';

interface ReactionButtonProps {
  postId: string;
  onReactionChange: () => void;
}

export default function ReactionButton({ postId, onReactionChange }: ReactionButtonProps) {
  const { user, profile } = useAuth();
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const reactions = [
    { type: 'like', emoji: '👍', label: 'Like' },
    { type: 'love', emoji: '❤️', label: 'Love' },
    { type: 'haha', emoji: '😂', label: 'Haha' },
    { type: 'wow', emoji: '😮', label: 'Wow' },
    { type: 'sad', emoji: '😢', label: 'Sad' },
    { type: 'angry', emoji: '😠', label: 'Angry' },
  ];

  useEffect(() => {
    checkUserReaction();
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkUserReaction = async () => {
    if (!profile) return;

    try {
      const { data } = await supabase
        .from('reactions')
        .select('reaction_type')
        .eq('post_id', postId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (data) setUserReaction(data.reaction_type);
    } catch (error) {
      console.error('Error checking reaction:', error);
    }
  };

  const handleReaction = async (reactionType: string) => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    if (!profile || loading) return;

    setLoading(true);
    try {
      if (userReaction === reactionType) {
        await supabase
          .from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', profile.id);
        setUserReaction(null);
      } else if (userReaction) {
        await supabase
          .from('reactions')
          .update({ reaction_type: reactionType })
          .eq('post_id', postId)
          .eq('user_id', profile.id);
        setUserReaction(reactionType);
      } else {
        await supabase
          .from('reactions')
          .insert([{ post_id: postId, user_id: profile.id, reaction_type: reactionType }]);
        setUserReaction(reactionType);
      }

      setShowMenu(false);
      onReactionChange();
    } catch (error) {
      console.error('Error updating reaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentReactionEmoji = reactions.find(r => r.type === userReaction)?.emoji;

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => user ? setShowMenu(!showMenu) : setShowAuthPrompt(true)}
          className={`flex items-center gap-2 transition-all px-3 py-2 rounded-lg ${
            userReaction
              ? 'text-blue-600 bg-blue-50'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {currentReactionEmoji ? (
            <span className="text-lg">{currentReactionEmoji}</span>
          ) : (
            <Heart className="w-5 h-5" />
          )}
          <span className="text-sm font-medium hidden sm:inline">
            {userReaction ? reactions.find(r => r.type === userReaction)?.label : 'Like'}
          </span>
        </button>

        {showMenu && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-lg border border-slate-200 p-2 flex gap-1 z-20">
            {reactions.map((reaction) => (
              <button
                key={reaction.type}
                onClick={() => handleReaction(reaction.type)}
                className="text-2xl hover:scale-125 transition-transform"
                title={reaction.label}
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        )}
      </div>
      <AuthPrompt isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} action="react to posts" />
    </>
  );
}
