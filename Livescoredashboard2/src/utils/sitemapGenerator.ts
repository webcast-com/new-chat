// Sitemap configuration
const SITE_URL = 'https://livescoresgames.netlify.app';
const LAST_MOD = new Date().toISOString().split('T')[0];

interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

// Define all routes
const routes: SitemapEntry[] = [
  {
    url: '/',
    lastmod: LAST_MOD,
    changefreq: 'hourly',
    priority: 1.0,
  },
  {
    url: '/live-scores',
    lastmod: LAST_MOD,
    changefreq: 'hourly',
    priority: 0.9,
  },
  {
    url: '/predictions',
    lastmod: LAST_MOD,
    changefreq: 'daily',
    priority: 0.8,
  },
  {
    url: '/leaderboard',
    lastmod: LAST_MOD,
    changefreq: 'daily',
    priority: 0.8,
  },
  {
    url: '/premium',
    lastmod: LAST_MOD,
    changefreq: 'weekly',
    priority: 0.7,
  },
  {
    url: '/sure-bets',
    lastmod: LAST_MOD,
    changefreq: 'daily',
    priority: 0.8,
  },
];

// Sport categories
const sports = ['football', 'basketball', 'soccer', 'baseball', 'tennis'];

// Add sport-specific pages
sports.forEach((sport) => {
  routes.push({
    url: `/sport/${sport}`,
    lastmod: LAST_MOD,
    changefreq: 'hourly',
    priority: 0.8,
  });
});

export function generateSitemap(): string {
  const entries = routes
    .map(
      (entry) => `  <url>
    <loc>${SITE_URL}${entry.url}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
    ${entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ''}
    ${entry.priority ? `<priority>${entry.priority}</priority>` : ''}
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

export default generateSitemap;
