import { useState, useEffect } from "react";
import { Match, mockMatches } from "../data/mockData";
import { projectId, publicAnonKey } from "/utils/supabase/info";

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    setError(null);
    setQuotaExceeded(false);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-ed1dd9fb/matches/live`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      
      // Check for rate limit errors (429)
      if (data.error && (data.error.includes("429") || data.details?.includes("exceeded the DAILY quota"))) {
        console.warn("API quota exceeded, using mock data");
        setQuotaExceeded(true);
        setUseMockData(true);
        setMatches(mockMatches);
        setError("API quota exceeded. Showing demo data.");
        setLoading(false);
        return;
      }

      if (data.error) {
        throw new Error(`API error: ${data.error}`);
      }

      // Transform API data to match our Match interface
      const transformedMatches: Match[] = transformApiData(data);

      if (transformedMatches.length === 0) {
        console.log("No live matches from API, using mock data");
        setUseMockData(true);
        setMatches(mockMatches);
      } else {
        setMatches(transformedMatches);
        setUseMockData(false);
      }
    } catch (err) {
      console.error("Error fetching live matches:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch matches");
      setUseMockData(true);
      setMatches(mockMatches);
    } finally {
      setLoading(false);
    }
  };

  const transformApiData = (apiData: any): Match[] => {
    // Check for Free API Live Football Data structure (response.live array)
    if (apiData && apiData.response && Array.isArray(apiData.response.live)) {
      console.log("Transforming Free API Live Football Data format (response.live)");
      return apiData.response.live.map((match: any, index: number) => {
        const homeScore = match.home?.score ?? 0;
        const awayScore = match.away?.score ?? 0;

        // Determine status from match.status object
        let status: "live" | "finished" | "upcoming" = "upcoming";
        if (match.status?.ongoing || match.status?.started && !match.status?.finished) {
          status = "live";
        } else if (match.status?.finished) {
          status = "finished";
        }

        // Extract minute from status.liveTime
        const minute = match.status?.liveTime?.short || undefined;

        return {
          id: match.id?.toString() || `match-${index}`,
          sport: "football",
          homeTeam: match.home?.name || match.home?.longName || "Home Team",
          awayTeam: match.away?.name || match.away?.longName || "Away Team",
          homeScore,
          awayScore,
          status,
          time: match.time || "TBD",
          league: `League ${match.leagueId || ""}`,
          minute,
        };
      });
    }

    // Check for Free API Live Football Data structure (response.events array)
    if (apiData && apiData.response && Array.isArray(apiData.response.events)) {
      console.log("Transforming Free API Live Football Data format (response.events)");
      return apiData.response.events.map((event: any, index: number) => {
        const homeScore = event.homeScore?.current || event.homeScore?.display || 0;
        const awayScore = event.awayScore?.current || event.awayScore?.display || 0;

        // Determine status
        let status: "live" | "finished" | "upcoming" = "upcoming";
        if (event.status?.type === "inprogress" || event.status?.description === "In Progress") {
          status = "live";
        } else if (event.status?.type === "finished" || event.status?.description === "Ended") {
          status = "finished";
        }

        return {
          id: event.id?.toString() || `match-${index}`,
          sport: "football",
          homeTeam: event.homeTeam?.name || "Home Team",
          awayTeam: event.awayTeam?.name || "Away Team",
          homeScore,
          awayScore,
          status,
          time: event.startTimestamp
            ? new Date(event.startTimestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : event.time || "TBD",
          league: event.tournament?.name || event.tournament?.category?.name || event.league?.name || "League",
          minute: event.time?.minute ? `${event.time.minute}'` : undefined,
        };
      });
    }

    // Check for AllSportsAPI structure
    if (apiData && apiData.events && Array.isArray(apiData.events)) {
      console.log("Transforming AllSportsAPI format");
      return apiData.events.map((event: any, index: number) => {
        const homeScore = event.homeScore?.current || 0;
        const awayScore = event.awayScore?.current || 0;
        const status = event.status?.type === "inprogress" ? "live" :
                       event.status?.type === "finished" ? "finished" : "upcoming";

        return {
          id: event.id?.toString() || `match-${index}`,
          sport: determineSport(event.tournament?.category?.sport?.name || "football"),
          homeTeam: event.homeTeam?.name || "Home Team",
          awayTeam: event.awayTeam?.name || "Away Team",
          homeScore,
          awayScore,
          status,
          time: event.startTimestamp
            ? new Date(event.startTimestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : "TBD",
          league: event.tournament?.name || event.tournament?.category?.name || "League",
          minute: event.time?.currentPeriodStartTimestamp ? `${Math.floor((Date.now() / 1000 - event.time.currentPeriodStartTimestamp) / 60)}'` : undefined,
        };
      });
    }

    console.warn("Invalid API data structure:", apiData);
    return [];
  };

  const determineSport = (sportName: string): "football" | "basketball" | "cricket" => {
    const sport = sportName.toLowerCase();
    if (sport.includes("basketball")) return "basketball";
    if (sport.includes("cricket")) return "cricket";
    return "football";
  };

  return { matches, loading, error, useMockData, quotaExceeded, refetch: fetchMatches };
}