import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type Plan = 'free' | 'premium';

export interface UserPlan {
  plan: Plan;
  plan_expires_at: string | null;
}

export interface UserPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  favorite_teams: string[];
  favorite_leagues: string[];
  dark_mode: boolean;
  language: string;
}

export interface AuthUser extends User {
  plan: Plan;
  plan_expires_at: string | null;
  name?: string;
  country?: string;
  bio?: string;
  preferences?: UserPreferences;
}

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  planLoading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  upgrade: (paystackRef: string) => Promise<void>;
  refreshPlan: () => Promise<void>;
  updateProfile: (data: { name?: string; country?: string; bio?: string; preferences?: Partial<UserPreferences> }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Supabase helpers ──────────────────────────────────────────────────────────

async function fetchUserPlan(userId: string): Promise<UserPlan> {
  const { data, error } = await supabase
    .from('user_plans')
    .select('plan, plan_expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return { plan: 'free', plan_expires_at: null };

  // Auto-expire premium if past expiry
  if (data.plan === 'premium' && data.plan_expires_at) {
    if (new Date(data.plan_expires_at) < new Date()) {
      await supabase
        .from('user_plans')
        .update({ plan: 'free', plan_expires_at: null })
        .eq('user_id', userId);
      return { plan: 'free', plan_expires_at: null };
    }
  }

  return { plan: data.plan ?? 'free', plan_expires_at: data.plan_expires_at ?? null };
}

async function upsertUserPlan(userId: string, plan: Plan, expiresAt: string | null) {
  const { error } = await supabase
    .from('user_plans')
    .upsert(
      { user_id: userId, plan, plan_expires_at: expiresAt, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

async function fetchUserPreferences(userId: string): Promise<UserPreferences | null> {
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return data ? {
    email_notifications: data.email_notifications ?? true,
    push_notifications: data.push_notifications ?? true,
    sms_notifications: data.sms_notifications ?? false,
    favorite_teams: data.favorite_teams ?? [],
    favorite_leagues: data.favorite_leagues ?? [],
    dark_mode: data.dark_mode ?? false,
    language: data.language ?? 'en',
  } : null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);

  const buildAuthUser = (u: User, planData: UserPlan, prefsData?: UserPreferences | null): AuthUser => ({
    ...u,
    plan: planData.plan,
    plan_expires_at: planData.plan_expires_at,
    name: u.user_metadata?.display_name || u.email?.split('@')[0],
    country: u.user_metadata?.country,
    bio: u.user_metadata?.bio,
    preferences: prefsData ?? undefined,
  });

  const loadPlan = useCallback(async (u: User) => {
    setPlanLoading(true);
    try {
      const [planData, prefsData] = await Promise.all([
        fetchUserPlan(u.id),
        fetchUserPreferences(u.id),
      ]);
      setUser(buildAuthUser(u, planData, prefsData));
    } catch {
      setUser(buildAuthUser(u, { plan: 'free', plan_expires_at: null }));
    } finally {
      setPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadPlan(session.user).finally(() => setLoading(false));
      } else {
        setUser(null);
        setLoading(false);
      }
    }).catch(() => {
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadPlan(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadPlan]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      return { error };
    } catch {
      return { error: { message: 'Unable to reach the authentication service. Please try again.' } as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch {
      return { error: { message: 'Unable to reach the authentication service. Please try again.' } as AuthError };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      setSession(null);
      setUser(null);
    }
  };

  const upgrade = async (paystackRef: string) => {
    if (!user) throw new Error('Not authenticated');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await upsertUserPlan(user.id, 'premium', expiresAt);

    // Log the payment reference
    await supabase.from('payment_logs').insert({
      user_id: user.id,
      provider: 'paystack',
      reference: paystackRef,
      amount: 100,
      currency: 'KES',
      plan: 'premium',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    }).then(() => {}); // Non-blocking — ignore errors

    setUser((u) => u ? { ...u, plan: 'premium', plan_expires_at: expiresAt } : null);
  };

  const refreshPlan = async () => {
    if (!user) return;
    await loadPlan(user);
  };

  const updateProfile = async (data: { name?: string; country?: string; bio?: string; preferences?: Partial<UserPreferences> }) => {
    if (!user) throw new Error('Not authenticated');

    const updates: any = {};
    if (data.name !== undefined) updates.display_name = data.name;
    if (data.country !== undefined) updates.country = data.country;
    if (data.bio !== undefined) updates.bio = data.bio;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.auth.updateUser({ data: updates });
      if (error) throw error;
    }

    if (data.preferences) {
      const prefsToUpdate = {
        user_id: user.id,
        ...(data.preferences.email_notifications !== undefined && { email_notifications: data.preferences.email_notifications }),
        ...(data.preferences.push_notifications !== undefined && { push_notifications: data.preferences.push_notifications }),
        ...(data.preferences.sms_notifications !== undefined && { sms_notifications: data.preferences.sms_notifications }),
        ...(data.preferences.favorite_teams !== undefined && { favorite_teams: data.preferences.favorite_teams }),
        ...(data.preferences.favorite_leagues !== undefined && { favorite_leagues: data.preferences.favorite_leagues }),
        ...(data.preferences.dark_mode !== undefined && { dark_mode: data.preferences.dark_mode }),
        ...(data.preferences.language !== undefined && { language: data.preferences.language }),
      };

      const { error } = await supabase
        .from('user_preferences')
        .upsert(prefsToUpdate, { onConflict: 'user_id' });
      if (error) throw error;
    }

    await loadPlan(user);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, planLoading, signUp, signIn, signOut, upgrade, refreshPlan, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
