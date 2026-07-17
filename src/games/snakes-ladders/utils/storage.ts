import { UserProfile, DEFAULT_BOTS } from "../types/profile";

const STORAGE_KEY = "snakes_ladders_users_memory_v1";
const ACTIVE_USER_KEY = "snakes_ladders_active_user_id";

export function loadAllProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Create initial human profile if none exists
      const initialUser: UserProfile = {
        id: "user-" + Math.random().toString(36).slice(2, 9),
        username: "Player 1",
        avatar: "🦁",
        colorIdx: 0,
        points: 120, // Start with some beginner points
        level: 1,
        stats: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          laddersClimbed: 0,
          snakesHit: 0,
          highestStreak: 0,
        },
        matchHistory: [],
      };
      saveAllProfiles([initialUser, ...DEFAULT_BOTS]);
      localStorage.setItem(ACTIVE_USER_KEY, initialUser.id);
      return [initialUser, ...DEFAULT_BOTS];
    }
    const list: UserProfile[] = JSON.parse(raw);
    return list;
  } catch (e) {
    console.error("Failed to load profiles", e);
    return DEFAULT_BOTS;
  }
}

export function saveAllProfiles(profiles: UserProfile[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error("Failed to save profiles", e);
  }
}

export function getActiveUserId(): string {
  const stored = localStorage.getItem(ACTIVE_USER_KEY);
  if (stored) return stored;
  const all = loadAllProfiles();
  const firstHuman = all.find((p) => !p.isBot) || all[0];
  if (firstHuman) {
    localStorage.setItem(ACTIVE_USER_KEY, firstHuman.id);
    return firstHuman.id;
  }
  return "user-1";
}

export function setActiveUserId(id: string) {
  localStorage.setItem(ACTIVE_USER_KEY, id);
}

export function createNewUser(username: string, avatar: string, colorIdx: number): UserProfile {
  const newUser: UserProfile = {
    id: "user-" + Math.random().toString(36).slice(2, 9),
    username: username.trim() || "New Slitherer",
    avatar,
    colorIdx,
    points: 0,
    level: 1,
    stats: {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      laddersClimbed: 0,
      snakesHit: 0,
      highestStreak: 0,
    },
    matchHistory: [],
  };
  const all = loadAllProfiles();
  saveAllProfiles([newUser, ...all]);
  setActiveUserId(newUser.id);
  return newUser;
}

export function recordGameResult(
  winnerProfileId: string,
  participantIds: string[],
  gameEvents: Record<string, { ladders: number; snakes: number }>,
  mode: "local" | "online" | "bot"
): { updatedProfiles: UserProfile[]; pointsAwarded: Record<string, number> } {
  const all = loadAllProfiles();
  const now = Date.now();
  const winner = all.find((p) => p.id === winnerProfileId);
  const winnerName = winner ? winner.username : "Unknown";

  const participantNames = participantIds.map((pid) => {
    const found = all.find((x) => x.id === pid);
    return found ? found.username : "Player";
  });

  const pointsAwarded: Record<string, number> = {};

  const updatedProfiles = all.map((profile) => {
    if (!participantIds.includes(profile.id)) return profile;

    const isWinner = profile.id === winnerProfileId;
    const events = gameEvents[profile.id] || { ladders: 0, snakes: 0 };

    // Calculate Performance Points
    // +100 for winning the match
    // +25 participation completion points
    // +10 per ladder climbed (strategic momentum!)
    // +5 resilience points per snake survived
    let pts = 25;
    if (isWinner) pts += 100;
    pts += events.ladders * 10;
    pts += events.snakes * 5;

    pointsAwarded[profile.id] = pts;

    const newPoints = profile.points + pts;
    const newStats = {
      ...profile.stats,
      gamesPlayed: profile.stats.gamesPlayed + 1,
      wins: isWinner ? profile.stats.wins + 1 : profile.stats.wins,
      losses: !isWinner ? profile.stats.losses + 1 : profile.stats.losses,
      laddersClimbed: profile.stats.laddersClimbed + events.ladders,
      snakesHit: profile.stats.snakesHit + events.snakes,
    };

    const matchRecord = {
      id: "match-" + Math.random().toString(36).slice(2, 7),
      timestamp: now,
      winnerName,
      winnerId: winnerProfileId,
      players: participantNames,
      pointsEarned: pts,
      mode,
    };

    return {
      ...profile,
      points: newPoints,
      level: Math.floor(newPoints / 150) + 1,
      stats: newStats,
      matchHistory: [matchRecord, ...profile.matchHistory].slice(0, 15),
    };
  });

  saveAllProfiles(updatedProfiles);
  return { updatedProfiles, pointsAwarded };
}
