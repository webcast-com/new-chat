import React, { useState } from "react";
import { UserProfile, calculateLevelAndRank, AVATAR_OPTIONS } from "../types/profile";
import { PLAYER_COLORS } from "../game/constants";
import { createNewUser } from "../utils/storage";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  allProfiles: UserProfile[];
  activeProfile: UserProfile;
  onSelectProfile: (id: string) => void;
  onRefreshProfiles: () => void;
};

export default function ProfileModal({
  isOpen,
  onClose,
  allProfiles,
  activeProfile,
  onSelectProfile,
  onRefreshProfiles,
}: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newAvatar, setNewAvatar] = useState("🦁");
  const [newColorIdx, setNewColorIdx] = useState(0);

  if (!isOpen) return null;

  const { level, rank, progressPercent, nextLevelPoints } = calculateLevelAndRank(activeProfile.points);
  const winRate =
    activeProfile.stats.gamesPlayed > 0
      ? Math.round((activeProfile.stats.wins / activeProfile.stats.gamesPlayed) * 100)
      : 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    const created = createNewUser(newUsername, newAvatar, newColorIdx);
    onRefreshProfiles();
    onSelectProfile(created.id);
    setIsCreating(false);
    setNewUsername("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-2xl ring-1 ring-white/15 sm:p-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{activeProfile.avatar}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">{activeProfile.username}</h2>
              <span className="inline-block rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-white shadow">
                Level {level} • {rank}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-slate-400 transition hover:bg-white/20 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Level Progression Bar */}
        <div className="mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Performance XP</span>
            <span>{activeProfile.points} / {nextLevelPoints} pts</span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs text-emerald-300">
            Earn +100 pts per Win &bull; +10 per Ladder &bull; +5 per Snake survived!
          </p>
        </div>

        {/* Lifetime Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/5 p-3 text-center ring-1 ring-white/10">
            <div className="text-2xl font-black text-amber-400">{activeProfile.stats.wins}</div>
            <div className="text-xs font-semibold text-slate-400">Victories Won</div>
          </div>
          <div className="rounded-2xl bg-white/5 p-3 text-center ring-1 ring-white/10">
            <div className="text-2xl font-black text-emerald-400">{winRate}%</div>
            <div className="text-xs font-semibold text-slate-400">Win Rate ({activeProfile.stats.gamesPlayed} games)</div>
          </div>
          <div className="rounded-2xl bg-white/5 p-3 text-center ring-1 ring-white/10">
            <div className="text-2xl font-black text-sky-400">{activeProfile.stats.laddersClimbed}</div>
            <div className="text-xs font-semibold text-slate-400">Ladders Climbed</div>
          </div>
          <div className="rounded-2xl bg-white/5 p-3 text-center ring-1 ring-white/10">
            <div className="text-2xl font-black text-rose-400">{activeProfile.stats.snakesHit}</div>
            <div className="text-xs font-semibold text-slate-400">Snakes Survived</div>
          </div>
        </div>

        {/* User Switcher / Create User Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400">
              Select Player Profile
            </h3>
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 transition"
            >
              {isCreating ? "Cancel" : "+ New Player"}
            </button>
          </div>

          {isCreating && (
            <form onSubmit={handleCreate} className="mb-4 rounded-2xl bg-white/5 p-4 ring-1 ring-emerald-500/40">
              <h4 className="text-sm font-bold text-white mb-3">Create New Slitherer</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. Master Slitherer"
                    maxLength={20}
                    className="w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-white border border-white/20 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Choose Avatar</label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewAvatar(emoji)}
                        className={`h-9 w-9 rounded-xl text-lg flex items-center justify-center transition ${
                          newAvatar === emoji ? "bg-emerald-500 ring-2 ring-white scale-110" : "bg-white/10 hover:bg-white/20"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Default Piece Color</label>
                  <div className="flex gap-2">
                    {PLAYER_COLORS.map((c, idx) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setNewColorIdx(idx)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold text-white transition ${
                          newColorIdx === idx ? `${c.bg} ring-2 ring-white` : "bg-white/10 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${c.bg}`} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-bold text-white shadow-lg hover:brightness-110"
                >
                  Save &amp; Play as {newUsername || "New Player"}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {allProfiles
              .filter((p) => !p.isBot)
              .map((p) => {
                const isSelected = p.id === activeProfile.id;
                const pInfo = calculateLevelAndRank(p.points);
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectProfile(p.id)}
                    className={`flex items-center justify-between rounded-2xl p-3.5 text-left transition ${
                      isSelected
                        ? "bg-gradient-to-r from-emerald-900/80 to-teal-900/80 ring-2 ring-emerald-400"
                        : "bg-white/5 hover:bg-white/10 ring-1 ring-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.avatar}</span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {p.username}
                          {isSelected && (
                            <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          Lv.{pInfo.level} {pInfo.rank} &bull; {p.points} pts
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="font-bold text-amber-400">{p.stats.wins}W</div>
                      <div className="text-slate-500">{p.stats.gamesPlayed}G</div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Match History Memory */}
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-emerald-400">
            Recent Match Memory
          </h3>
          {activeProfile.matchHistory.length === 0 ? (
            <div className="rounded-2xl bg-white/5 p-6 text-center text-sm text-slate-400 ring-1 ring-white/10">
              No games completed yet. Play your first match to store points in memory!
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {activeProfile.matchHistory.map((m) => {
                const isWon = m.winnerId === activeProfile.id;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs transition ${
                      isWon ? "bg-amber-500/10 ring-1 ring-amber-500/30" : "bg-white/5 ring-1 ring-white/10"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white">
                        {isWon ? "🏆 Victory Won" : `Won by ${m.winnerName}`}
                      </div>
                      <div className="text-slate-400">
                        Vs: {m.players.join(", ")} &bull; {new Date(m.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-black text-sm ${isWon ? "text-amber-300" : "text-emerald-300"}`}>
                        +{m.pointsEarned} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
