import React from 'react';
import { Sport } from '@/app/data/sportsData';

interface QuickLinksProps {
  onSportChange: (sport: Sport) => void;
}

const leagues = [
  { name: 'NFL', sport: 'football' as Sport, color: '#013369', accent: '#D50A0A', matches: 3 },
  { name: 'NBA', sport: 'basketball' as Sport, color: '#1D428A', accent: '#C8102E', matches: 4 },
  { name: 'Premier League', sport: 'soccer' as Sport, color: '#3D195B', accent: '#00FF87', matches: 2 },
  { name: 'MLB', sport: 'baseball' as Sport, color: '#002D72', accent: '#E4002B', matches: 2 },
  { name: 'ATP Tour', sport: 'tennis' as Sport, color: '#00A651', accent: '#FFD700', matches: 2 },
  { name: 'La Liga', sport: 'soccer' as Sport, color: '#FF4B44', accent: '#2A2A2A', matches: 1 },
  { name: 'Serie A', sport: 'soccer' as Sport, color: '#024494', accent: '#008FD5', matches: 1 },
  { name: 'Bundesliga', sport: 'soccer' as Sport, color: '#D20515', accent: '#FFFFFF', matches: 1 },
];

const QuickLinks: React.FC<QuickLinksProps> = ({ onSportChange }) => {
  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Popular Leagues</h3>
          <button
            onClick={() => {
              document.getElementById('live-scores')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-[#00d4ff] text-sm font-medium hover:underline"
          >
            View All
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {leagues.map((league) => (
            <button
              key={league.name}
              onClick={() => {
                onSportChange(league.sport);
                document.getElementById('live-scores')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group flex flex-col items-center gap-2 p-4 bg-[#161b22] border border-white/5 rounded-xl hover:border-white/20 hover:bg-[#1c2333] transition-all"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[10px] font-black shadow-lg group-hover:scale-110 transition-transform"
                style={{ backgroundColor: league.color }}
              >
                {league.name.length > 4 ? league.name.slice(0, 3) : league.name}
              </div>
              <span className="text-white text-xs font-medium text-center leading-tight">{league.name}</span>
              <span className="text-gray-500 text-[10px]">{league.matches} live</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuickLinks;
