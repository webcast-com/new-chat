import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { Plus, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import AuthPrompt from './AuthPrompt';
import Image from './Image';

interface Story {
  id: string;
  user_id: string;
  profile: Profile;
  image_url: string;
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

export default function Stories() {
  const { user, profile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState<StoryGroup | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStories();
  }, []);

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

      const formattedStories = (data || []).map((story: any) => ({
        ...story,
        profile: story.profiles
      }));

      setStories(formattedStories);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
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
    if (!file || !user || !profile) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) throw insertError;

      await loadStories();
    } catch (error) {
      console.error('Error uploading story:', error);
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
    setSelectedStory(null);
    setCurrentStoryIndex(0);
  };

  const handleStoryClick = (story: Story, group: StoryGroup) => {
    const storyIndex = group.stories.findIndex(s => s.id === story.id);
    setSelectedStoryGroup(group);
    setSelectedStory(story);
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

  return (
    <>
      <div className="-mx-3 mb-5 flex gap-3 overflow-x-auto px-3 pb-2 scrollbar-hide sm:-mx-6 sm:mb-6 sm:px-6">
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
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
              <Image
                src={latestStory.image_url}
                alt={latestStory.profile?.username || 'Story'}
                variant="story"
                rounded="lg"
              />
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
            <Image
              src={currentStory.image_url}
              alt="Story"
              variant="custom"
              className="w-full h-full"
              rounded="lg"
            />

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
