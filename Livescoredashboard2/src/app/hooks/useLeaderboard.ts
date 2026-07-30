import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { z } from 'zod';

export const LeaderboardEntrySchema = z.object({
  user_id: z.string(),
  email: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  total_predictions: z.number(),
  correct_predictions: z.number(),
  accuracy_percent: z.number(),
  avg_confidence: z.number().nullable().optional(),
  last_prediction_at: z.string().nullable().optional(),
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export type LeaderboardFilter = 'global' | 'friends' | 'weekly' | 'monthly';

interface UseLeaderboardOptions {
  filter?: LeaderboardFilter;
  limit?: number;
}

// Mock data for demo/fallback
const mockLeaderboard: LeaderboardEntry[] = [
  { user_id: '1', email: 'champ@scorehub.com', first_name: 'Alex', last_name: 'Champion', total_predictions: 245, correct_predictions: 189, accuracy_percent: 77.14, avg_confidence: 82, last_prediction_at: new Date().toISOString() },
  { user_id: '2', email: 'pro@scorehub.com', first_name: 'Jamie', last_name: 'Pro', total_predictions: 198, correct_predictions: 145, accuracy_percent: 73.23, avg_confidence: 78, last_prediction_at: new Date().toISOString() },
  { user_id: '3', email: 'expert@scorehub.com', first_name: 'Sam', last_name: 'Expert', total_predictions: 312, correct_predictions: 220, accuracy_percent: 70.51, avg_confidence: 75, last_prediction_at: new Date().toISOString() },
  { user_id: '4', email: 'analyst@scorehub.com', first_name: 'Taylor', last_name: 'Analyst', total_predictions: 150, correct_predictions: 102, accuracy_percent: 68.0, avg_confidence: 71, last_prediction_at: new Date().toISOString() },
  { user_id: '5', email: 'guru@scorehub.com', first_name: 'Morgan', last_name: 'Guru', total_predictions: 180, correct_predictions: 120, accuracy_percent: 66.67, avg_confidence: 69, last_prediction_at: new Date().toISOString() },
];

async function fetchLeaderboard(filter: LeaderboardFilter = 'global', limit = 50): Promise<LeaderboardEntry[]> {
  try {
    // Try leaderboard_view first (aggregated from prediction_results)
    const { data: viewData, error: viewError } = await supabase.from('leaderboard_view').select('*').limit(limit);

    if (!viewError && viewData && viewData.length > 0) {
      return viewData.map((row: any) => ({
        user_id: row.user_id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        total_predictions: Number(row.total_predictions) || 0,
        correct_predictions: Number(row.correct_predictions) || 0,
        accuracy_percent: Number(row.accuracy_percent) || 0,
        avg_confidence: row.avg_confidence ? Number(row.avg_confidence) : null,
        last_prediction_at: row.last_prediction_at,
      }));
    }

    // Fallback to mock for demo
    let filtered = [...mockLeaderboard];
    if (filter === 'weekly') filtered = filtered.slice(0, 3);
    if (filter === 'monthly') filtered = filtered.slice(0, 4);
    // Friends filter would need friendships table - for demo, return subset
    if (filter === 'friends') filtered = filtered.slice(0, 2);

    return filtered;
  } catch {
    return mockLeaderboard;
  }
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const { filter = 'global', limit = 50 } = options;
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['leaderboard', filter, limit],
    queryFn: () => fetchLeaderboard(filter, limit),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    initialData: mockLeaderboard,
  });

  // Find current user rank
  const currentUserEntry = query.data?.find(entry => entry.user_id === user?.id);
  const currentUserRank = currentUserEntry ? (query.data?.indexOf(currentUserEntry) || 0) + 1 : null;

  return {
    leaderboard: query.data || [],
    loading: query.isLoading,
    error: query.error,
    currentUserEntry,
    currentUserRank,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
