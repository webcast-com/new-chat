import { useState } from 'react';
import { BarChart3, Activity, TrendingUp, Settings } from 'lucide-react';
import DashboardOverview from './dashboard/DashboardOverview';
import DashboardActivity from './dashboard/DashboardActivity';
import DashboardInsights from './dashboard/DashboardInsights';
import DashboardSettings from './dashboard/DashboardSettings';

type DashboardTab = 'overview' | 'activity' | 'insights' | 'settings';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'insights', label: 'Insights', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h1 className="text-2xl font-bold sm:text-3xl bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-slate-600 mt-2">Track your social presence and engagement metrics</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 py-3 text-sm sm:px-4 font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && <DashboardOverview />}
        {activeTab === 'activity' && <DashboardActivity />}
        {activeTab === 'insights' && <DashboardInsights />}
        {activeTab === 'settings' && <DashboardSettings />}
      </div>
    </div>
  );
}
