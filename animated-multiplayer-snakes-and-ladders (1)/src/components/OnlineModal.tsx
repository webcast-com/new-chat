import { useState } from "react";
import { UserProfile, calculateLevelAndRank } from "../types/profile";
import { Notification, PlayerInfo } from "../utils/online";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: UserProfile;
  roomCode: string | null;
  isHost: boolean;
  isConnected: boolean;
  onlinePlayers: PlayerInfo[];
  notifications: Notification[];
  statusMsg: string;
  onCreateRoom: (user: PlayerInfo) => void;
  onJoinRoom: (code: string, user: PlayerInfo) => void;
  onLeaveRoom: () => void;
  onStartOnlineMatch: () => void;
  onAcceptPlayer: (player: PlayerInfo) => void;
  onRejectPlayer: (player: PlayerInfo) => void;
  onDismissNotification: (id: number) => void;
};

export default function OnlineModal({
  isOpen,
  onClose,
  activeProfile,
  roomCode,
  isHost,
  isConnected: hostConnected,
  onlinePlayers,
  notifications,
  statusMsg,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartOnlineMatch,
  onAcceptPlayer,
  onRejectPlayer,
  onDismissNotification,
}: Props) {
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const { level } = calculateLevelAndRank(activeProfile.points);
  const userSummary: PlayerInfo = {
    id: activeProfile.id,
    username: activeProfile.username,
    avatar: activeProfile.avatar,
    colorIdx: activeProfile.colorIdx,
    level,
  };

  const inviteUrl = roomCode ? `${window.location.origin}${window.location.pathname}?invite=${roomCode}` : "";

  const handleCopyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-2xl ring-1 ring-white/15 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">🌐</span>
            <div>
              <h2 className="text-2xl font-bold text-white">Online Play &amp; Invite</h2>
              <p className="text-xs text-slate-400">Live P2P matchmaking with friends</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-slate-400 transition hover:bg-white/20 hover:text-white">✕</button>
        </div>

        {/* Active Player Badge */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/5 p-3.5 ring-1 ring-white/10">
          <span className="text-2xl">{activeProfile.avatar}</span>
          <div>
            <div className="text-sm font-bold text-white">Playing as: {activeProfile.username}</div>
            <div className="text-xs text-emerald-300">Level {level} &bull; {activeProfile.points} pts</div>
          </div>
        </div>

        {/* ====== NOTIFICATIONS PANEL ====== */}
        {notifications.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Live Notifications</div>
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`animate-in slide-in-from-right-2 fade-in duration-200 rounded-2xl p-3 text-sm ring-1 ${
                  n.type === "join_request"
                    ? "bg-emerald-950/70 ring-emerald-400/60 border border-emerald-500/30"
                    : n.type === "joined"
                      ? "bg-emerald-900/50 ring-emerald-600/40"
                      : n.type === "denied"
                        ? "bg-rose-950/50 ring-rose-600/40"
                        : "bg-white/5 ring-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-semibold text-white text-xs">{n.message}</div>
                    {n.type === "join_request" && n.requester && (
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-300">
                        <span className="text-lg">{n.requester.avatar}</span>
                        <span>{n.requester.username}</span>
                        <span className="text-emerald-300">Lv.{n.requester.level}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-1 shrink-0">
                    {n.type === "join_request" && n.requester && isHost && (
                      <>
                        <button
                          onClick={() => {
                            onAcceptPlayer(n.requester!);
                            onDismissNotification(n.id);
                          }}
                          className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-400 transition active:scale-95"
                        >
                          ✅ Accept
                        </button>
                        <button
                          onClick={() => {
                            onRejectPlayer(n.requester!);
                            onDismissNotification(n.id);
                          }}
                          className="rounded-xl bg-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-300 ring-1 ring-rose-500/40 hover:bg-rose-500/50 transition active:scale-95"
                        >
                          ✕ Decline
                        </button>
                      </>
                    )}
                    {n.type !== "join_request" && (
                      <button
                        onClick={() => onDismissNotification(n.id)}
                        className="text-slate-500 hover:text-white transition text-xs p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!roomCode ? (
          /* ====== NO ROOM YET: Create / Join ====== */
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-900/50 to-teal-900/50 p-5 ring-1 ring-emerald-500/30">
              <h3 className="text-base font-bold text-white">Create a Room</h3>
              <p className="mt-1 text-xs text-slate-300">Open a lobby and invite friends with a shareable link.</p>
              <button
                onClick={() => onCreateRoom(userSummary)}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
              >
                🚀 Host New Online Room
              </button>
            </div>

            <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <h3 className="text-base font-bold text-white">Join a Room</h3>
              <p className="mt-1 text-xs text-slate-400">Enter the 6-character code from a friend's invite link.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (joinCodeInput.trim()) onJoinRoom(joinCodeInput.trim(), userSummary);
                }}
                className="mt-3 flex gap-2"
              >
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  maxLength={8}
                  className="w-full rounded-xl bg-black/40 px-3.5 py-2.5 font-mono text-base uppercase tracking-widest text-white placeholder-slate-500 border border-white/20 focus:border-emerald-400 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!joinCodeInput.trim()}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-amber-950 transition hover:bg-amber-400 disabled:opacity-40"
                >
                  Join
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ====== ACTIVE ROOM LOBBY ====== */
          <div className="mt-6 space-y-5">
            {/* Room Info Card */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-950/70 to-teal-950/50 p-5 ring-2 ring-emerald-400/50 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-3xl" />
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">Room Code</div>
              <div className="mt-1 font-mono text-4xl font-black tracking-[0.2em] text-white drop-shadow-lg">{roomCode}</div>
              <p className="mt-2 text-xs text-emerald-200/70">{statusMsg}</p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={handleCopyInvite}
                  className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow"
                >
                  {copied ? "✅ Invite Copied!" : "📋 Copy Invite Link"}
                </button>
                <button
                  onClick={onLeaveRoom}
                  className="rounded-xl bg-rose-500/20 px-4 py-2.5 text-xs font-bold text-rose-300 ring-1 ring-rose-500/40 transition hover:bg-rose-500/30"
                >
                  🚪 Leave Room
                </button>
              </div>
            </div>

            {/* Players in Lobby */}
            <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  👥 Lobby Players ({onlinePlayers.length}/4)
                </h4>
                        <span className={`h-2 w-2 rounded-full ${hostConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
              </div>
              <div className="space-y-2">
                {onlinePlayers.length === 0 && (
                  <div className="text-xs text-slate-500 italic py-3 text-center">Waiting for players to join...</div>
                )}
                {onlinePlayers.map((p, idx) => (
                  <div
                    key={p.id + idx}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{p.avatar}</span>
                      <div>
                        <span className="font-bold text-white">{p.username}</span>
                        <span className="ml-2 text-xs text-emerald-300">Lv.{p.level}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {idx === 0 && isHost && (
                        <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30">
                          YOU (HOST)
                        </span>
                      )}
                      {idx === 0 && !isHost && (
                        <span className="rounded bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30">
                          HOST
                        </span>
                      )}
                      {isHost && idx > 0 && (
                        <button
                          className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 ring-1 ring-rose-500/30 cursor-not-allowed opacity-50"
                          title="Kick (coming soon)"
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Start / Wait */}
            {isHost ? (
              <button
                onClick={onStartOnlineMatch}
                disabled={onlinePlayers.length < 2}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-rose-400 py-3.5 text-base font-black text-slate-950 shadow-xl transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {onlinePlayers.length >= 2
                  ? `🎲 Launch Online Match (${onlinePlayers.length} Players)`
                  : `⏳ Need at least 2 players (${onlinePlayers.length}/4)`}
              </button>
            ) : (
              <div className="rounded-xl bg-white/5 p-4 text-center text-xs text-slate-300 animate-pulse ring-1 ring-white/10">
                {onlinePlayers.some((p) => p.id === activeProfile.id)
                  ? "🟢 You're in! Waiting for host to start the match..."
                  : "⏳ Sending join request to host..."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
