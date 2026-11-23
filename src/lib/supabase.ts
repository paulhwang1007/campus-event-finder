import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** False when .env.local is missing, so the app can show a setup message instead of crashing. */
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || 'http://localhost', anonKey || 'missing-key');

export function signInWithCornellGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      // Only a hint to Google's account picker; the database hook enforces @cornell.edu.
      queryParams: { hd: 'cornell.edu', prompt: 'select_account' },
    },
  });
}

export function signOut() {
  return supabase.auth.signOut();
}
