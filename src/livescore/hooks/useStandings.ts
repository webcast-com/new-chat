import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";

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
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-ed1dd9fb/standings/${leagueId}`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        const responseText = await response.text();
        console.log("Raw standings response (first 200 chars):", responseText.substring(0, 200));

        let data;
        try {
          data = JSON.parse(responseText);
          console.log("Parsed standings response:", data);
        } catch (parseError) {
          console.error("Failed to parse standings response as JSON:", parseError);
          throw new Error("The server returned an invalid response. The standings API may be experiencing issues.");
        }

        if (response.status === 429 || data.error?.includes("quota") || data.error?.includes("rate limit")) {
          console.warn("API quota exceeded, falling back to mock data");
          setQuotaExceeded(true);
          // Import and use mock data as fallback
          const { premierLeagueStandings } = await import("../data/mockData");
          setStandings(premierLeagueStandings);
        } else if (data.error) {
          throw new Error(data.message || data.error);
        } else if (data.success && data.standings) {
          // Transform API response to our format
          const transformedStandings = transformApiStandings(data.standings);
          setStandings(transformedStandings);
        } else {
          throw new Error(data.message || "No standings data available");
        }
      } catch (err) {
        console.error("Error fetching standings:", err);
        setError(err instanceof Error ? err.message : "Failed to load standings");
        // Fallback to mock data on error
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

// Transform the API response to match our StandingsTeam interface
function transformApiStandings(apiData: any): StandingsTeam[] {
  try {
    // The API structure might vary, so we'll handle different formats
    let teamsArray = [];

    // Handle Free API Live Football Data structure: response.standing
    if (apiData.response && Array.isArray(apiData.response.standing)) {
      teamsArray = apiData.response.standing;
    } else if (apiData.standing && Array.isArray(apiData.standing)) {
      teamsArray = apiData.standing;
    } else if (Array.isArray(apiData)) {
      teamsArray = apiData;
    } else if (apiData.data && Array.isArray(apiData.data)) {
      teamsArray = apiData.data;
    } else if (apiData.standings && Array.isArray(apiData.standings)) {
      teamsArray = apiData.standings;
    } else {
      console.warn("Unknown API data structure:", apiData);
      return [];
    }

    return teamsArray.map((team: any, index: number) => {
      // Parse scoresStr if present (format: "61-22" for goalsFor-goalsAgainst)
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
        goalDifference: team.goalConDiff || team.goalDifference || team.gd || (goalsFor - goalsAgainst) || 0,
        points: team.pts || team.points || 0,
        form: team.form || undefined,
      };
    });
  } catch (error) {
    console.error("Error transforming standings data:", error);
    return [];
  }
}
