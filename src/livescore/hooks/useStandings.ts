import { useState, useEffect } from "react";
import { getEdgeFunctionUrl, SUPABASE_ANON_KEY } from "@/lib/supabase";

export interface StandingsTeam {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form?: string[];
}

export function useStandings(leagueId: string = "47") {
  const [standings, setStandings] = useState<StandingsTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const fetchStandings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(getEdgeFunctionUrl(`make-server-ed1dd9fb/standings/${leagueId}`), {
          headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        });
        const responseText = await response.text();
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error("The server returned an invalid response. The standings API may be experiencing issues.");
        }
        if (response.status === 429 || data.error?.includes("quota") || data.error?.includes("rate limit")) {
          setQuotaExceeded(true);
          const { premierLeagueStandings } = await import("../data/mockData");
          setStandings(premierLeagueStandings);
        } else if (data.error) {
          throw new Error(data.message || data.error);
        } else if (data.success && data.standings) {
          const transformedStandings = transformApiStandings(data.standings);
          setStandings(transformedStandings);
        } else {
          throw new Error(data.message || "No standings data available");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load standings");
        const { premierLeagueStandings } = await import("../data/mockData");
        setStandings(premierLeagueStandings);
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, [leagueId]);

  return { standings, loading, error, quotaExceeded };
}

function transformApiStandings(apiData: any): StandingsTeam[] {
  try {
    let teamsArray: any[] = [];
    if (apiData.response && Array.isArray(apiData.response.standing)) teamsArray = apiData.response.standing;
    else if (apiData.standing && Array.isArray(apiData.standing)) teamsArray = apiData.standing;
    else if (Array.isArray(apiData)) teamsArray = apiData;
    else if (apiData.data && Array.isArray(apiData.data)) teamsArray = apiData.data;
    else if (apiData.standings && Array.isArray(apiData.standings)) teamsArray = apiData.standings;
    else return [];

    return teamsArray.map((team: any, index: number) => {
      let goalsFor = 0;
      let goalsAgainst = 0;
      if (team.scoresStr && typeof team.scoresStr === 'string') {
        const scores = team.scoresStr.split('-');
        goalsFor = parseInt(scores[0]) || 0;
        goalsAgainst = parseInt(scores[1]) || 0;
      }
      return {
        position: team.idx || team.position || team.rank || index + 1,
        team: team.name || team.shortName || team.team || team.teamName || "Unknown Team",
        played: team.played || team.matchesPlayed || team.games || 0,
        won: team.wins || team.won || team.w || 0,
        drawn: team.draws || team.drawn || team.d || 0,
        lost: team.losses || team.lost || team.l || 0,
        goalsFor: goalsFor || team.goalsFor || team.gf || team.goalsScored || 0,
        goalsAgainst: goalsAgainst || team.goalsAgainst || team.ga || team.goalsConceded || 0,
        goalDifference: team.goalConDiff || team.goalDifference || team.gd || goalsFor - goalsAgainst || 0,
        points: team.pts || team.points || 0,
        form: team.form || undefined,
      };
    });
  } catch {
    return [];
  }
}
