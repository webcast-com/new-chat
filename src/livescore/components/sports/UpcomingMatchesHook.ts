import { useState, useEffect, useCallback, useRef } from 'react';
import { UpcomingMatch, upcomingMatches as fallbackMatches } from '@/app/data/sportsData';

const POLL_INTERVAL = 60000; // Poll every 60 seconds (upcoming matches don't change as frequently)

// Map API response to UpcomingMatch format
function mapApiMatchToUpcomingMatch(dbMatch: any): UpcomingMatch | null {
  try {
    // Only include matches that haven't started yet
    const statusRaw = dbMatch.state?.description?.toLowerCase() || '';
    if (!statusRaw.includes('not started') && !statusRaw.includes('upcoming')) {
      return null; // Skip matches that are live or finished
    }

    // Extract team names
    let homeTeam = 'Home Team';
    if (typeof dbMatch.homeTeam === 'object' && dbMatch.homeTeam !== null) {
      homeTeam = dbMatch.homeTeam.name || 'Home Team';
    } else {
      homeTeam = dbMatch.homeTeam || dbMatch.home || 'Home Team';
    }

    let awayTeam = 'Away Team';
    if (typeof dbMatch.awayTeam === 'object' && dbMatch.awayTeam !== null) {
      awayTeam = dbMatch.awayTeam.name || 'Away Team';
    } else {
      awayTeam = dbMatch.awayTeam || dbMatch.away || 'Away Team';
    }

    // Extract league name
    let league = 'Unknown League';
    if (typeof dbMatch.league === 'object' && dbMatch.league !== null) {
      league = dbMatch.league.name || 'Unknown League';
    } else {
      league = dbMatch.league || 'Unknown League';
    }

    // Determine sport
    let sport: 'football' | 'basketball' | 'soccer' | 'baseball' | 'tennis' = 'soccer';
    const leagueLower = String(league).toLowerCase();
    if (leagueLower.includes('nfl')) sport = 'football';
    else if (leagueLower.includes('nba') || leagueLower.includes('basketball')) sport = 'basketball';
    else if (leagueLower.includes('mlb') || leagueLower.includes('baseball')) sport = 'baseball';
    else if (leagueLower.includes('atp') || leagueLower.includes('tennis')) sport = 'tennis';

    // Get abbreviations
    const homeAbbr = String(homeTeam).slice(0, 3).toUpperCase();
    const awayAbbr = String(awayTeam).slice(0, 3).toUpperCase();

    // Extract logos
    let homeLogo: string | undefined;
    let awayLogo: string | undefined;
    let leagueLogo: string | undefined;
    let countryLogo: string | undefined;

    if (typeof dbMatch.homeTeam === 'object' && dbMatch.homeTeam?.logo) {
      homeLogo = dbMatch.homeTeam.logo;
    }
    if (typeof dbMatch.awayTeam === 'object' && dbMatch.awayTeam?.logo) {
      awayLogo = dbMatch.awayTeam.logo;
    }
    if (typeof dbMatch.league === 'object' && dbMatch.league?.logo) {
      leagueLogo = dbMatch.league.logo;
    }
    if (typeof dbMatch.country === 'object' && dbMatch.country?.logo) {
      countryLogo = dbMatch.country.logo;
    }

    // Format date and time
    const matchDate = new Date(dbMatch.date);
    const dateStr = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = matchDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const scheduledTime = `${dateStr} at ${timeStr}`;

    return {
      id: dbMatch.id || Math.floor(Math.random() * 1000000),
      sport,
      league,
      homeTeam: String(homeTeam),
      awayTeam: String(awayTeam),
      date: dateStr,
      time: timeStr,
      scheduledTime,
      homeAbbr,
      awayAbbr,
      homeLogo,
      awayLogo,
      leagueLogo,
      countryLogo,
    };
  } catch (err) {
    console.error('❌ Error mapping upcoming match:', err, dbMatch);
    return null;
  }
}

export function useUpcomingMatches() {
  const [matches, setMatches] = useState<UpcomingMatch[]>(fallbackMatches);
  const [source, setSource] = useState<string>('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUpcomingMatches = useCallback(async () => {
    try {
      console.log('Fetching upcoming matches from Supabase Edge Function...');

      const { projectId, publicAnonKey } = await import('/utils/supabase/info');

      if (!projectId || !publicAnonKey) {
        console.warn('Supabase configuration missing - using demo data');
        setMatches(fallbackMatches);
        setSource('fallback-demo');
        setLoading(false);
        return;
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-ed1dd9fb/matches/upcoming`;
      console.log('Fetching upcoming matches from URL:', url);

      // Add timeout to fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('Upcoming matches response status:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          setMatches(fallbackMatches);
          setSource('fallback-demo');
          setLoading(false);
          return;
        }
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Upcoming matches response received');
      console.log('Response structure:', Object.keys(data));

      // Handle different API response formats
      let apiMatches = [];

      if (Array.isArray(data)) {
        console.log('📊 Response is array, length:', data.length);
        apiMatches = data;
      } else if (data.data && Array.isArray(data.data)) {
        console.log('📊 Found data array, length:', data.data.length);
        apiMatches = data.data;
      } else if (data.matches && Array.isArray(data.matches)) {
        console.log('📊 Found matches array, length:', data.matches.length);
        apiMatches = data.matches;
      } else if (data.error) {
        console.warn('⚠️ API returned error:', data.error);
        // Fall through to use demo data
      } else {
        console.warn('⚠️ Unknown response format:', data);
      }

      if (apiMatches.length > 0) {
        console.log(`✅ Found ${apiMatches.length} matches from API`);

        // Map and filter for upcoming matches only
        const mappedMatches = apiMatches
          .map(mapApiMatchToUpcomingMatch)
          .filter((m): m is UpcomingMatch => m !== null);

        console.log(`✅ Mapped ${mappedMatches.length} upcoming matches`);

        if (mappedMatches.length > 0) {
          setMatches(mappedMatches);
          setSource('api-upcoming');
          setError(null);
        } else {
          console.log('ℹ️ No upcoming matches found, using demo data');
          setMatches(fallbackMatches);
          setSource('fallback-demo');
          setError(null);
        }
      } else {
        console.log('ℹ️ No matches in response, using demo data');
        setMatches(fallbackMatches);
        setSource('fallback-demo');
        setError(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch upcoming matches:', err);
      console.error('Error type:', err.name);
      console.error('Error message:', err.message);

      // Only log stack for non-network errors
      if (err.name !== 'TypeError' || !err.message.includes('fetch')) {
        console.error('Error stack:', err.stack);
      }

      console.log('Using demo data as fallback');
      setMatches(fallbackMatches);

      // Provide user-friendly error handling
      if (err.message.includes('fetch') || err.name === 'TypeError' || err.name === 'AbortError') {
        console.info('ℹ️ Network issue or timeout - this is expected in some environments. Using demo data.');
        setError(null); // Don't show error for network issues or timeouts
      } else {
        setError(null); // Don't show any errors, just use demo data
      }

      setSource('fallback-demo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchUpcomingMatches();

    // Set up polling
    intervalRef.current = setInterval(fetchUpcomingMatches, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchUpcomingMatches]);

  return { matches, source, loading, error };
}
