import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';


export function useSavedPredictions() {
  const { user } = useAuth();
  const [savedPredictions, setSavedPredictions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const STORAGE_KEY = `saved_predictions_${user?.id || 'anon'}`;

  useEffect(() => {
    if (!user) return;
    loadSavedPredictions();
  }, [user?.id]);

  const loadSavedPredictions = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setSavedPredictions(new Set(ids));
      }
    } catch (err) {
      console.error('Error loading saved predictions:', err);
    }
  };

  const savePrediction = useCallback(async (predictionId: string) => {
    if (!user) return false;

    try {
      setLoading(true);
      const updated = new Set(savedPredictions);
      updated.add(predictionId);
      setSavedPredictions(updated);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(updated)));

      if (user.id) {
        try {
          await fetch('/api/predictions/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ predictionId, userId: user.id }),
          });
        } catch (err) {
          console.warn('Could not sync save to server:', err);
        }
      }

      return true;
    } catch (err) {
      console.error('Error saving prediction:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, savedPredictions, STORAGE_KEY]);

  const removeSavedPrediction = useCallback(async (predictionId: string) => {
    if (!user) return false;

    try {
      setLoading(true);
      const updated = new Set(savedPredictions);
      updated.delete(predictionId);
      setSavedPredictions(updated);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(updated)));

      if (user.id) {
        try {
          await fetch('/api/predictions/save', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ predictionId, userId: user.id }),
          });
        } catch (err) {
          console.warn('Could not sync remove to server:', err);
        }
      }

      return true;
    } catch (err) {
      console.error('Error removing saved prediction:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, savedPredictions, STORAGE_KEY]);

  const isSaved = useCallback((predictionId: string) => {
    return savedPredictions.has(predictionId);
  }, [savedPredictions]);

  const toggleSaved = useCallback(async (predictionId: string) => {
    if (isSaved(predictionId)) {
      return removeSavedPrediction(predictionId);
    } else {
      return savePrediction(predictionId);
    }
  }, [isSaved, savePrediction, removeSavedPrediction]);

  return {
    savedPredictions: Array.from(savedPredictions),
    isSaved,
    savePrediction,
    removeSavedPrediction,
    toggleSaved,
    loading,
  };
}
