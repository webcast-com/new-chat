import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';

export type AchievementType = 
  | 'first_prediction'
  | 'accuracy_70'
  | 'accuracy_80'
  | 'streak_5'
  | 'referral_3'
  | 'favorites_5'
  | 'chat_10'
  | 'premium_first';

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: AchievementType;
  earned_at: string;
  metadata?: Record<string, any>;
}

interface AchievementDefinition {
  type: AchievementType;
  title: string;
  description: string;
  icon: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const achievementDefinitions: Record<AchievementType, AchievementDefinition> = {
  first_prediction: {
    type: 'first_prediction',
    title: 'First Prediction',
    description: 'Make your first sports prediction',
    icon: '🎯',
    points: 10,
    rarity: 'common',
  },
  accuracy_70: {
    type: 'accuracy_70',
    title: 'Sharp Shooter',
    description: 'Reach 70% prediction accuracy',
    icon: '🎯',
    points: 50,
    rarity: 'rare',
  },
  accuracy_80: {
    type: 'accuracy_80',
    title: 'Oracle',
    description: 'Reach 80% prediction accuracy',
    icon: '🔮',
    points: 100,
    rarity: 'epic',
  },
  streak_5: {
    type: 'streak_5',
    title: 'Hot Streak',
    description: '5 correct predictions in a row',
    icon: '🔥',
    points: 75,
    rarity: 'rare',
  },
  referral_3: {
    type: 'referral_3',
    title: 'Influencer',
    description: 'Refer 3 friends',
    icon: '📣',
    points: 100,
    rarity: 'rare',
  },
  favorites_5: {
    type: 'favorites_5',
    title: 'Collector',
    description: 'Add 5 teams to favorites',
    icon: '⭐',
    points: 25,
    rarity: 'common',
  },
  chat_10: {
    type: 'chat_10',
    title: 'Chatterbox',
    description: 'Send 10 chat messages',
    icon: '💬',
    points: 20,
    rarity: 'common',
  },
  premium_first: {
    type: 'premium_first',
    title: 'Premium Pioneer',
    description: 'Upgrade to premium for the first time',
    icon: '👑',
    points: 50,
    rarity: 'rare',
  },
};

export function useAchievements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const achievementsQuery = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async (): Promise<Achievement[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error && error.code !== 'PGRST116' && error.code !== '42P01') throw error;
      return (data as Achievement[]) || [];
    },
    enabled: !!user?.id,
  });

  const unlockMutation = useMutation({
    mutationFn: async (type: AchievementType) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Check if already earned
      const existing = achievementsQuery.data?.find(a => a.achievement_type === type);
      if (existing) return existing;

      const { data, error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_type: type,
          metadata: { earned_via: 'auto' },
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Already exists
          return achievementsQuery.data?.find(a => a.achievement_type === type) || null;
        }
        throw error;
      }

      return data as Achievement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements', user?.id] });
    },
  });

  const hasAchievement = (type: AchievementType) => {
    return achievementsQuery.data?.some(a => a.achievement_type === type) || false;
  };

  const totalPoints = achievementsQuery.data?.reduce((sum, ach) => {
    const def = achievementDefinitions[ach.achievement_type];
    return sum + (def?.points || 0);
  }, 0) || 0;

  const progress = {
    unlocked: achievementsQuery.data?.length || 0,
    total: Object.keys(achievementDefinitions).length,
    percentage: Math.round(((achievementsQuery.data?.length || 0) / Object.keys(achievementDefinitions).length) * 100),
    points: totalPoints,
  };

  return {
    achievements: achievementsQuery.data || [],
    loading: achievementsQuery.isLoading,
    error: achievementsQuery.error,
    hasAchievement,
    unlock: unlockMutation.mutateAsync,
    isUnlocking: unlockMutation.isPending,
    progress,
    definitions: achievementDefinitions,
  };
}
