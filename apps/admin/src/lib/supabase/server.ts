import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@quizbyte/database';

import { getPublicSupabaseEnv } from '@/lib/env';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Uses the signed-in admin's session (cookies) – RLS enforces the admin role.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component – cookies are refreshed by proxy.ts instead.
        }
      },
    },
  });
}
