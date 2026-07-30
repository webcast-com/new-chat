import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { z } from 'zod';

export const FavoriteSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  team_name: z.string().min(1),
  team_abbr: z.string().optional().nullable(),
  league: z.string().optional().nullable(),
  sport: z.enum(['all', 'football', 'basketball', 'soccer', 'baseball', 'tennis']).default('soccer'),
  team_logo_url: z.string().optional().nullable(),
  created_at: z.string().optional(),
});

export type Favorite = z.infer<typeof FavoriteSchema>;

export interface FavoriteInput {
  team_name: string;
  team_abbr?: string;
  league?: string;
  sport?: string;
  team_logo_url?: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [optimisticFavorites, setOptimisticFavorites] = useState<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async (): Promise<Favorite[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('favorites').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data as Favorite[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: async (input: FavoriteInput) => {
      if (!user?.id) throw new Error('Not authenticated');
      const parsed = FavoriteSchema.parse({
        user_id: user.id,
        team_name: input.team_name,
        team_abbr: input.team_abbr,
        league: input.league,
        sport: (input.sport as any) || 'soccer',
        team_logo_url: input.team_logo_url,
      });

      const { data, error } = await supabase.from('favorites').insert(parsed).select().single();
      if (error) {
        // If duplicate, treat as success (already favorited)
        if (error.code === '23505') {
          const { data: existing } = await supabase.from('favorites').select('*').eq('user_id', user.id).eq('team_name', input.team_name).maybeSingle();
          return existing as Favorite;
        }
        throw error;
      }
      return data as Favorite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (teamName: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('team_name', teamName);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
  });

  const isFavorite = useCallback((teamName: string) => {
    if (optimisticFavorites.has(teamName)) return true;
    return (query.data || []).some(f => f.team_name === teamName);
  }, [query.data, optimisticFavorites]);

  const toggleFavorite = useCallback(async (input: FavoriteInput) => {
    const teamName = input.team_name;
    const currentlyFav = isFavorite(teamName);

    // Optimistic update
    setOptimisticFavorites(prev => {
      const next = new Set(prev);
      if (currentlyFav) next.delete(teamName);
      else next.add(teamName);
      return next;
    });

    try {
      if (currentlyFav) {
        await removeMutation.mutateAsync(teamName);
        setOptimisticFavorites(prev => {
          const next = new Set(prev);
          next.delete(teamName);
          return next;
        });
      } else {
        await addMutation.mutateAsync(input);
      }
    } catch (err) {
      // Revert optimistic
      setOptimisticFavorites(prev => {
        const next = new Set(prev);
        if (currentlyFav) next.add(teamName);
        else next.delete(teamName);
        return next;
      });
      throw err;
    }
  }, [isFavorite, addMutation, removeMutation]);

  // Real-time subscription for favorites
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`favorites-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['favorites', user.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    favorites: query.data || [],
    loading: query.isLoading,
    error: query.error,
    isFavorite,
    toggleFavorite,
    addFavorite: addMutation.mutateAsync,
    removeFavorite: removeMutation.mutateAsync,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    refetch: query.refetch,
  };
}
