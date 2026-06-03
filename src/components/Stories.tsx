import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Profile } from '../lib/supabase';
import { Plus, X } from 'lucide-react';
import AuthPrompt from './AuthPrompt';

interface Story {
  id: string;
  user_id: string;
  profile: Profile;
  image_url: string;
  created_at: string;
  expires_at: string;
}

export default function Stories() {
  const { user, profile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*, profiles(*)')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStories(data || []);
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
  };

  const groupedStories = stories.reduce((acc: { [key: string]: Story[] }, story) => {
    if (!acc[story.user_id]) {
      acc[story.user_id] = [];
    }
    acc[story.user_id].push(story);
    return acc;
  }, {});

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2 mb-6 -mx-6 px-6">
        {user && (
          <button
            onClick={handleUploadStory}
            className="min-w-[120px] h-56 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex flex-col items-center justify-center gap-2 text-white font-semibold hover:shadow-lg transition-all hover:scale-105 flex-shrink-0"
          >
            <Plus className="w-8 h-8" />
            <span className="text-xs">Your Story</span>
          </button>
        )}

        {Object.entries(groupedStories).map(([userId, userStories]) => {
          const latestStory = userStories[0];
          return (
            <button
              key={userId}
              onClick={() => setSelectedStory(latestStory)}
              className="min-w-[120px] h-56 rounded-2xl overflow-hidden relative flex-shrink-0 group hover:shadow-lg transition-all hover:scale-105"
            >
              <img
                src={latestStory.image_url}
                alt={latestStory.profile.username}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                    {latestStory.profile.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white text-xs font-semibold truncate">
                    {latestStory.profile.username}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedStory && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="relative w-full max-w-sm h-screen md:h-[90vh] md:rounded-2xl overflow-hidden bg-black">
            <img
              src={selectedStory.image_url}
              alt="Story"
              className="w-full h-full object-cover"
            />

            <button
              onClick={() => setSelectedStory(null)}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 transition-all p-2 rounded-full text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/40 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold border-2 border-white">
                  {selectedStory.profile.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {selectedStory.profile.username}
                  </p>
                  <p className="text-white/70 text-xs">
                    {new Date(selectedStory.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthPrompt isOpen={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} action="share stories" />
    </>
  );
}
