import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VITE_SITE_URL ?? 'https://hyperlink.hyper.co.ke').replace(/\/$/, '');
  const now = new Date();

  const routes: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '/', priority: 1, changeFrequency: 'hourly' },
    { path: '/#feed', priority: 1, changeFrequency: 'hourly' },
    { path: '/#trending', priority: 0.8, changeFrequency: 'hourly' },
    { path: '/#people', priority: 0.7, changeFrequency: 'daily' },
    { path: '/#messages', priority: 0.6, changeFrequency: 'hourly' },
    // Livescore embedded (also crawlable via livescore sitemapGenerator)
    { path: '/#live-scores', priority: 0.9, changeFrequency: 'hourly' },
    { path: '/#movies', priority: 0.6, changeFrequency: 'daily' },
    { path: '/#game', priority: 0.5, changeFrequency: 'weekly' },
  ];

  return routes.map(r => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
