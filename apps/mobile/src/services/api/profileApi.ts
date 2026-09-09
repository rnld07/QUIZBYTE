import type { Profile } from '@quizbyte/shared';

import { AppError, toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

import { toProfile } from './mappers';

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw toAppError(error, 'Dein Profil konnte gerade nicht geladen werden.');
  return toProfile(data);
}

export interface UpdateProfileInput {
  userId: string;
  username?: string;
  displayName?: string | null;
}

export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  const patch: { username?: string; display_name?: string | null } = {};
  if (input.username !== undefined) patch.username = input.username;
  if (input.displayName !== undefined) patch.display_name = input.displayName;

  const { data, error } = await supabase.from('profiles').update(patch).eq('id', input.userId).select('*').single();
  if (error) {
    const appError = toAppError(error);
    if (appError.code === 'conflict') {
      throw new AppError('conflict', 'Dieser Benutzername ist bereits vergeben.', error);
    }
    throw appError;
  }
  return toProfile(data);
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_available', { p_username: username });
  if (error) throw toAppError(error);
  return Boolean(data);
}
