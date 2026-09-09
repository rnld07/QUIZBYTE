import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface DashboardStats {
  questionsTotal: number;
  questionsPublished: number;
  questionsDraft: number;
  questionsReview: number;
  questionsArchived: number;
  questionsMissingAudio: number;
  questionsMissingImage: number;
  categoriesTotal: number;
  categoriesActive: number;
  usersTotal: number;
  attemptsTotal: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
  if (error) throw new Error(`Statistiken konnten nicht geladen werden: ${error.message}`);
  const stats = (data ?? {}) as Record<string, number>;
  const num = (key: string): number => Number(stats[key] ?? 0);
  return {
    questionsTotal: num('questions_total'),
    questionsPublished: num('questions_published'),
    questionsDraft: num('questions_draft'),
    questionsReview: num('questions_review'),
    questionsArchived: num('questions_archived'),
    questionsMissingAudio: num('questions_missing_audio'),
    questionsMissingImage: num('questions_missing_image'),
    categoriesTotal: num('categories_total'),
    categoriesActive: num('categories_active'),
    usersTotal: num('users_total'),
    attemptsTotal: num('attempts_total'),
  };
}
