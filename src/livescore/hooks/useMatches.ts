import { useState, useEffect } from "react";
import { Match, mockMatches } from "../data/mockData";
import { getEdgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabase";

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
      const response = await fetch(getEdgeFunctionUrl('make-server-ed1dd9fb/matches/live'), {
        headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      const data = await response.json();
      if (data.error && (data.error.includes("429") || data.details?.includes("exceeded the DAILY quota"))) {
        setQuotaExceeded(true);
        setUseMockData(true);
        setMatches(mockMatches);
        setError("API quota exceeded. Showing demo data.");
        setLoading(false);
        return;
      }
      if (data.error) throw new Error(`API error: ${data.error}`);
      const transformedMatches: Match[] = transformApiData(data);
      if (transformedMatches.length === 0) {
        setUseMockData(true);
        setMatches(mockMatches);
      } else {
        setMatches(transformedMatches);
        setUseMockData(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch matches");
      setUseMockData(true);
      setMatches(mockMatches);
    } finally {
      setLoading(false);
    }
  };

  const transformApiData = (apiData: any): Match[] => {
    if (apiData && apiData.response && Array.isArray(apiData.response.live)) {
      return apiData.response.live.map((match: any, index: number) => {
        const homeScore = match.home?.score ?? 0;
        const awayScore = match.away?.score ?? 0;
        let status: "live" | "finished" | "upcoming" = "upcoming";
        if (match.status?.ongoing || (match.status?.started && !match.status?.finished)) status = "live";
        else if (match.status?.finished) status = "finished";
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
    if (apiData && apiData.response && Array.isArray(apiData.response.events)) {
      return apiData.response.events.map((event: any, index: number) => {
        const homeScore = event.homeScore?.current || event.homeScore?.display || 0;
        const awayScore = event.awayScore?.current || event.awayScore?.display || 0;
        let status: "live" | "finished" | "upcoming" = "upcoming";
        if (event.status?.type === "inprogress" || event.status?.description === "In Progress") status = "live";
        else if (event.status?.type === "finished" || event.status?.description === "Ended") status = "finished";
        return {
          id: event.id?.toString() || `match-${index}`,
          sport: "football",
          homeTeam: event.homeTeam?.name || "Home Team",
          awayTeam: event.awayTeam?.name || "Away Team",
          homeScore,
          awayScore,
          status,
          time: event.startTimestamp ? new Date(event.startTimestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : event.time || "TBD",
          league: event.tournament?.name || event.tournament?.category?.name || event.league?.name || "League",
          minute: event.time?.minute ? `${event.time.minute}'` : undefined,
        };
      });
    }
    if (apiData && apiData.events && Array.isArray(apiData.events)) {
      return apiData.events.map((event: any, index: number) => {
        const homeScore = event.homeScore?.current || 0;
        const awayScore = event.awayScore?.current || 0;
        const status = event.status?.type === "inprogress" ? "live" : event.status?.type === "finished" ? "finished" : "upcoming";
        return {
          id: event.id?.toString() || `match-${index}`,
          sport: determineSport(event.tournament?.category?.sport?.name || "football"),
          homeTeam: event.homeTeam?.name || "Home Team",
          awayTeam: event.awayTeam?.name || "Away Team",
          homeScore,
          awayScore,
          status,
          time: event.startTimestamp ? new Date(event.startTimestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : "TBD",
          league: event.tournament?.name || event.tournament?.category?.name || "League",
          minute: event.time?.currentPeriodStartTimestamp ? `${Math.floor((Date.now() / 1000 - event.time.currentPeriodStartTimestamp) / 60)}'` : undefined,
        };
      });
    }
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
