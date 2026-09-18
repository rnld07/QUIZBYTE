import { normalizeAvatarConfig } from '@quizbyte/shared';
import type { AvatarConfig } from '@quizbyte/shared';

import type { Enums } from '@quizbyte/database';

import { AppError, toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

/** Why a user was reported – mirrors the `user_report_reason` enum. */
export type UserReportReason = Enums<'user_report_reason'>;

export interface ReportUserInput {
  reporterId: string;
  reportedId: string;
  reason: UserReportReason;
  /** Free text from the reporter; empty is fine, the reason alone carries it. */
  details?: string;
}

/**
 * Files a report about another player.
 *
 * The same shape as reporting a question: the row belongs to whoever wrote it,
 * nobody else can read it, and the person reported is never told. A second
 * report with the same reason against the same person is refused by a unique
 * constraint – reported is reported, and filing it ten times says nothing more
 * than filing it once.
 */
export async function reportUser({ reporterId, reportedId, reason, details }: ReportUserInput): Promise<void> {
  const { error } = await supabase.from('user_reports').insert({
    reporter_id: reporterId,
    reported_id: reportedId,
    reason,
    details: details?.trim() ?? '',
  });

  // 23505 is the unique violation: this reason is already on file.
  if (error && error.code === '23505') return;
  if (error) throw toAppError(error, 'Die Meldung konnte nicht gesendet werden.');
}

/**
 * Blocks a player.
 *
 * The server does the work – it also drops the friendship and any open request,
 * which is why this is an RPC and not an insert.
 */
export async function blockUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('block_user', { p_user_id: userId });
  if (error) throw toAppError(error, 'Der Nutzer konnte nicht blockiert werden.');
}

/**
 * Lifts my own block on someone.
 *
 * Throws when there was nothing to lift: that means the block is on the other
 * side, and only the other person can take it back. Saying so beats letting
 * somebody tap "Entsperren" and wonder why nothing changed.
 */
export async function unblockUser(userId: string): Promise<void> {
  const { data, error } = await supabase.rpc('unblock_user', { p_user_id: userId });
  if (error) throw toAppError(error, 'Die Blockierung konnte nicht aufgehoben werden.');
  if (data === false) {
    throw new AppError(
      'unknown',
      'Von dir aus war keine Blockierung gesetzt. Wenn ihr euch trotzdem nicht findet, hat die andere Person dich blockiert – das kann nur sie aufheben.',
    );
  }
}

export interface BlockedUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarConfig: AvatarConfig;
  blockedAt: number;
}

/** Everyone I have blocked, newest first. */
export async function fetchBlockedUsers(): Promise<BlockedUser[]> {
  const { data, error } = await supabase.rpc('get_my_blocks');
  if (error) throw toAppError(error, 'Die Liste konnte nicht geladen werden.');

  return (data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarConfig: normalizeAvatarConfig(row.avatar_config),
    blockedAt: new Date(row.created_at).getTime(),
  }));
}
