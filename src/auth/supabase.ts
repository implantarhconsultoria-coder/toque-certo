import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient, type Provider } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
export const authConfigured = Boolean(url && key && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url));
export const supabase: SupabaseClient | null = authConfigured
  ? createClient(url!, key!, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true,
        detectSessionInUrl: Platform.OS === 'web', flowType: 'pkce', lock: processLock },
    })
  : null;

if (Platform.OS !== 'web' && supabase) {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase?.auth.startAutoRefresh();
    else supabase?.auth.stopAutoRefresh();
  });
}

export function authRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin + '/auth/callback';
  }
  return 'toquecerto://auth/callback';
}

export async function signInWithProvider(provider: Provider): Promise<void> {
  if (!supabase) throw new Error('Autenticação ainda não configurada.');
  const redirectTo = authRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider, options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
  });
  if (error) throw error;
  if (Platform.OS === 'web') return;
  if (!data.url) throw new Error('Provedor não retornou a URL de autenticação.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;
  const parsed = new URL(result.url);
  const code = parsed.searchParams.get('code');
  const oauthError = parsed.searchParams.get('error_description') || parsed.searchParams.get('error');
  if (oauthError) throw new Error(oauthError);
  if (!code) throw new Error('O provedor não retornou o código de autenticação.');
  const exchange = await supabase.auth.exchangeCodeForSession(code);
  if (exchange.error) throw exchange.error;
}
