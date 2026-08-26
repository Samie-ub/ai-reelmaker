import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

// Vitest must stay hermetic even when a developer has cloud credentials in .env.local.
export const isDatabaseConfigured = import.meta.env.MODE !== 'test' && Boolean(supabaseUrl && publishableKey);

const client = isDatabaseConfigured
  ? createClient(supabaseUrl as string, publishableKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

let userPromise: Promise<User> | null = null;

export const getSupabaseClient = (): SupabaseClient | null => client;

export const ensureDatabaseUser = async (): Promise<User> => {
  if (!client) throw new Error('Supabase is not configured.');
  if (!userPromise) {
    userPromise = (async () => {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (sessionData.session?.user) return sessionData.session.user;
      const { data, error } = await client.auth.signInAnonymously();
      if (error || !data.user) throw error ?? new Error('Supabase did not create an anonymous user.');
      return data.user;
    })().catch((error) => { userPromise = null; throw error; });
  }
  return userPromise;
};
