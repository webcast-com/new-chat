export type UserRank = 
  | "Novice Slitherer"
  | "Ladder Scout"
  | "Python Ranger"
  | "Viper Commander"
  | "Golden Cobra"
  | "Dragon Sovereign";

export type MatchRecord = {
  id: string;
  timestamp: number;
  winnerName: string;
  winnerId: string;
  players: string[]; // names
  pointsEarned: number;
  mode: "local" | "online" | "bot";
};

export type UserProfile = {
  id: string;
  username: string;
  avatar: string; // emoji
  colorIdx: number; // 0..3 index into PLAYER_COLORS
  points: number; // cumulative performance points
  level: number;
  stats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    laddersClimbed: number;
    snakesHit: number;
    highestStreak: number;
  };
  matchHistory: MatchRecord[];
  isBot?: boolean;
};

export function calculateLevelAndRank(points: number): { level: number; rank: UserRank; nextLevelPoints: number; progressPercent: number } {
  // Every 150 points is 1 level up
  const level = Math.floor(points / 150) + 1;
  const currentLevelBase = (level - 1) * 150;
  const nextLevelPoints = level * 150;
  const progressPercent = Math.min(100, Math.max(0, ((points - currentLevelBase) / 150) * 100));

  let rank: UserRank = "Novice Slitherer";
  if (level >= 10) rank = "Dragon Sovereign";
  else if (level >= 7) rank = "Golden Cobra";
  else if (level >= 5) rank = "Viper Commander";
  else if (level >= 3) rank = "Python Ranger";
  else if (level >= 2) rank = "Ladder Scout";

  return { level, rank, nextLevelPoints, progressPercent };
}

export const AVATAR_OPTIONS = ["🦁", "🦊", "🐲", "🐯", "🐺", "🦄", "🦅", "🐼", "🤖", "🧙‍♂️", "👩‍🚀", "🥷"];

export const DEFAULT_BOTS: UserProfile[] = [
  {
    id: "bot-1",
    username: "Slick Viper 🤖",
    avatar: "🤖",
    colorIdx: 1,
    points: 480,
    level: 4,
    stats: { gamesPlayed: 12, wins: 4, losses: 8, laddersClimbed: 18, snakesHit: 14, highestStreak: 2 },
    matchHistory: [],
    isBot: true,
  },
  {
    id: "bot-2",
    username: "Ladder Legend 🐉",
    avatar: "🐲",
    colorIdx: 2,
    points: 820,
    level: 6,
    stats: { gamesPlayed: 20, wins: 9, losses: 11, laddersClimbed: 35, snakesHit: 15, highestStreak: 4 },
    matchHistory: [],
    isBot: true,
  },
  {
    id: "bot-3",
    username: "Lucky Fox 🦊",
    avatar: "🦊",
    colorIdx: 3,
    points: 310,
    level: 3,
    stats: { gamesPlayed: 8, wins: 3, losses: 5, laddersClimbed: 11, snakesHit: 10, highestStreak: 1 },
    matchHistory: [],
    isBot: true,
  },
];
