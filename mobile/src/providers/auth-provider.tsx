import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';

export type MobileRole = 'client' | 'courier' | 'partner' | 'admin';

export type FoodizProfile = {
  id: string;
  role: MobileRole;
  status: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  city: string | null;
};

type AuthContextValue = {
  loading: boolean;
  launched: boolean;
  session: Session | null;
  profile: FoodizProfile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [launched, setLaunched] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<FoodizProfile | null>(null);

  const loadProfile = useCallback(async (activeSession: Session | null) => {
    if (!activeSession?.user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id,role,status,first_name,last_name,full_name,email,city')
      .eq('id', activeSession.user.id)
      .single();

    if (error) {
      setProfile(null);
      throw error;
    }

    setProfile(data as FoodizProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session);
  }, [loadProfile, session]);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      let launchOpen = false;
      try {
        const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
        const response = await fetch(`${apiUrl}/api/launch-status`);
        const launchStatus = await response.json();
        launchOpen = launchStatus.launched === true;
        if (mounted) setLaunched(launchOpen);
      } catch {
        if (mounted) setLaunched(false);
      }
      setSession(data.session);
      try {
        if (launchOpen && data.session) await loadProfile(data.session);
        else setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        try {
          if (launched) await loadProfile(nextSession);
          else setProfile(null);
        } finally {
          if (mounted) setLoading(false);
        }
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [launched, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      launched,
      session,
      profile,
      refreshProfile,
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [launched, loading, profile, refreshProfile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
