import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from '@quizbyte/database';

import { env } from '@/config/env';

export type QuizByteSupabaseClient = SupabaseClient<Database>;

/**
 * Single Supabase client for the app. Uses the public anon key only – all data
 * access is protected by Row Level Security.
 */
export const supabase: QuizByteSupabaseClient = createClient<Database>(
  env.supabaseUrl || 'http://localhost:54321',
  env.supabaseAnonKey || 'not-configured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Refresh tokens only while the app is in the foreground (recommended by Supabase).
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
