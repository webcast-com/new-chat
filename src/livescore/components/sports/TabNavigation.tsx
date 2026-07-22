import React from 'react';
import { Radio, Zap } from 'lucide-react';

export type MainTab = 'dashboard' | 'sure-bets';

interface Tab {
  key: MainTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { key: 'dashboard', label: 'Live Scores', icon: <Radio className="w-4 h-4" /> },
  { key: 'sure-bets', label: 'Sure Bets', icon: <Zap className="w-4 h-4" /> },
];

interface TabNavigationProps {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onChange }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex gap-2 p-1.5 border border-white/10 rounded-2xl w-auto overflow-x-auto backdrop-blur-sm self-stretch" style={{ backgroundColor: 'rgba(158, 86, 16, 1)', textShadow: '1px 1px 3px rgba(0, 0, 0, 1)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-[#00d4ff] to-[#00ff88] text-[#0d1117] shadow-lg shadow-[#00d4ff]/30'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TabNavigation;
