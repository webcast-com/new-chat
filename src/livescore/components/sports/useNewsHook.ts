import { useState, useEffect, useCallback, useRef } from 'react';
import { NewsArticle, newsArticles as fallbackNews } from '@/app/data/sportsData';

const POLL_INTERVAL = 300000; // Poll every 5 minutes (news doesn't change frequently)
const LIVE_SPORTS_API_ENABLED = import.meta.env.VITE_ENABLE_LIVE_SPORTS_API === 'true';

// Map API response to NewsArticle format
function mapApiNewsToArticle(apiNews: any, index: number): NewsArticle | null {
  try {
    // Format date/time
    let timeStr = 'Just now';
    if (apiNews.publishedAt || apiNews.published_at || apiNews.date || apiNews.published || apiNews.news_date) {
      const dateStr = apiNews.publishedAt || apiNews.published_at || apiNews.date || apiNews.published || apiNews.news_date;
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) {
        timeStr = 'Just now';
      } else if (diffHours < 24) {
        timeStr = `${diffHours}h ago`;
      } else if (diffDays < 7) {
        timeStr = `${diffDays}d ago`;
      } else {
        timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }

    return {
      id: index + 1,
      title: apiNews.title || apiNews.headline || apiNews.news_title || 'No title',
      excerpt: apiNews.description || apiNews.summary || apiNews.excerpt || apiNews.content || apiNews.news_description || 'Read more...',
      time: timeStr,
      author: apiNews.author || apiNews.source || apiNews.publisher || 'Football News',
      category: apiNews.category || apiNews.league_name || 'Premier League',
      image: apiNews.image || apiNews.image_url || apiNews.thumbnail || apiNews.imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
      readTime: '5 min read',
    };
  } catch (err) {
    console.error('❌ Error mapping news article:', err, apiNews);
    return null;
  }
}

export function useNews() {
  const [articles, setArticles] = useState<NewsArticle[]>(fallbackNews);
  const [source, setSource] = useState<string>('loading');
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unavailableUntilRef = useRef(0);

  const fetchNews = useCallback(async () => {
    if (!LIVE_SPORTS_API_ENABLED) {
      setArticles(fallbackNews);
      setSource('fallback-demo');
      setLoading(false);
      return;
    }

    if (Date.now() < unavailableUntilRef.current) {
      setArticles(fallbackNews);
      setSource('fallback-demo');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching football news from Supabase Edge Function...');

      const { projectId, publicAnonKey } = await import('/utils/supabase/info');

      if (!projectId || !publicAnonKey) {
        console.warn('Supabase configuration missing - using demo news');
        setArticles(fallbackNews);
        setSource('fallback-demo');
        setLoading(false);
        return;
      }

      const url = `https://${projectId}.supabase.co/functions/v1/football-news`;
      console.log('Fetching news from URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        mode: 'cors',
        credentials: 'omit',
      }).catch(() => null);

      if (!response) {
        throw new Error('News service unavailable');
      }

      console.log('News response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          setLoading(false);
          return;
        }
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ News response received');

      // Handle different API response formats
      let apiNews: unknown[] = [];

      if (data.success && Array.isArray(data.news)) {
        console.log('📰 Found news array, length:', data.news.length);
        apiNews = data.news;
      } else if (Array.isArray(data.news)) {
        apiNews = data.news;
      } else if (Array.isArray(data)) {
        apiNews = data;
      } else if (data.data && Array.isArray(data.data)) {
        apiNews = data.data;
      } else if (data.articles && Array.isArray(data.articles)) {
        apiNews = data.articles;
      } else if (data.error) {
        console.warn('⚠️ API returned error:', data.error);
      } else {
        console.warn('⚠️ Unknown response format:', Object.keys(data));
      }

      if (apiNews.length > 0) {
        console.log(`✅ Found ${apiNews.length} news articles from API`);
        console.log('First article sample:', apiNews[0]);

        // Map API news to our format
        const mappedNews = apiNews
          .map(mapApiNewsToArticle)
          .filter((article: NewsArticle | null): article is NewsArticle => article !== null)
          .slice(0, 20); // Limit to 20 articles

        console.log(`✅ Mapped ${mappedNews.length} news articles`);

        if (mappedNews.length > 0) {
          setArticles(mappedNews);
          setSource('api-live');
        } else {
          console.log('ℹ️ No news articles could be mapped, using demo news');
          setArticles(fallbackNews);
          setSource('fallback-demo');
        }
      } else {
        console.log('ℹ️ No news articles in response, using demo news');
        setArticles(fallbackNews);
        setSource('fallback-demo');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError' && !err?.message?.includes('service unavailable')) {
        console.warn('News service unavailable; using demo news.', err);
      }

      unavailableUntilRef.current = Date.now() + POLL_INTERVAL;
      setArticles(fallbackNews);
      setSource('fallback-demo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchNews();

    // Set up polling
    intervalRef.current = setInterval(fetchNews, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchNews]);

  return { articles, source, loading };
}
