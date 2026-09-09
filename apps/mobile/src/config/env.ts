import { parseAppEnvironment } from '@quizbyte/shared';
import type { AppEnvironment } from '@quizbyte/shared';

/**
 * Public runtime configuration. Only EXPO_PUBLIC_* variables are ever bundled
 * into the app – they are safe to expose (the anon key is protected by RLS).
 */
export interface MobileEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appEnv: AppEnvironment;
  /** True when Supabase credentials are missing – the app shows a setup hint. */
  isConfigured: boolean;
}

function readEnv(): MobileEnv {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return {
    supabaseUrl,
    supabaseAnonKey,
    appEnv: parseAppEnvironment(process.env.EXPO_PUBLIC_APP_ENV),
    isConfigured: supabaseUrl.length > 0 && supabaseAnonKey.length > 0,
  };
}

export const env: MobileEnv = readEnv();
