import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingProfileFor = useRef<string | null>(null);

  const loadProfile = async (authUser: User) => {
    if (loadingProfileFor.current === authUser.id) return;
    loadingProfileFor.current = authUser.id;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const profileDetails = authUser.user_metadata?.profile_details;
        setProfile({
          ...data,
          ...(profileDetails && typeof profileDetails === 'object' ? profileDetails : {}),
        });
        return;
      }

      const username =
        authUser.user_metadata?.username ||
        authUser.email?.split('@')[0] ||
        'user';

      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .upsert(
          { id: authUser.id, username, full_name: '', bio: '', avatar_url: '' },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (createError) throw createError;
      setProfile(createdProfile);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Error loading profile:', message);
      setProfile(null);
    } finally {
      loadingProfileFor.current = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // loadProfile is defined outside useEffect but is stable (uses refs/state setters only)
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('auth-sign-up', {
        body: { email: email.trim().toLowerCase(), password, username: username.trim() },
      });

      if (error) throw error;

      if (data?.session) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (sessionError) throw sessionError;
        if (sessionData.user) await loadProfile(sessionData.user);
      }
      return !data?.session;
    } catch (err: unknown) {
      console.error('SignUp error:', err instanceof Error ? err.message : JSON.stringify(err));
      throw err;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;
    } catch (err: unknown) {
      console.error('SignIn error:', err instanceof Error ? err.message : JSON.stringify(err));
      throw err;
    }
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, resendConfirmation, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
