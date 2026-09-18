import { rpcError } from '@/lib/queries/rpcError';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Die Kennzahlen des Dashboards.
 *
 * Alles kommt aus einem einzigen RPC. Der Grund ist nicht Bequemlichkeit: die
 * sieben Zahlen oben auf der Seite waren sonst sieben Rundreisen, von denen
 * jede auf die vorige wartet, weil Next sie in derselben Render-Phase
 * anstößt.
 */
export interface DashboardKpis {
  activeToday: number;
  activeYesterday: number;
  active7d: number;
  newUsersToday: number;
  newUsers7d: number;
  sessionsToday: number;
  sessionsCompletedToday: number;
  sessionsCompletedTotal: number;
  sessionsTotal: number;
  avgAccuracy: number;
  openUserReports: number;
  openQuestionReports: number;
  suspendedUsers: number;
  usersTotal: number;
  questionsTotal: number;
  questionsPublished: number;
  questionsReview: number;
  questionsDraft: number;
  questionsMissingImage: number;
  questionsMissingAudio: number;
  categoriesTotal: number;
  categoriesActive: number;
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_dashboard_kpis');
  if (error) throw rpcError(error, 'Kennzahlen konnten nicht geladen werden');

  const raw = (data ?? {}) as Record<string, unknown>;
  const num = (key: string): number => Number(raw[key] ?? 0);

  return {
    activeToday: num('active_today'),
    activeYesterday: num('active_yesterday'),
    active7d: num('active_7d'),
    newUsersToday: num('new_users_today'),
    newUsers7d: num('new_users_7d'),
    sessionsToday: num('sessions_today'),
    sessionsCompletedToday: num('sessions_completed_today'),
    sessionsCompletedTotal: num('sessions_completed_total'),
    sessionsTotal: num('sessions_total'),
    avgAccuracy: num('avg_accuracy'),
    openUserReports: num('open_user_reports'),
    openQuestionReports: num('open_question_reports'),
    suspendedUsers: num('suspended_users'),
    usersTotal: num('users_total'),
    questionsTotal: num('questions_total'),
    questionsPublished: num('questions_published'),
    questionsReview: num('questions_review'),
    questionsDraft: num('questions_draft'),
    questionsMissingImage: num('questions_missing_image'),
    questionsMissingAudio: num('questions_missing_audio'),
    categoriesTotal: num('categories_total'),
    categoriesActive: num('categories_active'),
  };
}

export interface ActivityDay {
  day: string;
  sessions: number;
  answers: number;
  activeUsers: number;
  newUsers: number;
}

/** Eine Zeile je Tag, auch für Tage, an denen nichts passiert ist. */
export async function getActivityHistory(days: number): Promise<ActivityDay[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_activity_history', { p_days: days });
  if (error) throw rpcError(error, 'Verlauf konnte nicht geladen werden');
  return (data ?? []).map((row) => ({
    day: row.day,
    sessions: Number(row.sessions),
    answers: Number(row.answers),
    activeUsers: Number(row.active_users),
    newUsers: Number(row.new_users),
  }));
}

export interface TopCategory {
  categoryId: string;
  name: string;
  slug: string;
  attempts: number;
  accuracy: number;
  players: number;
}

export async function getTopCategories(days = 30, limit = 6): Promise<TopCategory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_top_categories', { p_days: days, p_limit: limit });
  if (error) throw rpcError(error, 'Kategorien konnten nicht geladen werden');
  return (data ?? []).map((row) => ({
    categoryId: row.category_id,
    name: row.name,
    slug: row.slug,
    attempts: Number(row.attempts),
    accuracy: Number(row.accuracy),
    players: Number(row.players),
  }));
}

export interface HardQuestion {
  questionId: string;
  questionText: string;
  categoryName: string;
  difficulty: string;
  attempts: number;
  accuracy: number;
}

export async function getHardestQuestions(limit = 8): Promise<HardQuestion[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_hardest_questions', { p_min_attempts: 5, p_limit: limit });
  if (error) throw rpcError(error, 'Fragen konnten nicht geladen werden');
  return (data ?? []).map((row) => ({
    questionId: row.question_id,
    questionText: row.question_text,
    categoryName: row.category_name,
    difficulty: row.difficulty,
    attempts: Number(row.attempts),
    accuracy: Number(row.accuracy),
  }));
}

export interface RecentUser {
  id: string;
  username: string;
  displayName: string | null;
  createdAt: string;
  totalXp: number;
  level: number;
  suspended: boolean;
}

export async function getRecentUsers(limit = 6): Promise<RecentUser[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_recent_users', { p_limit: limit });
  if (error) throw rpcError(error, 'Nutzer konnten nicht geladen werden');
  return (data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    createdAt: row.created_at,
    totalXp: Number(row.total_xp),
    level: Number(row.level),
    suspended: row.suspended,
  }));
}
