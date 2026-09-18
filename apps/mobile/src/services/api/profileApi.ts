import type { AvatarConfig, Profile } from '@quizbyte/shared';

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

/**
 * Stores the pet the user put together.
 *
 * A plain update rather than an RPC: there is nothing to check that the client
 * could get wrong. Column rights are granted per column, so this can only ever
 * touch `avatar_config`, and anything unknown in it falls back on the way out.
 */
export async function updateAvatarConfig(userId: string, config: AvatarConfig): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    // The column is free-form JSON; the shape is ours, not the database's.
    .update({ avatar_config: { ...config } })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw toAppError(error, 'Dein Avatar konnte nicht gespeichert werden.');
  return toProfile(data);
}

/**
 * Equips a profile frame, or takes it off with `null`.
 *
 * Goes through an RPC rather than a plain update: only the server can check
 * that the level actually unlocks the frame.
 */
export async function setProfileFrame(frameId: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_profile_frame', { p_frame: frameId });
  if (error) throw toAppError(error, 'Der Rahmen konnte nicht gesetzt werden.');
}
