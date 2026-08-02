import { useState, useMemo, useEffect } from 'react';
import Fuse from 'fuse.js';
import { LiveMatch, NewsArticle } from '@/app/data/sportsData';
import { useScoreSimulator } from '@/app/components/sports/ScoreSimulator';
import { useNews } from '@/app/components/sports/useNewsHook';

export interface SearchResult {
  type: 'match' | 'team' | 'league' | 'news';
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  data: any;
  score?: number;
}

interface UseSearchOptions {
  query: string;
  maxResults?: number;
}

const leaguesData = [
  { name: 'NFL', sport: 'football', country: 'USA' },
  { name: 'NBA', sport: 'basketball', country: 'USA' },
  { name: 'Premier League', sport: 'soccer', country: 'England' },
  { name: 'La Liga', sport: 'soccer', country: 'Spain' },
  { name: 'Serie A', sport: 'soccer', country: 'Italy' },
  { name: 'Bundesliga', sport: 'soccer', country: 'Germany' },
  { name: 'MLB', sport: 'baseball', country: 'USA' },
  { name: 'ATP Tour', sport: 'tennis', country: 'International' },
];

export function useSearch({ query, maxResults = 8 }: UseSearchOptions) {
  const { matches } = useScoreSimulator() as any;
  const { articles } = useNews() as any;
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo<SearchResult[]>(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return [];

    const q = debouncedQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Search matches (teams, leagues)
    const matchFuse = new Fuse(matches as LiveMatch[], {
      keys: ['homeTeam', 'awayTeam', 'league', 'sport'],
      threshold: 0.4,
      includeScore: true,
    });

    const matchResults = matchFuse.search(q).slice(0, maxResults);
    matchResults.forEach(result => {
      const match = result.item as LiveMatch;
      searchResults.push({
        type: 'match',
        id: `match-${match.id}`,
        title: `${match.homeTeam} vs ${match.awayTeam}`,
        subtitle: `${match.league} · ${match.time} · ${match.homeScore}-${match.awayScore}`,
        image: match.homeLogo,
        data: match,
        score: result.score,
      });
    });

    // Search teams (unique from matches)
    const teams = new Map<string, any>();
    (matches as LiveMatch[]).forEach(m => {
      if (!teams.has(m.homeTeam.toLowerCase())) {
        teams.set(m.homeTeam.toLowerCase(), { name: m.homeTeam, abbr: m.homeAbbr, logo: m.homeLogo, league: m.league, sport: m.sport });
      }
      if (!teams.has(m.awayTeam.toLowerCase())) {
        teams.set(m.awayTeam.toLowerCase(), { name: m.awayTeam, abbr: m.awayAbbr, logo: m.awayLogo, league: m.league, sport: m.sport });
      }
    });

    const teamFuse = new Fuse(Array.from(teams.values()), {
      keys: ['name', 'abbr', 'league'],
      threshold: 0.4,
      includeScore: true,
    });

    const teamResults = teamFuse.search(q).slice(0, 3);
    teamResults.forEach(result => {
      searchResults.push({
        type: 'team',
        id: `team-${result.item.name}`,
        title: result.item.name,
        subtitle: `${result.item.league} · ${result.item.sport}`,
        image: result.item.logo,
        data: result.item,
        score: result.score,
      });
    });

    // Search leagues
    const leagueFuse = new Fuse(leaguesData, {
      keys: ['name', 'sport', 'country'],
      threshold: 0.4,
      includeScore: true,
    });

    const leagueResults = leagueFuse.search(q).slice(0, 2);
    leagueResults.forEach(result => {
      searchResults.push({
        type: 'league',
        id: `league-${result.item.name}`,
        title: result.item.name,
        subtitle: `${result.item.sport} · ${result.item.country}`,
        data: result.item,
        score: result.score,
      });
    });

    // Search news
    if (articles) {
      const newsFuse = new Fuse(articles as NewsArticle[], {
        keys: ['title', 'excerpt', 'category'],
        threshold: 0.5,
        includeScore: true,
      });

      const newsResults = newsFuse.search(q).slice(0, 2);
      newsResults.forEach(result => {
        searchResults.push({
          type: 'news',
          id: `news-${result.item.id}`,
          title: result.item.title,
          subtitle: `${result.item.category} · ${result.item.time}`,
          image: result.item.image,
          data: result.item,
          score: result.score,
        });
      });
    }

    // Sort by score and limit
    return searchResults
      .sort((a, b) => (a.score || 1) - (b.score || 1))
      .slice(0, maxResults);
  }, [debouncedQuery, matches, articles, maxResults]);

  return {
    results,
    query: debouncedQuery,
    isSearching: query !== debouncedQuery,
    hasResults: results.length > 0,
    totalResults: results.length,
  };
}
