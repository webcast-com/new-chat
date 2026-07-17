import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Board from "./Board";
import Dice from "./Dice";
import {
  FINAL_SQUARE,
  LADDERS,
  PLAYER_COLORS,
  SNAKES,
} from "./game/constants";
import { UserProfile, calculateLevelAndRank } from "./types/profile";
import {
  loadAllProfiles,
  getActiveUserId,
  setActiveUserId,
  recordGameResult,
} from "./utils/storage";
import { useOnlineMultiplayer, OnlineMessage } from "./utils/online";
import ProfileModal from "./components/ProfileModal";
import LeaderboardModal from "./components/LeaderboardModal";
import OnlineModal from "./components/OnlineModal";
import EmoteBar from "./components/EmoteBar";
import { playDiceRoll, playTokenStep, playLadderClimb, playSnakeSlide, playVictory } from "./audio/sounds";

type Phase = "idle" | "rolling" | "moving" | "landed" | "finished";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildPath(from: number, roll: number): number[] {
  const path: number[] = [];
  let pos = from;
  let dir = 1;
  for (let i = 0; i < roll; i++) {
    pos += dir;
    if (pos > FINAL_SQUARE) {
      pos = FINAL_SQUARE - (pos - FINAL_SQUARE);
      dir = -1;
    } else if (pos < 1) {
      pos = 1 + (1 - pos);
      dir = 1;
    }
    path.push(pos);
  }
  return path;
}

export default function App() {
  // Memory & Profiles State
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>(() => loadAllProfiles());
  const [activeUserId, setActiveUserIdState] = useState<string>(() => getActiveUserId());
  const activeProfile = useMemo(
    () => allProfiles.find((p) => p.id === activeUserId) || allProfiles[0],
    [allProfiles, activeUserId]
  );

  // Game setup state
  const [numPlayers, setNumPlayers] = useState(2);
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  const [participants, setParticipants] = useState<UserProfile[]>([]);

  // Board & Turn state
  const [positions, setPositions] = useState<number[]>([0, 0]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [diceValue, setDiceValue] = useState(1);
  const [diceTarget, setDiceTarget] = useState(1);
  const [phase, setPhase] = useState<Phase>("idle");
  const [winner, setWinner] = useState<number | null>(null);
  const [lastPointsAwarded, setLastPointsAwarded] = useState<Record<string, number> | null>(null);
  const [log, setLog] = useState<string[]>([
    "Welcome to Snakes & Ladders! Roll the dice to begin.",
  ]);
  const [rollKey, setRollKey] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const gameEventsRef = useRef<Record<string, { ladders: number; snakes: number }>>({});

  // Modals state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showOnlineModal, setShowOnlineModal] = useState(false);

  // Online Multiplayer hook
  const online = useOnlineMultiplayer();

  // Refresh profiles helper
  const refreshProfiles = useCallback(() => {
    setAllProfiles(loadAllProfiles());
  }, []);

  const handleSelectActiveUser = useCallback((id: string) => {
    setActiveUserId(id);
    setActiveUserIdState(id);
  }, []);

  // Sync participants list when in Local/Bot mode or active profile changes
  useEffect(() => {
    if (isOnlineMode) return;
    const list: UserProfile[] = [activeProfile];
    const availableOthers = allProfiles.filter((p) => p.id !== activeProfile.id);
    for (let i = 1; i < numPlayers; i++) {
      list.push(availableOthers[(i - 1) % availableOthers.length] || activeProfile);
    }
    setParticipants(list);
  }, [activeProfile, allProfiles, numPlayers, isOnlineMode]);

  // Keep positions array length synced to participants
  useEffect(() => {
    setPositions((prev) => {
      const targetLen = participants.length || 2;
      if (prev.length === targetLen) return prev;
      if (prev.length < targetLen) {
        return [...prev, ...Array(targetLen - prev.length).fill(0)];
      }
      return prev.slice(0, targetLen);
    });
  }, [participants]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  const appendLog = useCallback((entry: string) => {
    setLog((prev) => [...prev.slice(-30), entry]);
  }, []);

  const resetGame = useCallback(() => {
    const pCount = participants.length || numPlayers;
    setPositions(Array(pCount).fill(0));
    setCurrentPlayer(0);
    setDiceValue(1);
    setDiceTarget(1);
    setPhase("idle");
    setWinner(null);
    setLastPointsAwarded(null);
    gameEventsRef.current = {};
    appendLog(`New match started! Player 1 (${participants[0]?.username || "Player"}) goes first.`);
  }, [participants, numPlayers, appendLog]);

  // Execute step-by-step turn sequence (used for local, bot, and remote online turns)
  const executeTurnSequence = useCallback(
    async (playerIdx: number, roll: number) => {
      setDiceTarget(roll);
      setRollKey((k) => k + 1);
      setPhase("rolling");

      // Play 3D dice tumbling sound
      setTimeout(() => playDiceRoll(), 50);

      await wait(1450);
      setDiceValue(roll);

      const profile = participants[playerIdx] || activeProfile;
      const startPos = positions[playerIdx] || 0;
      appendLog(`${profile.avatar} ${profile.username} rolled a ${roll}.`);

      setPhase("moving");
      const path = buildPath(startPos, roll);

      let reachedFinal = false;
        for (const step of path) {
        setPositions((prev) => {
          const next = [...prev];
          next[playerIdx] = step;
          return next;
        });
        playTokenStep();
        if (step === FINAL_SQUARE) {
          reachedFinal = true;
          break;
        }
        await wait(260);
      }

      const profileId = profile.id;
      if (!gameEventsRef.current[profileId]) {
        gameEventsRef.current[profileId] = { ladders: 0, snakes: 0 };
      }

      if (reachedFinal) {
        setWinner(playerIdx);
        setPhase("finished");
        appendLog(`🏆 ${profile.username} reached square 100 and wins!`);
        playVictory();

        // Record into persistent memory!
        const participantIds = participants.map((p) => p.id);
        const mode = isOnlineMode ? "online" : profile.isBot ? "bot" : "local";
        const { updatedProfiles, pointsAwarded } = recordGameResult(
          profileId,
          participantIds,
          gameEventsRef.current,
          mode
        );
        setAllProfiles(updatedProfiles);
        setLastPointsAwarded(pointsAwarded);
        return;
      }

      // Check for snake or ladder
      const landed = path[path.length - 1];

      if (landed in LADDERS) {
        const dest = LADDERS[landed];
        gameEventsRef.current[profileId].ladders += 1;
        appendLog(`🪜 ${profile.username} climbed a ladder from ${landed} to ${dest}! (+10 XP)`);
        playLadderClimb();
        await wait(280);
        setPositions((prev) => {
          const next = [...prev];
          next[playerIdx] = dest;
          return next;
        });
        await wait(360);
      } else if (landed in SNAKES) {
        const dest = SNAKES[landed];
        gameEventsRef.current[profileId].snakes += 1;
        appendLog(`🐍 ${profile.username} slid down a snake from ${landed} to ${dest}! (+5 XP resilience)`);
        playSnakeSlide();
        await wait(280);
        setPositions((prev) => {
          const next = [...prev];
          next[playerIdx] = dest;
          return next;
        });
        await wait(360);
      }

      // Next player's turn
      setPhase("idle");
      setCurrentPlayer((p) => (p + 1) % participants.length);
    },
    [participants, positions, activeProfile, isOnlineMode, appendLog]
  );

  // Handle local human/host clicking Roll Dice
  const rollDice = useCallback(() => {
    if (phase !== "idle" || winner !== null) return;

    const roll = 1 + Math.floor(Math.random() * 6);
    if (isOnlineMode) {
      online.sendMessage({ type: "ROLL_DICE", playerIdx: currentPlayer, roll });
    }
    executeTurnSequence(currentPlayer, roll);
  }, [phase, winner, isOnlineMode, online, currentPlayer, executeTurnSequence]);

  // Automated AI Bot turn logic
  useEffect(() => {
    if (isOnlineMode || phase !== "idle" || winner !== null) return;
    const currentParticipant = participants[currentPlayer];
    if (currentParticipant && currentParticipant.isBot) {
      const timer = setTimeout(() => {
        const roll = 1 + Math.floor(Math.random() * 6);
        executeTurnSequence(currentPlayer, roll);
      }, 950);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, phase, winner, isOnlineMode, participants, executeTurnSequence]);

  // Online incoming message handlers
  useEffect(() => {
    online.setOnMessage((msg: OnlineMessage) => {
      if (msg.type === "ROLL_DICE") {
        executeTurnSequence(msg.playerIdx, msg.roll);
      } else if (msg.type === "PLAYER_LEFT") {
        appendLog(`🚪 ${msg.username} left the room.`);
      } else if (msg.type === "GAME_START") {
        setIsOnlineMode(true);
        // Map lobby players to participants
        const onlineParticipants: UserProfile[] = msg.players.map((p) => ({
          id: p.id,
          username: p.username,
          avatar: p.avatar,
          colorIdx: p.colorIdx,
          points: 0,
          level: 1,
          stats: { gamesPlayed: 0, wins: 0, losses: 0, laddersClimbed: 0, snakesHit: 0, highestStreak: 0 },
          matchHistory: [],
        }));
        setParticipants(onlineParticipants);
        setNumPlayers(msg.numPlayers);
        setShowOnlineModal(false);
        setPositions(Array(msg.numPlayers).fill(0));
        setCurrentPlayer(0);
        setPhase("idle");
        setWinner(null);
        appendLog(`🌐 Live online match started with ${msg.numPlayers} connected players!`);
      } else if (msg.type === "RESTART_GAME") {
        resetGame();
      }
    });
  }, [online, executeTurnSequence, resetGame, appendLog]);

  // Launch Online Match from lobby (Host action)
  const handleStartOnlineMatch = () => {
    if (!online.isHost || online.onlinePlayers.length < 1) return;
    const num = online.onlinePlayers.length;
    const playersPayload = online.onlinePlayers.map((p) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      colorIdx: p.colorIdx,
    }));
    online.sendMessage({ type: "GAME_START", numPlayers: num, players: playersPayload });

    // Also trigger locally for host
    const onlineParticipants: UserProfile[] = online.onlinePlayers.map((p) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      colorIdx: p.colorIdx,
      points: 0,
      level: p.level,
      stats: { gamesPlayed: 0, wins: 0, losses: 0, laddersClimbed: 0, snakesHit: 0, highestStreak: 0 },
      matchHistory: [],
    }));
    setIsOnlineMode(true);
    setParticipants(onlineParticipants);
    setNumPlayers(num);
    setShowOnlineModal(false);
    setPositions(Array(num).fill(0));
    setCurrentPlayer(0);
    setPhase("idle");
    setWinner(null);
    appendLog(`🌐 Launched online match with ${num} players!`);
  };

  // Check URL parameters for "?invite=CODE" on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get("invite");
    if (inviteCode && !online.roomCode) {
      setShowOnlineModal(true);
      const { level } = calculateLevelAndRank(activeProfile.points);
      online.joinRoom(inviteCode, {
        id: activeProfile.id,
        username: activeProfile.username,
        avatar: activeProfile.avatar,
        colorIdx: activeProfile.colorIdx,
        level,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canRoll =
    phase === "idle" &&
    winner === null &&
    (!participants[currentPlayer]?.isBot || isOnlineMode);

  const currentParticipant = participants[currentPlayer] || activeProfile;
  const currentColor = PLAYER_COLORS[currentParticipant.colorIdx % PLAYER_COLORS.length] || PLAYER_COLORS[0];
  const activeLevelInfo = calculateLevelAndRank(activeProfile.points);

  const confetti = useMemo(() => {
    if (winner === null) return null;
    const pieces = Array.from({ length: 60 });
    const palette = ["#f43f5e", "#0ea5e9", "#84cc16", "#f59e0b", "#a855f7", "#22d3ee"];
    return pieces.map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 1.2;
      const duration = 1.6 + Math.random() * 1.4;
      const size = 6 + Math.random() * 8;
      const color = palette[i % palette.length];
      return { i, left, delay, duration, size, color };
    });
  }, [winner]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Top Header & Navigation Bar */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🐍</span>
            <div>
              <h1 className="bg-gradient-to-r from-amber-300 via-rose-300 to-emerald-300 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
                Snakes &amp; Ladders 3D
              </h1>
              <p className="text-xs text-emerald-200/80 sm:text-sm">
                Memory of Players &bull; Points Progression &bull; Online P2P &amp; Bots
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Active User Memory Badge */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2.5 rounded-2xl bg-white/10 px-3.5 py-1.5 ring-1 ring-white/20 transition hover:bg-white/20 shadow-lg"
            >
              <span className="text-2xl">{activeProfile.avatar}</span>
              <div className="text-left">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  {activeProfile.username}
                  <span className="rounded bg-emerald-400 px-1.5 py-0.2 text-[9px] font-black text-slate-950">
                    LV.{activeLevelInfo.level}
                  </span>
                </div>
                <div className="text-[11px] text-amber-300 font-semibold">
                  {activeProfile.points} XP &bull; {activeLevelInfo.rank}
                </div>
              </div>
            </button>

            {/* Hall of Fame Leaderboard */}
            <button
              onClick={() => setShowLeaderboardModal(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-300 ring-1 ring-amber-500/40 transition hover:bg-amber-500/30"
            >
              <span>🏆</span> Hall of Fame
            </button>

            {/* Online Play & Invite */}
            <button
              onClick={() => setShowOnlineModal(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-black text-white shadow-lg transition hover:brightness-110"
            >
              <span>🌐</span> {isOnlineMode ? `Online Room (${online.roomCode})` : "Online Play & Invite"}
            </button>

            {/* Player Count Selector (Local Mode Only) */}
            {!isOnlineMode && (
              <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 ring-1 ring-white/10">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumPlayers(n)}
                    disabled={phase !== "idle"}
                    className={[
                      "rounded-lg px-2.5 py-1 text-xs font-bold transition",
                      numPlayers === n
                        ? "bg-amber-400 text-amber-950 shadow"
                        : "text-emerald-100 hover:bg-white/10",
                      phase !== "idle" ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    {n}P
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Floating Emote Notification */}
        {online.lastEmote && (
          <div key={online.lastEmote.id} className="fixed top-20 right-6 z-40 animate-bounce rounded-2xl bg-slate-900/90 px-4 py-2 text-base font-bold text-white shadow-2xl ring-2 ring-emerald-400 backdrop-blur">
            {online.lastEmote.username}: <span className="text-2xl ml-1">{online.lastEmote.emote}</span>
          </div>
        )}

        {/* Global Notification Toast Bar (visible even when modal closed) */}
        {online.notifications.length > 0 && online.notifications.some(n => n.type === "join_request") && (
          <div className="fixed top-5 left-1/2 z-50 -translate-x-1/2 space-y-2 max-w-md w-full px-4">
            {online.notifications.filter(n => n.type === "join_request").slice(0, 2).map((n) => (
              <div
                key={n.id}
                className="animate-in slide-in-from-top fade-in duration-300 rounded-2xl bg-gradient-to-r from-emerald-900/95 to-teal-900/95 p-4 text-sm text-white shadow-2xl ring-2 ring-emerald-400/60 backdrop-blur-xl border border-emerald-500/30"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-xs uppercase tracking-wider">🔔 Join Request</div>
                    <div className="mt-1 text-base font-semibold truncate">
                      {n.requester?.avatar} {n.requester?.username} wants to join!
                    </div>
                    <div className="text-xs text-emerald-200/80">
                      Lv.{n.requester?.level} &bull; Room {online.roomCode}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        if (n.requester) online.acceptPlayer(n.requester);
                        online.dismissNotification(n.id);
                      }}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-emerald-400 transition active:scale-95"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => {
                        if (n.requester) online.rejectPlayer(n.requester);
                        online.dismissNotification(n.id);
                      }}
                      className="rounded-xl bg-rose-500/20 px-3 py-2 text-sm font-bold text-rose-300 ring-1 ring-rose-500/40 hover:bg-rose-500/30 transition active:scale-95"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_370px]">
          {/* Board Area */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-[640px]">
              <Board
                positions={positions}
                currentPlayer={currentPlayer}
                winner={winner}
              />
            </div>
            {/* Emote Reaction Bar */}
            <div className="w-full max-w-[640px]">
              <EmoteBar
                onSendEmote={(emote) => {
                  online.sendMessage({ type: "EMOTE", username: activeProfile.username, emote });
                  appendLog(`${activeProfile.avatar} ${activeProfile.username} reacted: ${emote}`);
                }}
              />
            </div>
          </div>

          {/* Sidebar Panel */}
          <div className="flex flex-col gap-4">
            {/* Current turn + 3D dice */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-emerald-300/70 font-bold">
                    {winner !== null ? "Game Finished" : isOnlineMode ? "Live Online Turn" : "Current Turn"}
                  </div>
                  <div className="flex items-center gap-2 text-lg font-bold mt-0.5">
                    <span className="text-2xl">{currentParticipant.avatar}</span>
                    <span
                      className={`inline-block h-3 w-3 rounded-full ${currentColor.bg}`}
                    />
                    {winner !== null
                      ? `${participants[winner]?.username || "Winner"} wins! 🏆`
                      : currentParticipant.username}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-widest text-emerald-300/70 font-bold">
                    Landed On
                  </div>
                  <div className="text-2xl font-black tabular-nums text-amber-300">{diceValue}</div>
                </div>
              </div>

              <div className="flex items-center justify-center py-3">
                <Dice value={diceTarget} rollKey={rollKey} />
              </div>

              <button
                onClick={rollDice}
                disabled={!canRoll}
                className={[
                  "mt-3 w-full rounded-2xl px-4 py-3.5 text-base font-black shadow-lg transition",
                  canRoll
                    ? "bg-gradient-to-r from-amber-400 to-rose-400 text-amber-950 hover:brightness-110 active:scale-[0.98]"
                    : "cursor-not-allowed bg-white/10 text-white/40",
                ].join(" ")}
              >
                {phase === "rolling"
                  ? "Tumbling 3D Dice…"
                  : phase === "moving"
                    ? "Slithering Piece…"
                    : winner !== null
                      ? "Match Complete"
                      : currentParticipant.isBot
                        ? `${currentParticipant.username} is thinking...`
                        : `Roll Dice (${currentParticipant.username})`}
              </button>
            </div>

            {/* Players memory & scoreboard */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-300/70">
                  Participants Memory
                </h2>
                <span className="text-xs text-slate-400">
                  {isOnlineMode ? "Online Room" : "Local / Bot Arena"}
                </span>
              </div>
              <ul className="space-y-2.5">
                {positions.map((sq, i) => {
                  const participant = participants[i] || activeProfile;
                  const color = PLAYER_COLORS[participant.colorIdx % PLAYER_COLORS.length] || PLAYER_COLORS[0];
                  const isActive = i === currentPlayer && winner === null;
                  const isWinner = winner === i;
                  const pLevel = calculateLevelAndRank(participant.points).level;

                  return (
                    <li
                      key={participant.id + i}
                      className={[
                        "flex items-center justify-between rounded-2xl px-3.5 py-2.5 transition",
                        isActive
                          ? "bg-white/15 ring-2 ring-emerald-400 shadow"
                          : "bg-white/5",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ring-2 ${color.bg} ${color.ring}`}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5 text-sm">
                            <span>{participant.avatar}</span>
                            {participant.username}
                            {participant.isBot && (
                              <span className="rounded bg-white/10 px-1 py-0.2 text-[9px] font-mono text-slate-400">
                                BOT
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-emerald-300/80">
                            {isWinner ? "Winner 🏆" : sq === 0 ? "Start Box" : `Square ${sq}`} &bull; Lv.{pLevel}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-base font-bold tabular-nums text-emerald-100">
                        {sq}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Match Log Memory */}
            <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur shadow-xl">
              <h2 className="mb-2.5 text-xs font-bold uppercase tracking-widest text-emerald-300/70">
                Match Events Log
              </h2>
              <div
                ref={logRef}
                className="h-36 space-y-1.5 overflow-y-auto pr-1 text-xs"
              >
                {log.map((entry, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-2.5 py-1 text-emerald-100/90 odd:bg-white/5 font-medium"
                  >
                    {entry}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  if (isOnlineMode) {
                    online.sendMessage({ type: "RESTART_GAME" });
                  }
                  resetGame();
                }}
                disabled={phase === "rolling" || phase === "moving"}
                className="mt-3.5 w-full rounded-xl bg-white/10 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-40"
              >
                {isOnlineMode && online.isHost ? "Restart Online Match" : "Start New Match"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        allProfiles={allProfiles}
        activeProfile={activeProfile}
        onSelectProfile={handleSelectActiveUser}
        onRefreshProfiles={refreshProfiles}
      />

      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        allProfiles={allProfiles}
      />

      <OnlineModal
        isOpen={showOnlineModal}
        onClose={() => setShowOnlineModal(false)}
        activeProfile={activeProfile}
        roomCode={online.roomCode}
        isHost={online.isHost}
        isConnected={online.isConnected}
        onlinePlayers={online.onlinePlayers}
        notifications={online.notifications}
        statusMsg={online.statusMsg}
        onCreateRoom={online.createRoom}
        onJoinRoom={online.joinRoom}
        onLeaveRoom={() => {
          online.leaveRoom();
          setIsOnlineMode(false);
        }}
        onStartOnlineMatch={handleStartOnlineMatch}
        onAcceptPlayer={online.acceptPlayer}
        onRejectPlayer={online.rejectPlayer}
        onDismissNotification={online.dismissNotification}
      />

      {/* Winner Confetti & Performance XP Celebration Overlay */}
      {winner !== null && confetti && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {confetti.map((c) => (
            <span
              key={c.i}
              className="absolute top-0 block rounded-sm"
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.size * 0.4,
                background: c.color,
                animation: `confetti-fall ${c.duration}s ${c.delay}s ease-in forwards`,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto">
            <div className="w-full max-w-md rounded-3xl bg-slate-900/95 p-6 text-center shadow-2xl ring-4 ring-amber-400 backdrop-blur-md animate-in zoom-in-95 duration-300">
              <div className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Match Finished &bull; Memory Stored!
              </div>
              <div className="mt-2 flex items-center justify-center gap-3 text-3xl font-black text-white">
                <span>{participants[winner]?.avatar}</span>
                {participants[winner]?.username} Wins!
              </div>

              {/* Performance Points Memory Summary */}
              {lastPointsAwarded && (
                <div className="mt-5 rounded-2xl bg-white/5 p-4 text-left ring-1 ring-white/10">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                    XP &amp; Performance Points Stored
                  </div>
                  <div className="space-y-1.5">
                    {participants.map((p) => {
                      const pts = lastPointsAwarded[p.id] || 25;
                      const isW = p.id === participants[winner]?.id;
                      return (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                            <span>{p.avatar}</span> {p.username}
                            {isW && <span className="text-amber-400 font-bold">🏆</span>}
                          </span>
                          <span className="font-mono font-black text-emerald-300">
                            +{pts} XP
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowLeaderboardModal(true)}
                  className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-xs font-bold text-white transition hover:bg-white/20"
                >
                  🏆 View Hall of Fame
                </button>
                <button
                  onClick={() => {
                    if (isOnlineMode) online.sendMessage({ type: "RESTART_GAME" });
                    resetGame();
                  }}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-amber-400 to-rose-400 px-4 py-3 text-xs font-bold text-amber-950 shadow hover:brightness-110"
                >
                  Play Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
