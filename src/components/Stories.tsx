import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { getPostMediaType, uploadPostMedia, validatePostMedia } from '../lib/postMedia';
import { Plus, X, Loader2, ChevronLeft, ChevronRight, Heart, Info } from 'lucide-react';
import AuthPrompt from './AuthPrompt';
import Image from './Image';

interface Story {
  id: string;
  user_id: string;
  profile: Profile;
  image_url: string;
  media_type?: 'image' | 'video';
  caption?: string;
  created_at: string;
  expires_at: string;
  views_count?: number;
}

interface StoryGroup {
  userId: string;
  username: string;
  stories: Story[];
  hasUnviewed: boolean;
}

interface StoryReactionState {
  count: number;
  userReaction: string | null;
}

const reactionOptions = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'haha', emoji: '😂', label: 'Haha' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😠', label: 'Angry' },
];

interface StoriesProps {
  onCreatePost?: () => void;
  onAboutCreator?: () => void;
}

export default function Stories({ onCreatePost, onAboutCreator }: StoriesProps) {
  const { user, profile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<StoryGroup | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [storyReactions, setStoryReactions] = useState<Record<string, StoryReactionState>>({});
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [reacting, setReacting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStories();
  }, [user?.id]);

  useEffect(() => {
    if (selectedStoryGroup) {
      const timer = setTimeout(() => {
        nextStory();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [selectedStoryGroup, currentStoryIndex, selectedStoryGroup?.stories.length]);

  const loadStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*, profiles(*)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedStories = (data || []).map((story) => ({
        ...story,
        profile: story.profiles
      }));

      setStories(formattedStories);
      await loadStoryReactions(formattedStories.map((story) => story.id));
    } catch (error) {
      console.error('Error loading stories:', error);
    }
  };

  const loadStoryReactions = async (storyIds: string[]) => {
    if (storyIds.length === 0) {
      setStoryReactions({});
      return;
    }

    const { data, error } = await supabase
      .from('story_reactions')
      .select('story_id, user_id, reaction_type')
      .in('story_id', storyIds);

    if (error) throw error;

    const reactionsByStory = (data || []).reduce<Record<string, StoryReactionState>>((result, reaction) => {
      const current = result[reaction.story_id] || { count: 0, userReaction: null };
      result[reaction.story_id] = {
        count: current.count + 1,
        userReaction: reaction.user_id === user?.id ? reaction.reaction_type : current.userReaction,
      };
      return result;
    }, {});

    setStoryReactions(reactionsByStory);
  };

  const handleReaction = async (reactionType: string) => {
    if (!user || !currentStory || reacting) {
      if (!user) setShowAuthPrompt(true);
      return;
    }

    const storyId = currentStory.id;
    const previous = storyReactions[storyId] || { count: 0, userReaction: null };
    const nextReaction = previous.userReaction === reactionType ? null : reactionType;
    const nextCount = previous.count + (nextReaction && !previous.userReaction ? 1 : !nextReaction ? -1 : 0);

    setReacting(true);
    setShowReactionMenu(false);
    setStoryReactions((current) => ({
      ...current,
      [storyId]: { count: nextCount, userReaction: nextReaction },
    }));

    try {
      const { error } = nextReaction === null
        ? await supabase.from('story_reactions').delete().eq('story_id', storyId).eq('user_id', user.id)
        : previous.userReaction
          ? await supabase.from('story_reactions').update({ reaction_type: nextReaction }).eq('story_id', storyId).eq('user_id', user.id)
          : await supabase.from('story_reactions').insert({ story_id: storyId, user_id: user.id, reaction_type: nextReaction });

      if (error) throw error;
    } catch (error) {
      setStoryReactions((current) => ({ ...current, [storyId]: previous }));
      console.error('Error updating story reaction:', error);
    } finally {
      setReacting(false);
    }
  };

  const handleUploadStory = () => {
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const mediaType = getPostMediaType(file);
    const validationError = validatePostMedia(file, { maxImageSize: 10 * 1024 * 1024 });
    if (!mediaType || validationError) {
      setUploadError(validationError || 'Please choose a supported image or video file.');
      e.currentTarget.value = '';
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const { data: { user: authenticatedUser } } = await supabase.auth.getUser();
      if (!authenticatedUser) throw new Error('Your session has expired. Please sign in again.');

      const uploaded = await uploadPostMedia(file, authenticatedUser.id, { maxImageSize: 10 * 1024 * 1024 });
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: authenticatedUser.id,
          image_url: uploaded.publicUrl,
          media_type: uploaded.mediaType,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) {
        await supabase.storage.from('post-images').remove([uploaded.path]);
        throw insertError;
      }

      await loadStories();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : 'Unable to upload your story.';
      console.error('Error uploading story:', error);
      setUploadError(message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const nextStory = () => {
    if (!selectedStoryGroup) return;
    if (currentStoryIndex < selectedStoryGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      closeStoryViewer();
    }
  };

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    }
  };

  const closeStoryViewer = () => {
    setSelectedStoryGroup(null);
    setCurrentStoryIndex(0);
  };

  const handleStoryClick = (story: Story, group: StoryGroup) => {
    const storyIndex = group.stories.findIndex(s => s.id === story.id);
    setSelectedStoryGroup(group);
    setCurrentStoryIndex(storyIndex >= 0 ? storyIndex : 0);
  };

  const groupedStories: StoryGroup[] = Object.entries(
    stories.reduce((acc: { [key: string]: Story[] }, story) => {
      if (!acc[story.user_id]) {
        acc[story.user_id] = [];
      }
      acc[story.user_id].push(story);
      return acc;
    }, {})
  ).map(([userId, userStories]) => ({
    userId,
    username: userStories[0]?.profile?.username || 'Unknown',
    stories: userStories,
    hasUnviewed: true
  }));

  const currentStory = selectedStoryGroup?.stories[currentStoryIndex];
  const currentReaction = currentStory ? storyReactions[currentStory.id] : undefined;
  const currentReactionEmoji = reactionOptions.find((reaction) => reaction.type === currentReaction?.userReaction)?.emoji;

  return (
    <>
      <div className="-mx-3 mb-5 flex gap-3 overflow-x-auto px-3 pb-2 scrollbar-hide sm:-mx-6 sm:mb-6 sm:px-6">
        {uploadError && <p className="w-full basis-full text-sm text-red-200">{uploadError}</p>}
        {user && (
          <button
            onClick={handleUploadStory}
            disabled={uploading}
            className="h-44 min-w-[96px] rounded-2xl sm:h-56 sm:min-w-[120px] bg-gradient-to-br from-blue-500 to-cyan-500 flex flex-col items-center justify-center gap-2 text-white font-semibold hover:shadow-lg transition-all hover:scale-105 flex-shrink-0 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Plus className="w-8 h-8" />
            )}
            <span className="text-xs">{uploading ? 'Uploading...' : 'Your Story'}</span>
          </button>
        )}

        {onCreatePost && (
          <button
            onClick={onCreatePost}
            className="h-44 min-w-[96px] rounded-2xl sm:h-56 sm:min-w-[120px] bg-gradient-to-br from-violet-600 to-fuchsia-600 flex flex-col items-center justify-center gap-2 text-white font-semibold hover:shadow-lg transition-all hover:scale-105 flex-shrink-0"
          >
            <Plus className="h-8 w-8" />
            <span className="text-xs">Create</span>
          </button>
        )}

        {onAboutCreator && (
          <button
            onClick={onAboutCreator}
            className="relative h-44 min-w-[96px] overflow-hidden rounded-2xl sm:h-56 sm:min-w-[120px] flex flex-col items-center justify-center gap-2 text-white font-semibold hover:shadow-lg transition-all hover:scale-105 flex-shrink-0"
          >
            <img
              src="/steve01.jpeg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
            <div className="relative flex flex-col items-center gap-2">
              <Info className="h-8 w-8" />
              <span className="text-xs">About</span>
            </div>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/ogg"
          onChange={handleFileChange}
          className="hidden"
        />

        {groupedStories.map((group) => {
          const latestStory = group.stories[0];
          return (
            <button
              key={group.userId}
              onClick={() => handleStoryClick(latestStory, group)}
              className="h-44 min-w-[96px] rounded-2xl sm:h-56 sm:min-w-[120px] overflow-hidden relative flex-shrink-0 group hover:shadow-lg transition-all hover:scale-105 ring-2 ring-blue-500 ring-offset-2"
            >
              {latestStory.media_type === 'video' ? (
                <video
                  src={latestStory.image_url}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={latestStory.image_url}
                  alt={latestStory.profile?.username || 'Story'}
                  variant="story"
                  rounded="lg"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                    {latestStory.profile?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span className="text-white text-xs font-semibold truncate">
                    {latestStory.profile?.username || 'User'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedStoryGroup && currentStory && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="relative w-full max-w-sm h-screen md:h-[90vh] md:rounded-2xl overflow-hidden bg-black">
            {currentStory.media_type === 'video' ? (
              <video
                src={currentStory.image_url}
                autoPlay
                controls
                muted
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              <Image
                src={currentStory.image_url}
                alt="Story"
                variant="custom"
                className="w-full h-full"
                rounded="lg"
              />
            )}

            <button
              onClick={closeStoryViewer}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 transition-all p-2 rounded-full text-white"
            >
              <X className="w-6 h-6" />
            </button>

            {selectedStoryGroup.stories.length > 1 && (
              <>
                <button
                  onClick={prevStory}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 transition-all p-2 rounded-full text-white ${currentStoryIndex === 0 ? 'opacity-30' : ''}`}
                  disabled={currentStoryIndex === 0}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextStory}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 transition-all p-2 rounded-full text-white"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-4 bg-gradient-to-t from-black/70 to-transparent">
              <div className="relative">
                <button
                  onClick={() => user ? setShowReactionMenu((isOpen) => !isOpen) : setShowAuthPrompt(true)}
                  disabled={reacting}
                  className="flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-black/65 disabled:opacity-60"
                >
                  {currentReactionEmoji ? <span className="text-lg">{currentReactionEmoji}</span> : <Heart className="h-5 w-5" />}
                  <span>{currentReaction?.count || 'React'}</span>
                </button>

                {showReactionMenu && (
                  <div className="absolute bottom-full left-0 mb-3 flex gap-1 rounded-full border border-white/20 bg-slate-900/95 p-2 shadow-xl">
                    {reactionOptions.map((reaction) => (
                      <button
                        key={reaction.type}
                        onClick={() => handleReaction(reaction.type)}
                        className="text-2xl transition-transform hover:scale-125"
                        title={reaction.label}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {currentStory.caption && <p className="max-w-[60%] text-right text-sm text-white">{currentStory.caption}</p>}
            </div>

            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/40 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold border-2 border-white">
                  {currentStory.profile?.username?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {currentStory.profile?.username || 'User'}
                  </p>
                  <p className="text-white/70 text-xs">
                    {new Date(currentStory.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {selectedStoryGroup.stories.length > 1 && (
                <div className="flex gap-1 mt-3">
                  {selectedStoryGroup.stories.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        idx <= currentStoryIndex ? 'bg-white' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AuthPrompt isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} action="share stories" />
    </>
  );
}
