import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { z } from 'zod';

export const ReferralCodeSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  code: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export type ReferralCode = z.infer<typeof ReferralCodeSchema>;

export interface ReferralStats {
  user_id: string;
  code: string;
  total_referrals: number;
  completed_referrals: number;
  total_days_earned: number;
  last_referral_at: string | null;
}

export function useReferral() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Get or create referral code
  const referralCodeQuery = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async (): Promise<ReferralCode | null> => {
      if (!user?.id) return null;

      // Try to get existing
      const { data: existing } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existing) return existing as ReferralCode;

      // Create new via RPC if not exists
      try {
        const { data: code, error: rpcError } = await supabase.rpc('get_or_create_referral_code', { p_user_id: user.id });
        if (rpcError) throw rpcError;
        
        // Fetch the created code
        const { data: newCode } = await supabase
          .from('referral_codes')
          .select('*')
          .eq('user_id', user.id)
          .eq('code', code)
          .maybeSingle();
        
        return newCode as ReferralCode || null;
      } catch (err) {
        // Fallback: generate client-side code (will be created via trigger or manual)
        const fallbackCode = `SCORE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const { data: inserted, error: insertError } = await supabase
          .from('referral_codes')
          .insert({ user_id: user.id, code: fallbackCode, is_active: true })
          .select()
          .single();
        
        if (insertError && insertError.code === '23505') {
          // Race condition - fetch again
          const { data: retry } = await supabase
            .from('referral_codes')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();
          return retry as ReferralCode || null;
        }
        
        if (insertError) throw insertError;
        return inserted as ReferralCode;
      }
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  const statsQuery = useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async (): Promise<ReferralStats | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('referral_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // Fallback: compute from referrals table
        const { data: referrals } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id);

        const { data: earnings } = await supabase
          .from('referral_earnings')
          .select('*')
          .eq('user_id', user.id);

        const totalDays = earnings?.reduce((sum, e) => sum + (e.days_earned || 0), 0) || 0;

        return {
          user_id: user.id,
          code: referralCodeQuery.data?.code || '',
          total_referrals: referrals?.length || 0,
          completed_referrals: referrals?.filter(r => r.status === 'completed').length || 0,
          total_days_earned: totalDays,
          last_referral_at: referrals?.[0]?.created_at || null,
        };
      }

      return data as ReferralStats | null;
    },
    enabled: !!user?.id,
  });

  const referralsQuery = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const applyReferralMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('complete_referral', {
        p_referral_code: code,
        p_referred_id: user.id,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message || 'Failed to apply referral');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
      queryClient.invalidateQueries({ queryKey: ['referral-code'] });
    },
  });

  const copyReferralLink = async () => {
    const code = referralCodeQuery.data?.code;
    if (!code) return;

    const link = `${window.location.origin}/?ref=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Track activity
      supabase.from('user_activity').insert({
        user_id: user?.id,
        action: 'referral_link_copied',
        metadata: { code },
      }).then(() => {});
    } catch {
      // Fallback
      prompt('Copy your referral link:', link);
    }
  };

  const shareReferral = async () => {
    const code = referralCodeQuery.data?.code;
    if (!code) return;

    const link = `${window.location.origin}/?ref=${code}`;
    const text = `Join me on ScoreHub - Live Sports Scores! Use my referral code ${code} and get 3 days premium free! ${link}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ScoreHub - Live Sports',
          text,
          url: link,
        });
        supabase.from('user_activity').insert({
          user_id: user?.id,
          action: 'referral_link_shared',
          metadata: { code, method: 'web_share' },
        }).then(() => {});
      } catch {
        // User cancelled or failed
      }
    } else {
      copyReferralLink();
    }
  };

  // Check for ?ref= in URL on mount to auto-apply referral for new users
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode && user?.id) {
      // Only apply if user is new (check if they already have a referral)
      supabase.from('referrals').select('*').eq('referred_id', user.id).maybeSingle().then(({ data }) => {
        if (!data) {
          // Auto-apply after 2s delay for UX
          setTimeout(() => {
            applyReferralMutation.mutate(refCode);
          }, 2000);
        }
      });
    }
  }, [user?.id]);

  // Stable reference (see useFavorites): `data || []` would create a new array
  // on every render while the query is disabled/loading.
  const referrals = useMemo(() => referralsQuery.data || [], [referralsQuery.data]);

  return {
    referralCode: referralCodeQuery.data,
    stats: statsQuery.data,
    referrals,
    loading: referralCodeQuery.isLoading || statsQuery.isLoading,
    error: referralCodeQuery.error || statsQuery.error,
    copied,
    copyReferralLink,
    shareReferral,
    applyReferral: applyReferralMutation.mutateAsync,
    isApplying: applyReferralMutation.isPending,
    applyError: applyReferralMutation.error,
    refetch: () => {
      referralCodeQuery.refetch();
      statsQuery.refetch();
      referralsQuery.refetch();
    },
  };
}
