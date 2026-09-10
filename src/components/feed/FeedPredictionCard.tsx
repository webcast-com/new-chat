import { format } from 'date-fns';
import { ArrowRight, TrendingUp } from 'lucide-react';
import type { Prediction } from '../../livescore/data/mockData';

interface FeedPredictionCardProps {
  prediction: Prediction;
  onBrowsePredictions?: () => void;
}

/** Facebook-style "ScoreHub prediction" unit interleaved into the community feed. */
export default function FeedPredictionCard({ prediction, onBrowsePredictions }: FeedPredictionCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm">
      <header className="flex items-center gap-2.5 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-500 text-white shadow-md">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">ScoreHub prediction</p>
          <p className="truncate text-xs text-zinc-400">
            {prediction.league} · {format(new Date(prediction.date), 'MMM d · HH:mm')}
          </p>
        </div>
      </header>

      <div className="px-4 pb-3">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <img
              src={prediction.homeLogo}
              alt=""
              loading="lazy"
              className="h-9 w-9 shrink-0 object-contain"
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
            />
            <span className="truncate text-sm font-semibold text-white">{prediction.homeTeam}</span>
          </div>
          <span className="shrink-0 text-xs font-bold uppercase tracking-widest text-zinc-500">vs</span>
          <div className="flex min-w-0 flex-row-reverse items-center gap-2">
            <img
              src={prediction.awayLogo}
              alt=""
              loading="lazy"
              className="h-9 w-9 shrink-0 object-contain"
              onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
            />
            <span className="truncate text-sm font-semibold text-white">{prediction.awayTeam}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="truncate rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-bold text-emerald-300">
            {prediction.prediction}
          </span>
          <span className="shrink-0 text-sm text-zinc-400">
            Odds <span className="font-semibold text-white">{prediction.odds}</span>
          </span>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Model confidence</span>
            <span className="font-semibold text-zinc-200">{prediction.confidence}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500"
              style={{ width: `${prediction.confidence}%` }}
            />
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-xs text-zinc-500">{prediction.rationale}</p>

        <button
          type="button"
          onClick={onBrowsePredictions}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-400/60 bg-emerald-950/70 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-900 active:scale-[0.99]"
        >
          See today&apos;s predictions
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
