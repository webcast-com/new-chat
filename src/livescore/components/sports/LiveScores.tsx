import { LiveMatch, Sport } from '@/app/data/sportsData';

interface LiveScoresProps {
  matches: LiveMatch[];
  activeSport: Sport;
  searchQuery: string;
  onMatchClick: (match: LiveMatch) => void;
}

const LiveScores: React.FC<LiveScoresProps> = () => {
  return (
    <section id="live-scores" className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8">
          <h2
            className="flex items-center gap-3 text-2xl font-bold text-white"
            style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 1)' }}
          >
            <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-[#00d4ff] to-[#0066ff]" />
            Live Scores
          </h2>
          <p className="mt-1 text-sm text-white">Live match updates</p>
        </div>

        <iframe
          src="https://embed.soccersapi.com/widgets/ls-soccersapi/free.html?uid=6a0507427c04b4a7a1b504d6&widget-id=livescore&locale=en&height=1200"
          title="Live football scores"
          className="block min-h-[1200px] w-full border-0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </section>
  );
};

export default LiveScores;
