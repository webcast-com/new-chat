import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { getBetigoloHistory, normalizeBetigoloResult, type BetigoloResult } from '../services/betigoloApi';

interface ResultCard {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  prediction: string;
  outcome: 'win' | 'loss' | 'push';
  league: string;
}

export function RecentResultsSlider() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<ResultCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await getBetigoloHistory();
        if (response.data?.length) {
          setResults(response.data.map((result: BetigoloResult, index: number) => {
            const normalized = normalizeBetigoloResult(result, index);
            return {
              id: normalized.id,
              homeTeam: normalized.homeTeam,
              awayTeam: normalized.awayTeam,
              homeScore: normalized.homeScore,
              awayScore: normalized.awayScore,
              prediction: normalized.prediction,
              outcome: normalized.outcome,
              league: normalized.league,
            };
          }));
        }
      } catch (error) {
        console.error('Failed to load recent results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  const scroll = useCallback((direction: 'left' | 'right') => {
    trackRef.current?.scrollBy({
      left: direction === 'right' ? 420 : -420,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || results.length === 0 || !autoScroll || track.scrollWidth <= track.clientWidth) return;

    let animationFrame = 0;
    let previousTimestamp = 0;
    const animate = (timestamp: number) => {
      if (!previousTimestamp) previousTimestamp = timestamp;
      track.scrollLeft += (timestamp - previousTimestamp) * 0.03;
      previousTimestamp = timestamp;
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth) track.scrollLeft = 0;
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [autoScroll, results.length]);

  if (loading || results.length === 0) return null;

  return (
    <section
      className="group relative w-full overflow-hidden px-4 py-3"
      onMouseEnter={() => setAutoScroll(false)}
      onMouseLeave={() => setAutoScroll(true)}
      aria-label="Recent results and picks"
    >
      <div className="mx-auto mb-3 flex max-w-7xl items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-white">Recent Results &amp; Picks</span>
        <div className="flex gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <button type="button" onClick={() => scroll('left')} className="rounded border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white" aria-label="Scroll recent results left">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => scroll('right')} className="rounded border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:text-white" aria-label="Scroll recent results right">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div ref={trackRef} className="scrollbar-hide mx-auto flex max-w-7xl snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth">
        {results.map((result) => (
          <article key={result.id} className="w-48 flex-shrink-0 snap-start rounded-lg border border-slate-800/80 bg-slate-900 p-3">
            <div className="flex items-center justify-between gap-1.5 text-xs font-semibold">
              <span className="font-bold text-sm text-slate-200">{result.homeTeam.slice(0, 3).toUpperCase()}</span>
              <span className={result.outcome === 'win' ? 'text-emerald-400' : result.outcome === 'loss' ? 'text-red-400' : 'text-white'}>{result.homeScore} - {result.awayScore}</span>
              <span className="font-bold text-sm text-slate-400">{result.awayTeam.slice(0, 3).toUpperCase()}</span>
              {result.outcome === 'win' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}
            </div>
            <p className="mt-2 text-[10px] text-slate-400">Pick: <span className="font-medium text-cyan-400">{result.prediction}</span></p>
            <p className="text-[10px] text-slate-500">{result.league}</p>
          </article>
        ))}
      </div>
      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </section>
  );
}
