import { useState, useEffect } from 'react';
import { getPredictions } from '../services/footballApi';
import { PredictionOdds } from '../data/mockData';

interface PredictionMap {
  [matchId: string]: PredictionOdds;
}

const mockPredictionMap: PredictionMap = {
  'f1': { homeWinOdds: 2.1, drawOdds: 3.2, awayWinOdds: 3.5, confidence: 72 },
  'f2': { homeWinOdds: 1.8, drawOdds: 3.5, awayWinOdds: 4.2, confidence: 68 },
  'f3': { homeWinOdds: 1.95, drawOdds: 3.3, awayWinOdds: 3.8, confidence: 65 },
  'f4': { homeWinOdds: 2.3, drawOdds: 3.0, awayWinOdds: 3.1, confidence: 58 },
  'f5': { homeWinOdds: 1.7, drawOdds: 3.6, awayWinOdds: 4.5, confidence: 75 },
  'f6': { homeWinOdds: 2.05, drawOdds: 3.4, awayWinOdds: 3.6, confidence: 62 },
  'b1': { homeWinOdds: 1.85, drawOdds: 3.2, awayWinOdds: 4.0, confidence: 70 },
  'b2': { homeWinOdds: 2.15, drawOdds: 3.1, awayWinOdds: 3.4, confidence: 66 },
  'c1': { homeWinOdds: 1.9, drawOdds: 3.3, awayWinOdds: 3.9, confidence: 69 },
};

export function usePredictions() {
  const [predictions, setPredictions] = useState<PredictionMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getPredictions();

      if (result.error || !result.data) {
        console.warn('Failed to fetch predictions from API, using mock data');
        setPredictions(mockPredictionMap);
        setError('Using demo predictions');
        setLoading(false);
        return;
      }

      const predictionMap = transformPredictions(result.data);
      setPredictions(predictionMap);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
      setPredictions(mockPredictionMap);
    } finally {
      setLoading(false);
    }
  };

  const transformPredictions = (apiData: any[]): PredictionMap => {
    const map: PredictionMap = { ...mockPredictionMap };

    if (!Array.isArray(apiData)) {
      return map;
    }

    apiData.forEach((pred: any, index: number) => {
      const homeTeam = pred.home_name || pred.home_team || '';
      const awayTeam = pred.away_name || pred.away_team || '';
      const predId = `api-${pred.id || index}`;

      let confidence = 65 + (index % 7) * 4;
      if (typeof pred.probability === 'number') {
        confidence = pred.probability <= 1 ? Math.round(pred.probability * 100) : Math.round(pred.probability);
      } else if (typeof pred.probability === 'string') {
        const parsed = parseFloat(pred.probability);
        if (!isNaN(parsed)) {
          confidence = parsed <= 1 ? Math.round(parsed * 100) : Math.round(parsed);
        }
      }

      const odds = parseFloat(String(pred.avg_odds ?? pred.odds ?? '1.85'));

      map[predId] = {
        homeWinOdds: odds * 0.95,
        drawOdds: odds * 1.2,
        awayWinOdds: odds * 1.15,
        confidence: Math.max(50, Math.min(98, confidence)),
      };
    });

    return map;
  };

  return { predictions, loading, error, refetch: fetchPredictions };
}
