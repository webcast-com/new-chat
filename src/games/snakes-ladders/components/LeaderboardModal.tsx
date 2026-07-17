import { UserProfile, calculateLevelAndRank } from "../types/profile";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  allProfiles: UserProfile[];
};

export default function LeaderboardModal({ isOpen, onClose, allProfiles }: Props) {
  if (!isOpen) return null;

  // Sort descending by points
  const sorted = [...allProfiles].sort((a, b) => b.points - a.points);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-2xl ring-1 ring-white/15 sm:p-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🏆</span>
            <div>
              <h2 className="text-2xl font-bold text-white">Hall of Fame</h2>
              <p className="text-xs text-slate-400">Lifetime points &amp; memory leaderboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-slate-400 transition hover:bg-white/20 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {sorted.map((profile, index) => {
            const { level, rank } = calculateLevelAndRank(profile.points);
            let rankMedal = `#${index + 1}`;
            let borderStyle = "bg-white/5 ring-1 ring-white/10";
            if (index === 0) {
              rankMedal = "🥇";
              borderStyle = "bg-gradient-to-r from-amber-500/20 to-yellow-500/10 ring-2 ring-amber-400";
            } else if (index === 1) {
              rankMedal = "🥈";
              borderStyle = "bg-gradient-to-r from-slate-400/20 to-slate-500/10 ring-1 ring-slate-300";
            } else if (index === 2) {
              rankMedal = "🥉";
              borderStyle = "bg-gradient-to-r from-amber-700/20 to-orange-700/10 ring-1 ring-amber-600";
            }

            const winRate =
              profile.stats.gamesPlayed > 0
                ? Math.round((profile.stats.wins / profile.stats.gamesPlayed) * 100)
                : 0;

            return (
              <div
                key={profile.id}
                className={`flex items-center justify-between rounded-2xl p-4 transition ${borderStyle}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 text-center font-black text-lg text-slate-300">{rankMedal}</div>
                  <span className="text-3xl">{profile.avatar}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">{profile.username}</span>
                      {profile.isBot && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">
                          BOT
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-emerald-300 font-semibold">
                      Level {level} &bull; {rank}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-amber-300">{profile.points.toLocaleString()} pts</div>
                  <div className="text-xs text-slate-400">
                    {profile.stats.wins}W / {profile.stats.gamesPlayed}G ({winRate}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
