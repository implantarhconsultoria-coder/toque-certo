import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { supabase, authConfigured, exchangeAuthCode } from './supabase';

type ContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  recoveryMode: boolean;
  clearRecoveryMode: () => void;
};
const AuthContext = createContext<ContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUser(data.session?.user ?? null);
    }).finally(() => { if (mounted) setLoading(false); });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
        if (event === 'SIGNED_OUT') setRecoveryMode(false);
      }
    });

    async function acceptCallback(uri: string) {
      if (Platform.OS === 'web' || !uri.startsWith('toquecerto://auth/callback')) return;
      const match = uri.match(/[?&]code=([^&#]+)/);
      if (!match) return;
      try { await exchangeAuthCode(decodeURIComponent(match[1])); }
      catch (error) { console.warn('Não foi possível concluir o login:', error instanceof Error ? error.message : error); }
    }
    const deepLink = Linking.addEventListener('url', ({ url }) => { void acceptCallback(url); });
    void Linking.getInitialURL().then(url => { if (url) void acceptCallback(url); });
    return () => { mounted = false; listener.subscription.unsubscribe(); deepLink.remove(); };
  }, []);

  const value = useMemo<ContextValue>(() => ({
    user, loading, configured: authConfigured, recoveryMode,
    clearRecoveryMode: () => setRecoveryMode(false),
  }), [user, loading, recoveryMode]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): ContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth requer AuthProvider');
  return value;
}
