import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Video } from 'lucide-react';

type TikTokItem = {
  id: string;
  title: string;
  cover: string;
  author: string;
  url: string;
};

type TikTokResponse = {
  data?: {
    videos?: Array<Record<string, unknown>>;
  } | Array<Record<string, unknown>>;
  error?: string;
};

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeItems(payload: TikTokResponse): TikTokItem[] {
  const rawItems = Array.isArray(payload.data) ? payload.data : payload.data?.videos ?? [];
  return rawItems.flatMap((item, index) => {
    const id = stringValue(item.video_id) || stringValue(item.id) || `tiktok-${index}`;
    const url = stringValue(item.share_url) || stringValue(item.url);
    const cover = stringValue(item.cover) || stringValue(item.origin_cover) || stringValue(item.ai_dynamic_cover);
    if (!url || !cover) return [];
    return [{
      id,
      title: stringValue(item.title) || 'Trending video',
      cover,
      author: stringValue(item.author_name) || stringValue(item.author) || 'TikTok creator',
      url,
    }];
  });
}

export default function TikTokFeed() {
  const [items, setItems] = useState<TikTokItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeed = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/tiktok-feed?count=10');
      const rawBody = await response.text();
      let payload: TikTokResponse;
      try {
        payload = JSON.parse(rawBody) as TikTokResponse;
      } catch {
        throw new Error('TikTok feed returned an invalid response');
      }
      if (!response.ok) throw new Error(payload.error || 'Unable to load TikTok feed');
      setItems(normalizeItems(payload));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load TikTok feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-950/50 via-zinc-900 to-violet-950/50 p-4 shadow-lg shadow-cyan-950/10 sm:p-5" aria-labelledby="tiktok-feed-heading">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">From TikTok</p>
          <h2 id="tiktok-feed-heading" className="mt-1 text-xl font-bold text-white">Trending in Kenya</h2>
        </div>
        <button
          type="button"
          onClick={loadFeed}
          disabled={loading}
          aria-label="Refresh TikTok feed"
          className="rounded-lg p-2 text-cyan-200 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="Loading TikTok videos" aria-busy="true">
          {[1, 2, 3, 4, 5].map((item) => <div key={item} className="aspect-[3/4] animate-pulse rounded-xl bg-zinc-800" />)}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/70 p-5 text-center">
          <Video className="mx-auto h-8 w-8 text-cyan-400" />
          <p className="mt-3 text-sm text-zinc-300">{error}</p>
          <button type="button" onClick={loadFeed} className="mt-3 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">Try again</button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-400">No videos are available right now.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {items.map((item) => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="group min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900">
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-800 shadow-md">
                <img src={item.cover} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute right-2 top-2 rounded-md bg-black/70 p-1.5 text-white backdrop-blur"><ExternalLink className="h-3 w-3" /></span>
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-white">{item.title}</p>
              <p className="truncate text-xs text-zinc-400">@{item.author}</p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
