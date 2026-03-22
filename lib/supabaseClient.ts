
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initial dummy client to prevent crashes
const initialUrl = 'https://placeholder.supabase.co';
const initialKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export let supabase: SupabaseClient = createClient(initialUrl, initialKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Disable LockManager to prevent timeout errors in iframes
    lock: (...args: any[]) => {
      const acquire = args.find(arg => typeof arg === 'function');
      return acquire ? acquire() : Promise.resolve();
    }
  }
});
export let isSupabaseConfigured = false;

/**
 * Dynamically re-initialize the Supabase client with real keys.
 * This is called by App.tsx after fetching config from the BFF.
 */
export const initializeSupabase = (url: string, serviceKey: string) => {
  if (!url || !serviceKey) return;
  supabase = createClient(url, serviceKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Disable LockManager to prevent timeout errors in iframes
      lock: (...args: any[]) => {
        const acquire = args.find(arg => typeof arg === 'function');
        return acquire ? acquire() : Promise.resolve();
      }
    }
  });
  isSupabaseConfigured = true;
};
