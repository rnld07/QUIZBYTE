import { redirect } from 'next/navigation';

import type { Tables } from '@quizbyte/database';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface AdminContext {
  userId: string;
  email: string | null;
  profile: Tables<'profiles'>;
}

/**
 * Loads the current user and verifies the admin role. Redirects otherwise.
 * Every admin page/action goes through this – URLs alone never grant access,
 * and the database enforces the same role via RLS for every query.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    redirect('/login?error=forbidden');
  }

  return { userId: user.id, email: user.email ?? null, profile };
}
