import { useState, useEffect } from 'react';

export interface LeaderboardEntry {
  rank: number;
  predictorId: string;
  predictorName: string;
  predictorAvatar?: string;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  streak: number;
  lastUpdated: string;
}

export interface LeaderboardFilters {
  timeRange: 'week' | 'month' | 'allTime';
  sport?: string;
  confidenceMin?: number;
}

const mockLeaderboardData: LeaderboardEntry[] = [
  {
    rank: 1,
    predictorId: 'pred-001',
    predictorName: 'The Oracle',
    predictorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=oracle',
    accuracy: 78.5,
    totalPredictions: 142,
    correctPredictions: 112,
    streak: 12,
    lastUpdated: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    rank: 2,
    predictorId: 'pred-002',
    predictorName: 'Stats Master',
    predictorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=stats',
    accuracy: 76.2,
    totalPredictions: 156,
    correctPredictions: 119,
    streak: 8,
    lastUpdated: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    rank: 3,
    predictorId: 'pred-003',
    predictorName: 'Goal Guru',
    predictorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=goal',
    accuracy: 73.8,
    totalPredictions: 128,
    correctPredictions: 95,
    streak: 6,
    lastUpdated: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    rank: 4,
    predictorId: 'pred-004',
    predictorName: 'Form Analyst',
    predictorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=form',
    accuracy: 71.5,
    totalPredictions: 111,
    correctPredictions: 79,
    streak: 4,
    lastUpdated: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    rank: 5,
    predictorId: 'pred-005',
    predictorName: 'Trend Tracker',
    predictorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=trend',
    accuracy: 69.2,
    totalPredictions: 134,
    correctPredictions: 93,
    streak: 3,
    lastUpdated: new Date(Date.now() - 18000000).toISOString(),
  },
  {
    rank: 6,
    predictorId: 'pred-006',
    predictorName: 'Data Scientist',
    predictorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=data',
    accuracy: 67.8,
    totalPredictions: 145,
    correctPredictions: 98,
    streak: 2,
    lastUpdated: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    rank: 7,
    predictorId: 'pred-007',
    predictorName: 'Match Analyst',
    predictorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=match',
    accuracy: 65.4,
    totalPredictions: 122,
    correctPredictions: 80,
    streak: 1,
    lastUpdated: new Date(Date.now() - 25200000).toISOString(),
  },
  {
    rank: 8,
    predictorId: 'pred-008',
    predictorName: 'Odds Expert',
    predictorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=odds',
    accuracy: 63.1,
    totalPredictions: 138,
    correctPredictions: 87,
    streak: 0,
    lastUpdated: new Date(Date.now() - 28800000).toISOString(),
  },
  {
    rank: 9,
    predictorId: 'pred-009',
    predictorName: 'Pattern Hunter',
    predictorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=pattern',
    accuracy: 61.7,
    totalPredictions: 147,
    correctPredictions: 91,
    streak: 0,
    lastUpdated: new Date(Date.now() - 32400000).toISOString(),
  },
  {
    rank: 10,
    predictorId: 'pred-010',
    predictorName: 'Strategy Pro',
    predictorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=strategy',
    accuracy: 60.3,
    totalPredictions: 129,
    correctPredictions: 78,
    streak: 0,
    lastUpdated: new Date(Date.now() - 36000000).toISOString(),
  },
];

export function useLeaderboard(filters?: LeaderboardFilters) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [filters?.timeRange, filters?.sport]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 500));

      let data = [...mockLeaderboardData];

      // Apply filters if needed
      if (filters?.confidenceMin) {
        data = data.filter(entry => entry.accuracy >= filters.confidenceMin!);
      }

      // Sort by accuracy (already sorted in mock data)
      data.sort((a, b) => b.accuracy - a.accuracy);

      // Update ranks
      data = data.map((entry, idx) => ({ ...entry, rank: idx + 1 }));

      setLeaderboard(data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      setLeaderboard(mockLeaderboardData);
    } finally {
      setLoading(false);
    }
  };

  return { leaderboard, loading, error, refetch: fetchLeaderboard };
}
