import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { MainTab } from './TabNavigation';
import { Sport } from '@/app/data/sportsData';

interface BreadcrumbProps {
  activeTab: MainTab;
  activeSport?: Sport;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ activeTab, activeSport }) => {
  const getBreadcrumbs = (): Array<{ label: string; href?: string }> => {
    const breadcrumbs: Array<{ label: string; href?: string }> = [
      { label: 'Home', href: '/' },
    ];

    switch (activeTab) {
      case 'dashboard':
        breadcrumbs.push({ label: 'Dashboard' });
        if (activeSport && activeSport !== 'all') {
          breadcrumbs.push({ label: formatSportName(activeSport) });
        }
        break;
      case 'predictions':
        breadcrumbs.push({ label: 'Predictions' });
        break;
      case 'results':
        breadcrumbs.push({ label: 'Results & Performance' });
        break;
      case 'leaderboard':
        breadcrumbs.push({ label: 'Leaderboard' });
        break;
      case 'premium':
        breadcrumbs.push({ label: 'Premium' });
        break;
      case 'settings':
        breadcrumbs.push({ label: 'Settings' });
        break;
      case 'subscription':
        breadcrumbs.push({ label: 'Subscription Management' });
        break;
      case 'webhook':
        breadcrumbs.push({ label: 'Webhook Simulator' });
        break;
    }

    return breadcrumbs;
  };

  const formatSportName = (sport: Sport): string => {
    return sport.charAt(0).toUpperCase() + sport.slice(1);
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3" aria-label="breadcrumb">
      <ol className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={index} className="flex items-center gap-2">
            {index === 0 ? (
              <a
                href={breadcrumb.href}
                className="flex items-center gap-1 text-gray-400 hover:text-[#00d4ff] transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>{breadcrumb.label}</span>
              </a>
            ) : (
              <>
                <ChevronRight className="w-4 h-4 text-gray-600" />
                <span
                  className={
                    index === breadcrumbs.length - 1
                      ? 'text-[#00d4ff] font-medium'
                      : 'text-gray-400 hover:text-[#00d4ff] transition-colors'
                  }
                >
                  {breadcrumb.label}
                </span>
              </>
            )}
          </li>
        ))}
      </ol>

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: breadcrumbs.map((breadcrumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: breadcrumb.label,
            item: breadcrumb.href ? window.location.origin + breadcrumb.href : undefined,
          })),
        })}
      </script>
    </nav>
  );
};

export default Breadcrumb;
