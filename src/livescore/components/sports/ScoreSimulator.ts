import { useState, useEffect, useCallback, useRef } from 'react';
import { LiveMatch, liveMatches as fallbackMatches } from '@/app/data/sportsData';
import { getAllSportsLiveMatches } from '@/app/services/allSportsApi';

const POLL_INTERVAL = 30000; // Poll every 30 seconds
const CACHE_KEY = 'scorehub_matches_cache';
const CACHE_DURATION = 5 * 60 * 1000; // Cache for 5 minutes
const LIVE_SPORTS_API_ENABLED = import.meta.env.VITE_ENABLE_LIVE_SPORTS_API === 'true';

// Get cached matches if available and not expired
function getCachedMatches(): LiveMatch[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// Save matches to cache
function setCacheMatches(matches: LiveMatch[]) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: matches, timestamp: Date.now() })
    );
  } catch {
    // Cache write failed, continue anyway
  }
}

// Map API response to LiveMatch format
function mapSupabaseMatchToLiveMatch(dbMatch: any): LiveMatch | null {
  try {
    console.log('Mapping match:', dbMatch);

    // Extract team names from various possible fields
    // Handle nested structure: { homeTeam: { name, ... }, awayTeam: { name, ... } }
    let homeTeam = 'Home Team';
    if (typeof dbMatch.homeTeam === 'object' && dbMatch.homeTeam !== null) {
      homeTeam = dbMatch.homeTeam.name || 'Home Team';
    } else if (typeof dbMatch.home === 'object' && dbMatch.home !== null) {
      homeTeam = dbMatch.home.name || dbMatch.home.longName || 'Home Team';
    } else {
      homeTeam = dbMatch.homeTeam || dbMatch.home || dbMatch.home_team || dbMatch.localteam_name || dbMatch.localTeamName || 'Home Team';
    }

    let awayTeam = 'Away Team';
    if (typeof dbMatch.awayTeam === 'object' && dbMatch.awayTeam !== null) {
      awayTeam = dbMatch.awayTeam.name || 'Away Team';
    } else if (typeof dbMatch.away === 'object' && dbMatch.away !== null) {
      awayTeam = dbMatch.away.name || dbMatch.away.longName || 'Away Team';
    } else {
      awayTeam = dbMatch.awayTeam || dbMatch.away || dbMatch.away_team || dbMatch.visitorteam_name || dbMatch.visitorTeamName || 'Away Team';
    }

    // Extract league/tournament name - handle both string and object formats
    let league = 'Unknown League';
    if (typeof dbMatch.league === 'object' && dbMatch.league !== null) {
      league = dbMatch.league.name || 'Unknown League';
    } else if (typeof dbMatch.league === 'string') {
      league = dbMatch.league;
    } else {
      league = dbMatch.tournament || dbMatch.competition || dbMatch.league_name || dbMatch.tournament_name || 'Unknown League';
    }

    // Determine sport
    let sport: 'football' | 'basketball' | 'soccer' | 'baseball' | 'tennis' = 'soccer';
    const leagueLower = String(league).toLowerCase();

    if (leagueLower.includes('nfl')) sport = 'football';
    else if (leagueLower.includes('nba') || leagueLower.includes('basketball')) sport = 'basketball';
    else if (leagueLower.includes('mlb') || leagueLower.includes('baseball')) sport = 'baseball';
    else if (leagueLower.includes('atp') || leagueLower.includes('tennis') || leagueLower.includes('wta')) sport = 'tennis';
    else sport = 'soccer';

    // Get team abbreviations (safely handle team names)
    const homeAbbr = String(homeTeam).slice(0, 3).toUpperCase();
    const awayAbbr = String(awayTeam).slice(0, 3).toUpperCase();

    // Extract scores - handle different formats
    let homeScore = 0;
    let awayScore = 0;

    // Try state.score.current format first (e.g., "1 - 0")
    if (dbMatch.state?.score?.current && typeof dbMatch.state.score.current === 'string' && dbMatch.state.score.current !== null) {
      const scoreParts = dbMatch.state.score.current.split('-').map((score: string) => score.trim());
      homeScore = parseInt(scoreParts[0]) || 0;
      awayScore = parseInt(scoreParts[1]) || 0;
    }
    // Then try nested object format
    else if (typeof dbMatch.home === 'object' && dbMatch.home?.score !== undefined) {
      homeScore = parseInt(dbMatch.home.score) || 0;
      awayScore = (typeof dbMatch.away === 'object' && dbMatch.away?.score !== undefined) ? parseInt(dbMatch.away.score) || 0 : 0;
    }
    // Fallback to other formats
    else {
      homeScore = parseInt(dbMatch.home_score || dbMatch.homeScore || dbMatch.localteam_score || dbMatch.score?.home || '0') || 0;
      awayScore = parseInt(dbMatch.away_score || dbMatch.awayScore || dbMatch.visitorteam_score || dbMatch.score?.away || '0') || 0;
    }

    // Map status - handle different formats
    let statusRaw = '';

    // Try state.description first
    if (dbMatch.state?.description) {
      statusRaw = dbMatch.state.description.toLowerCase();
    }
    // Then try status object
    else if (dbMatch.status && typeof dbMatch.status === 'object') {
      if (dbMatch.status.finished) statusRaw = 'finished';
      else if (dbMatch.status.ongoing) statusRaw = 'live';
      else if (dbMatch.status.started) statusRaw = 'live';
      else statusRaw = 'live';
    }
    // Fallback to string status
    else {
      statusRaw = String(dbMatch.status || dbMatch.match_status || dbMatch.state || 'live').toLowerCase();
    }

    let mappedStatus: 'live' | 'halftime' | 'final' = 'live';
    if (statusRaw.includes('finished') || statusRaw.includes('final') || statusRaw.includes('ft')) {
      mappedStatus = 'final';
    } else if (statusRaw.includes('half time') || statusRaw.includes('halftime') || statusRaw.includes('ht')) {
      mappedStatus = 'halftime';
    } else if (statusRaw.includes('not started') || statusRaw.includes('upcoming')) {
      mappedStatus = 'live'; // Treat upcoming as live for display
    } else {
      mappedStatus = 'live';
    }

    // Extract time/minute - handle different formats
    let time = 'LIVE';

    // Try state.clock first
    if (dbMatch.state?.clock !== null && dbMatch.state?.clock !== undefined && dbMatch.state.clock !== '') {
      time = dbMatch.state.clock + "'";
    } else if (statusRaw.includes('not started')) {
      time = 'Upcoming';
    } else if (statusRaw.includes('finished') || statusRaw.includes('final')) {
      time = 'FT';
    }
    // Then try status.liveTime
    else if (dbMatch.status?.liveTime?.short) {
      time = dbMatch.status.liveTime.short;
    } else if (dbMatch.status?.liveTime?.long) {
      time = dbMatch.status.liveTime.long.split(':')[0] + "'";
    }
    // Fallback to other fields
    else {
      time = dbMatch.time || dbMatch.match_time || dbMatch.minute || dbMatch.elapsed || 'LIVE';
    }

    // Extract logos from API response
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

    return {
      id: dbMatch.id || dbMatch.match_id || Math.floor(Math.random() * 1000000),
      sport,
      league,
      homeTeam: String(homeTeam),
      awayTeam: String(awayTeam),
      homeScore,
      awayScore,
      time: String(time),
      status: mappedStatus,
      homeColor: dbMatch.home_color || dbMatch.homeColor || generateColorForTeam(String(homeTeam)),
      awayColor: dbMatch.away_color || dbMatch.awayColor || generateColorForTeam(String(awayTeam)),
      homeAbbr,
      awayAbbr,
      homeLogo,
      awayLogo,
      leagueLogo,
      countryLogo,
      streamSlug: typeof dbMatch.streamSlug === 'string'
        ? dbMatch.streamSlug
        : typeof dbMatch.stream_slug === 'string'
          ? dbMatch.stream_slug
          : typeof dbMatch.match_slug === 'string'
            ? dbMatch.match_slug
            : typeof dbMatch.slug === 'string'
              ? dbMatch.slug
              : undefined,
    };
  } catch (err) {
    console.error('❌ Error mapping match:', err, dbMatch);
    return null;
  }
}

// Generate consistent colors for teams
function generateColorForTeam(teamName: string): string {
  const colors = [
    '#E31837', '#00338D', '#003594', '#004687', '#AA0000', '#203731',
    '#552583', '#007A33', '#98002E', '#1D428A', '#0E2240', '#1D1160',
    '#C60C30', '#0851BA', '#6CABDE', '#EF0107', '#C8102E', '#0051BA',
    '#0C2C56', '#BD3039', '#005A9C', '#FD5000', '#001F3F', '#FF4136',
  ];

  // Use team name to generate consistent color
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

export function useScoreSimulator() {
  const [matches, setMatches] = useState<LiveMatch[]>(fallbackMatches);
  const [source, setSource] = useState<string>('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unavailableUntilRef = useRef(0);

  const fetchLiveScores = useCallback(async () => {
    if (!LIVE_SPORTS_API_ENABLED) {
      setMatches(getCachedMatches() || fallbackMatches);
      setSource(getCachedMatches() ? 'cache' : 'fallback-demo');
      setLoading(false);
      return;
    }

    if (Date.now() < unavailableUntilRef.current) {
      setMatches(getCachedMatches() || fallbackMatches);
      setSource(getCachedMatches() ? 'cache' : 'fallback-demo');
      setLoading(false);
      return;
    }

    try {
      // Check cache first if API has failed recently
      const cachedMatches = getCachedMatches();
      if (cachedMatches && cachedMatches.length > 0) {
        console.log('Using cached matches:', cachedMatches.length);
        setMatches(cachedMatches);
        setSource('cache');
        setLoading(false);
        setError(null);
        // Still attempt to refresh in background
      }

      // Fetch from Supabase Edge Function
      console.log('Fetching live matches from Supabase Edge Function...');

      const { projectId, publicAnonKey } = await import('/utils/supabase/info');
      console.log('Project ID:', projectId);
      console.log('Anon key available:', !!publicAnonKey);

      if (!projectId || !publicAnonKey) {
        throw new Error('Supabase configuration missing - check /utils/supabase/info');
      }

      // Call Supabase Edge Function directly
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-ed1dd9fb/matches/live`;
      console.log('Fetching from URL:', url);

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
        throw new Error('Live score service unavailable');
      }

      console.log('Response received, status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Edge function error ${response.status}:`, errorData);

        // Parse error to check if it's a quota/usage issue
        let userFriendlyError = '';

        if (response.status === 503 || errorData.includes('usage_exceeded')) {
          userFriendlyError = 'API usage limit exceeded - displaying demo data';
          console.warn('RapidAPI usage exceeded. Please upgrade your API plan or wait for reset.');
        } else if (response.status === 429) {
          userFriendlyError = 'API rate limit exceeded - displaying demo data';
        } else if (response.status >= 500) {
          userFriendlyError = 'API temporarily unavailable - displaying demo data';
        } else {
          userFriendlyError = 'Failed to fetch live data - displaying demo data';
        }

        throw Object.assign(new Error(userFriendlyError), { quotaExceeded: response.status === 503 || response.status === 429 || errorData.includes('usage_exceeded') });
      }

      const data = await response.json();
      console.log('✅ Edge function response received');
      console.log('Response structure:', Object.keys(data));
      console.log('Full response:', JSON.stringify(data, null, 2));

      // Handle different API response formats
        let apiMatches: unknown[] = [];

      if (Array.isArray(data)) {
        console.log('📊 Response is array, length:', data.length);
        apiMatches = data;
      } else if (data.response && data.response.live && Array.isArray(data.response.live)) {
        console.log('📊 Found response.live array, length:', data.response.live.length);
        apiMatches = data.response.live;
      } else if (data.response && Array.isArray(data.response)) {
        console.log('📊 Found response array, length:', data.response.length);
        apiMatches = data.response;
      } else if (data.matches && Array.isArray(data.matches)) {
        console.log('📊 Found matches array, length:', data.matches.length);
        apiMatches = data.matches;
      } else if (data.data && Array.isArray(data.data)) {
        console.log('📊 Found data array, length:', data.data.length);
        apiMatches = data.data;
      } else if (data.result && Array.isArray(data.result)) {
        console.log('📊 Found result array, length:', data.result.length);
        apiMatches = data.result;
      } else if (data.error || data.message) {
        // API returned an error response
        console.warn('⚠️ API returned error:', data.message || data.error);

        // Check for usage/quota issues
        if (String(data.error || data.message).toLowerCase().includes('usage') || String(data.error || data.message).toLowerCase().includes('quota')) {
          throw Object.assign(new Error('API usage limit exceeded - trying backup live data'), { quotaExceeded: true });
        }
        throw new Error(data.message || data.error || 'API returned an error');
      } else {
        console.warn('⚠️ Unknown response format:', data);
      }

      if (apiMatches.length > 0) {
        console.log(`✅ Found ${apiMatches.length} live matches from API`);
        console.log('First match sample:', JSON.stringify(apiMatches[0], null, 2));

        // Map API matches to our format - show all matches
        const mappedMatches = apiMatches
          .map(mapSupabaseMatchToLiveMatch)
          .filter((match: LiveMatch | null): match is LiveMatch => match !== null);

        console.log(`✅ Successfully mapped ${mappedMatches.length} matches (all available matches displayed)`);
        if (mappedMatches.length > 0) {
          console.log('First mapped match:', mappedMatches[0]);
          console.log(`📊 Total matches being displayed: ${mappedMatches.length}`);
          setMatches(mappedMatches);
          setCacheMatches(mappedMatches);
          setSource('api-live');
          setError(null);
        } else {
          // Fallback to demo data if no matches could be mapped
          console.log('ℹ️ No matches could be mapped from API response, using demo data');
          setMatches(fallbackMatches);
          setSource('fallback-demo');
          setError(null);
        }
      } else {
        // No matches in response - this is normal when no games are currently live
        console.log('ℹ️ No live matches currently available from API');
        setMatches(fallbackMatches);
        setSource('fallback-demo');
        setError(null);
      }
    } catch (err: any) {
      unavailableUntilRef.current = Date.now() + POLL_INTERVAL;
      if (err?.name !== 'AbortError' && !(err?.name === 'TypeError' && err?.message?.includes('fetch')) && !err?.message?.includes('service unavailable')) {
        console.warn('Live score service unavailable; using fallback data.', err);
      }

      if (err?.quotaExceeded) {
        try {
          console.log('Primary live API quota exceeded; trying AllSportsAPI fallback...');
          const backupResponse = await getAllSportsLiveMatches();
          if (backupResponse.data && backupResponse.data.length > 0) {
            const backupMatches = backupResponse.data
              .map(mapSupabaseMatchToLiveMatch)
              .filter((match): match is LiveMatch => match !== null);

            if (backupMatches.length > 0) {
              setMatches(backupMatches);
              setCacheMatches(backupMatches);
              setSource('allsports-api');
              setError('Primary live API quota exceeded; using AllSportsAPI.');
              return;
            }
          }
        } catch (backupError) {
          console.warn('AllSportsAPI fallback failed:', backupError);
        }
      }

      // Try to use cached data if available
      const cachedMatches = getCachedMatches();
      if (cachedMatches && cachedMatches.length > 0) {
        console.log('Using cached matches due to API error:', cachedMatches.length);
        setMatches(cachedMatches);
        setSource('cache');
        setError('Using cached data (API unavailable)');
      } else {
        console.log('No cache available, using demo data as fallback');
        setMatches(fallbackMatches);

        // Provide user-friendly error message
        if (err.message.includes('fetch') || err.message.includes('service unavailable') || err.name === 'TypeError') {
          console.info('ℹ️ Network issue - this is expected in some environments. Using demo data.');
          setError(null); // Don't show error for network issues
        } else {
          setError(err.message || 'Network error');
        }

        setSource('fallback-demo');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchLiveScores();

    // Set up polling
    intervalRef.current = setInterval(fetchLiveScores, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchLiveScores]);

  return { matches, source, loading, error };
}
