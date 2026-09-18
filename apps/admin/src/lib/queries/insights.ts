import { rpcError } from '@/lib/queries/rpcError';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/** Die Antwortzahlen einer Frage – geladen für genau eine Tabellenseite. */
export interface QuestionStat {
  attempts: number;
  correct: number;
  accuracy: number;
  openReports: number;
  totalReports: number;
}

/**
 * Statistik für eine Handvoll Fragen, als Map zum Nachschlagen.
 *
 * Bewusst nur für die Ids, die gerade auf dem Bildschirm stehen. Eine
 * Aggregation über alle Antworten wäre für jede Seite dieselbe Arbeit, und die
 * Tabelle zeigt fünfundzwanzig Zeilen.
 */
export async function getQuestionStats(ids: string[]): Promise<Map<string, QuestionStat>> {
  if (ids.length === 0) return new Map();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_question_stats', { p_ids: ids });
  if (error) throw rpcError(error, 'Fragestatistik konnte nicht geladen werden');

  return new Map(
    (data ?? []).map((row) => [
      row.question_id,
      {
        attempts: Number(row.attempts),
        correct: Number(row.correct),
        accuracy: Number(row.accuracy),
        openReports: Number(row.open_reports),
        totalReports: Number(row.total_reports),
      },
    ]),
  );
}

/**
 * Die Ids der Fragen, auf die ein Signal zutrifft.
 *
 * "Hohe Fehlerquote" und "gemeldet" hängen an anderen Tabellen als die Frage
 * selbst. Statt die Fragenabfrage umzubauen, kommt die Id-Liste von hier und
 * geht als weiterer Filter in dieselbe Abfrage – Blätterung und alle übrigen
 * Filter bleiben damit unverändert.
 */
export async function getQuestionIdsBySignal(signal: 'reported' | 'hard'): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_question_ids_by_signal', {
    p_signal: signal,
    p_max_accuracy: 45,
    p_min_attempts: 5,
  });
  if (error) throw rpcError(error, 'Filter konnte nicht angewendet werden');
  return (data ?? []) as string[];
}

export interface CategoryStat {
  questionsTotal: number;
  questionsPublished: number;
  questionsMissingImage: number;
  questionsMissingAudio: number;
  attempts: number;
  accuracy: number;
  players: number;
}

/** Je Kategorie: Bestand und Trefferquote, zum Nachschlagen nach Id. */
export async function getCategoryStats(): Promise<Map<string, CategoryStat>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_category_stats');
  if (error) throw rpcError(error, 'Kategoriestatistik konnte nicht geladen werden');

  return new Map(
    (data ?? []).map((row) => [
      row.category_id,
      {
        questionsTotal: Number(row.questions_total),
        questionsPublished: Number(row.questions_published),
        questionsMissingImage: Number(row.questions_missing_image),
        questionsMissingAudio: Number(row.questions_missing_audio),
        attempts: Number(row.attempts),
        accuracy: Number(row.accuracy),
        players: Number(row.players),
      },
    ]),
  );
}

export interface HealthReport {
  lastMigration: { version: string; name: string } | null;
  migrationCount: number;
  questionsMissingImage: number;
  questionsMissingAudio: number;
  emptyActiveCategories: number;
  staleSessions: number;
  expiredOpenDuels: number;
  profilesWithoutProgress: number;
  publishedWithoutExplanation: number;
  openUserReports: number;
  openQuestionReports: number;
}

export async function getHealthReport(): Promise<HealthReport> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_health_check');
  if (error) throw rpcError(error, 'Systemzustand konnte nicht geladen werden');

  const raw = (data ?? {}) as Record<string, unknown>;
  const num = (key: string): number => Number(raw[key] ?? 0);
  const migration = raw.last_migration as { version?: string; name?: string } | null;

  return {
    lastMigration: migration?.version ? { version: migration.version, name: migration.name ?? '' } : null,
    migrationCount: num('migration_count'),
    questionsMissingImage: num('questions_missing_image'),
    questionsMissingAudio: num('questions_missing_audio'),
    emptyActiveCategories: num('empty_active_categories'),
    staleSessions: num('stale_sessions'),
    expiredOpenDuels: num('expired_open_duels'),
    profilesWithoutProgress: num('profiles_without_progress'),
    publishedWithoutExplanation: num('published_without_explanation'),
    openUserReports: num('open_user_reports'),
    openQuestionReports: num('open_question_reports'),
  };
}

export interface FeatureFlagRow {
  key: string;
  enabled: boolean;
  note: string;
  updatedAt: string;
  updatedByUsername: string | null;
}

/** Die gesetzten Überschreibungen. Fehlt ein Schlüssel, gilt der Code-Standard. */
export async function listFeatureFlagOverrides(): Promise<Map<string, FeatureFlagRow>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_list_feature_flags');
  if (error) throw rpcError(error, 'Schalter konnten nicht geladen werden');

  return new Map(
    (data ?? []).map((row) => [
      row.key,
      {
        key: row.key,
        enabled: row.enabled,
        note: row.note,
        updatedAt: row.updated_at,
        updatedByUsername: row.updated_by_username,
      },
    ]),
  );
}

export interface DailyOverviewRow {
  day: string;
  plannedCount: number;
  note: string;
  players: number;
  sessions: number;
  avgAccuracy: number;
  perfectRounds: number;
}

export async function getDailyOverview(back = 14, forward = 14): Promise<DailyOverviewRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_daily_overview', { p_back: back, p_forward: forward });
  if (error) throw rpcError(error, 'Tagesquiz konnte nicht geladen werden');

  return (data ?? []).map((row) => ({
    day: row.day,
    plannedCount: Number(row.planned_count),
    note: row.note,
    players: Number(row.players),
    sessions: Number(row.sessions),
    avgAccuracy: Number(row.avg_accuracy),
    perfectRounds: Number(row.perfect_rounds),
  }));
}

export interface DailyPlanEntry {
  position: number;
  questionId: string;
  questionText: string;
  categoryName: string;
  difficulty: string;
  status: string;
}

export async function getDailyPlan(day: string): Promise<DailyPlanEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_daily_plan', { p_day: day });
  if (error) throw rpcError(error, 'Plan konnte nicht geladen werden');

  return (data ?? []).map((row) => ({
    position: Number(row.sort_position),
    questionId: row.question_id,
    questionText: row.question_text,
    categoryName: row.category_name,
    difficulty: row.difficulty,
    status: row.status,
  }));
}
