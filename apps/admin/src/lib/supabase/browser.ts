import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@quizbyte/database';

import { getPublicSupabaseEnv } from '@/lib/env';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Supabase client for the browser, on the signed-in admin's session.
 *
 * Exists for uploads only. Everything else goes through Server Actions – but a
 * file cannot: a Server Action payload is capped at 1 MB, and a study sheet is
 * a PDF plus one image per page. Those go straight from the browser into
 * storage, where the same RLS policies apply as everywhere else.
 *
 * Kept as a single instance so the session is not parsed on every call.
 */
export function createSupabaseBrowserClient() {
  if (client) return client;
  const { url, anonKey } = getPublicSupabaseEnv();
  client = createBrowserClient<Database>(url, anonKey);
  return client;
}
