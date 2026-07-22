import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

interface Props {
  genres: string[];
  activeGenre: string;
  setActiveGenre: (g: string) => void;
  minRating: number;
  setMinRating: (r: number) => void;
  minYear: number;
  setMinYear: (y: number) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  onReset: () => void;
  resultCount: number;
}

const FilterBar: React.FC<Props> = ({
  genres, activeGenre, setActiveGenre, minRating, setMinRating,
  minYear, setMinYear, sortBy, setSortBy, onReset, resultCount
}) => {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white">Explore Movies</h2>
          <p className="mt-1 text-sm text-neutral-400">{resultCount} films found</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-white/10 bg-neutral-900 px-4 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
          >
            <option value="rating">Top Rated</option>
            <option value="year-desc">Newest</option>
            <option value="year-asc">Oldest</option>
            <option value="title">A–Z</option>
          </select>
          <button
            onClick={onReset}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {/* Genre pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveGenre('all')}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeGenre === 'all' ? 'bg-red-600 text-white' : 'bg-white/5 text-neutral-300 hover:bg-white/10'
          }`}
        >All Genres</button>
        {genres.map(g => (
          <button
            key={g}
            onClick={() => setActiveGenre(g)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeGenre === g ? 'bg-red-600 text-white' : 'bg-white/5 text-neutral-300 hover:bg-white/10'
            }`}
          >{g}</button>
        ))}
      </div>

      {/* Sliders */}
      <div className="grid gap-6 rounded-xl border border-white/10 bg-neutral-900/50 p-5 md:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 font-semibold text-white">
              <SlidersHorizontal className="h-4 w-4 text-red-500" /> Minimum Rating
            </label>
            <span className="font-bold text-yellow-400">{minRating.toFixed(1)} ★</span>
          </div>
          <input
            type="range" min="0" max="5" step="0.1"
            value={minRating}
            onChange={(e) => setMinRating(parseFloat(e.target.value))}
            className="w-full accent-red-600"
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 font-semibold text-white">
              <SlidersHorizontal className="h-4 w-4 text-red-500" /> From Year
            </label>
            <span className="font-bold text-yellow-400">{minYear}</span>
          </div>
          <input
            type="range" min="1970" max="2024" step="1"
            value={minYear}
            onChange={(e) => setMinYear(parseInt(e.target.value))}
            className="w-full accent-red-600"
          />
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
