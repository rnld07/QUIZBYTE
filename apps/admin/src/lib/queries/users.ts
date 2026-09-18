import type { Enums } from '@quizbyte/database';

import { rpcError } from '@/lib/queries/rpcError';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const USER_PAGE_SIZE = 25;

export type UserStatusFilter = 'all' | 'active' | 'suspended' | 'reported' | 'admin';
export type UserSort = 'created_at' | 'xp' | 'streak' | 'sessions' | 'reports' | 'last_seen' | 'username';

const STATUS_VALUES: readonly UserStatusFilter[] = ['all', 'active', 'suspended', 'reported', 'admin'];
const SORT_VALUES: readonly UserSort[] = ['created_at', 'xp', 'streak', 'sessions', 'reports', 'last_seen', 'username'];

export interface UserFilters {
  q: string;
  status: UserStatusFilter;
  sort: UserSort;
  page: number;
}

/** Liest die Filter aus der URL. Alles Unbekannte fällt auf die Vorgabe zurück. */
export function parseUserFilters(params: Record<string, string | string[] | undefined>): UserFilters {
  const pick = (key: string): string => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? '';
  };
  const status = pick('status') as UserStatusFilter;
  const sort = pick('sort') as UserSort;
  const page = Number(pick('page') || '1');

  return {
    q: pick('q').trim(),
    status: STATUS_VALUES.includes(status) ? status : 'all',
    sort: SORT_VALUES.includes(sort) ? sort : 'created_at',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

export interface UserRow {
  id: string;
  username: string;
  displayName: string | null;
  role: Enums<'user_role'>;
  createdAt: string;
  lastSignInAt: string | null;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  questionsAnswered: number;
  sessionsCompleted: number;
  accuracy: number;
  suspendedAt: string | null;
  suspendedReason: string | null;
  reportCount: number;
}

export interface UserListResult {
  rows: UserRow[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Eine Seite der Nutzertabelle.
 *
 * Die Gesamtzahl fährt in jeder Zeile mit (Fensterfunktion im RPC), deshalb
 * gibt es hier keine zweite Zählabfrage. Bei null Treffern steht sie nirgends –
 * dann ist die Gesamtzahl aber auch null.
 */
export async function listUsers(filters: UserFilters): Promise<UserListResult> {
  const supabase = await createSupabaseServerClient();
  const offset = (filters.page - 1) * USER_PAGE_SIZE;

  const { data, error } = await supabase.rpc('admin_list_users', {
    p_search: filters.q || null,
    p_status: filters.status,
    p_sort: filters.sort,
    p_limit: USER_PAGE_SIZE,
    p_offset: offset,
  });
  if (error) throw rpcError(error, 'Nutzer konnten nicht geladen werden');

  const rows = data ?? [];
  // Leere Seite heißt: kein Treffer. Die Gesamtzahl fährt in jeder Zeile mit,
  // also gibt es sie nur, wenn es mindestens eine gibt.
  const total = Number(rows[0]?.total_count ?? 0);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      createdAt: row.created_at,
      lastSignInAt: row.last_sign_in_at,
      totalXp: Number(row.total_xp),
      level: Number(row.level),
      currentStreak: Number(row.current_streak),
      longestStreak: Number(row.longest_streak),
      questionsAnswered: Number(row.questions_answered),
      sessionsCompleted: Number(row.sessions_completed),
      accuracy: Number(row.accuracy),
      suspendedAt: row.suspended_at,
      suspendedReason: row.suspended_reason,
      reportCount: Number(row.report_count),
    })),
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / USER_PAGE_SIZE)),
  };
}

export interface UserSessionRow {
  id: string;
  mode: string;
  session_type: string;
  started_at: string;
  completed_at: string | null;
  total_questions: number;
  correct_answers: number;
  xp_earned: number;
  category_name: string | null;
}

export interface UserDetail {
  id: string;
  username: string;
  displayName: string | null;
  role: Enums<'user_role'>;
  isAnonymous: boolean;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  searchable: boolean;
  allowFriendRequests: boolean;
  usernameChangedAt: string | null;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  questionsAnswered: number;
  correctAnswers: number;
  sessionsCompleted: number;
  lastActiveDate: string | null;
  friends: number;
  duels: number;
  reportsAgainst: number;
  reportsFiled: number;
  recentSessions: UserSessionRow[];
}

/** Ein Nutzer im Detail, oder null wenn es ihn nicht (mehr) gibt. */
export async function getUserDetail(id: string): Promise<UserDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_user_detail', { p_user_id: id });
  if (error) throw rpcError(error, 'Nutzer konnte nicht geladen werden');
  if (!data) return null;

  const raw = data as Record<string, unknown>;
  const num = (key: string): number => Number(raw[key] ?? 0);
  const str = (key: string): string | null => (raw[key] == null ? null : String(raw[key]));

  return {
    id: String(raw.id),
    username: String(raw.username),
    displayName: str('display_name'),
    role: raw.role as Enums<'user_role'>,
    isAnonymous: Boolean(raw.is_anonymous),
    email: str('email'),
    createdAt: String(raw.created_at),
    lastSignInAt: str('last_sign_in_at'),
    suspendedAt: str('suspended_at'),
    suspendedReason: str('suspended_reason'),
    searchable: Boolean(raw.searchable),
    allowFriendRequests: Boolean(raw.allow_friend_requests),
    usernameChangedAt: str('username_changed_at'),
    totalXp: num('total_xp'),
    level: num('level'),
    currentStreak: num('current_streak'),
    longestStreak: num('longest_streak'),
    questionsAnswered: num('questions_answered'),
    correctAnswers: num('correct_answers'),
    sessionsCompleted: num('sessions_completed'),
    lastActiveDate: str('last_active_date'),
    friends: num('friends'),
    duels: num('duels'),
    reportsAgainst: num('reports_against'),
    reportsFiled: num('reports_filed'),
    recentSessions: (raw.recent_sessions as UserSessionRow[] | null) ?? [],
  };
}
