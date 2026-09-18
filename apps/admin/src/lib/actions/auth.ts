'use server';

import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface AuthActionState {
  error: string | null;
}

export async function signInAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Bitte E-Mail und Passwort eingeben.' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
 // if (error || !data.user) return { error: 'Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten.' };
if (error) {
  console.error('Supabase Login Error:', error);
  return { error: `Supabase: ${error.message}` };
}

if (!data.user) {
  return { error: 'Supabase hat keinen Benutzer zurückgegeben.' };
}
 // vorübergehend

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (profile?.role !== 'admin') {
    await supabase.auth.signOut();
    return { error: 'Dieses Konto hat keine Admin-Berechtigung.' };
  }

  redirect('/dashboard');
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
