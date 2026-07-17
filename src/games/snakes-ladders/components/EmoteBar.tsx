import { useState } from "react";
import { playEmoteSound } from "../audio/sounds";

type Props = {
  onSendEmote: (emote: string) => void;
};

const EMOTE_LIST = ["🎉", "🐍", "🪜", "😱", "🔥", "😂", "🚀", "🤔"];

export default function EmoteBar({ onSendEmote }: Props) {
  const [cooldown, setCooldown] = useState(false);

  const handleClick = (emote: string) => {
    if (cooldown) return;
    playEmoteSound(emote);
    onSendEmote(emote);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 800);
  };

  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10 backdrop-blur">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">React:</span>
      <div className="flex flex-wrap gap-1">
        {EMOTE_LIST.map((em) => (
          <button
            key={em}
            onClick={() => handleClick(em)}
            disabled={cooldown}
            className="h-8 w-8 rounded-lg bg-white/5 text-base transition hover:bg-white/20 hover:scale-125 active:scale-95 disabled:opacity-40"
            title={`React with ${em}`}
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}
