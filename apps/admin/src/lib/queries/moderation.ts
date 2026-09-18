import type { Enums } from '@quizbyte/database';

import { rpcError } from '@/lib/queries/rpcError';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ReportStatus = Enums<'report_status'>;

export interface UserReportRow {
  id: string;
  reason: Enums<'user_report_reason'>;
  details: string;
  status: ReportStatus;
  adminNote: string;
  createdAt: string;
  reviewedAt: string | null;
  reporterId: string;
  reporterUsername: string;
  reportedId: string;
  reportedUsername: string;
  reportedSuspendedAt: string | null;
  reportedReportCount: number;
}

export interface QuestionReportRow {
  id: string;
  reason: Enums<'report_reason'>;
  details: string;
  status: ReportStatus;
  adminNote: string;
  createdAt: string;
  reviewedAt: string | null;
  reporterId: string;
  reporterUsername: string;
  questionId: string;
  questionText: string;
  questionStatus: Enums<'question_status'>;
  categoryName: string;
  questionReportCount: number;
}

/**
 * Gemeldete Nutzer.
 *
 * Über den RPC statt über ein `select`: die Liste braucht beide Benutzernamen
 * und die Zahl der Meldungen je Person, und das sind von hier aus drei
 * Abfragen je Zeile, auf dem Server ein Join.
 */
export async function listUserReports(status?: ReportStatus): Promise<UserReportRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_list_user_reports', { p_status: status ?? null });
  if (error) throw rpcError(error, 'Nutzermeldungen konnten nicht geladen werden');

  return (data ?? []).map((row) => ({
    id: row.id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reporterId: row.reporter_id,
    reporterUsername: row.reporter_username,
    reportedId: row.reported_id,
    reportedUsername: row.reported_username,
    reportedSuspendedAt: row.reported_suspended_at,
    reportedReportCount: Number(row.reported_report_count),
  }));
}

/** Gemeldete Fragen – dieselbe Ansicht, andere Tabelle dahinter. */
export async function listQuestionReports(status?: ReportStatus): Promise<QuestionReportRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_list_question_reports', { p_status: status ?? null });
  if (error) throw rpcError(error, 'Fragemeldungen konnten nicht geladen werden');

  return (data ?? []).map((row) => ({
    id: row.id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reporterId: row.reporter_id,
    reporterUsername: row.reporter_username,
    questionId: row.question_id,
    questionText: row.question_text,
    questionStatus: row.question_status,
    categoryName: row.category_name,
    questionReportCount: Number(row.question_report_count),
  }));
}

export interface AdminActionRow {
  id: string;
  kind: Enums<'admin_action_kind'>;
  details: string;
  createdAt: string;
  adminUsername: string | null;
  targetUserId: string | null;
  targetUsername: string | null;
}

/** Das Adminprotokoll, neueste zuerst. */
export async function listAdminActions(limit = 30): Promise<AdminActionRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_list_actions', { p_limit: limit });
  if (error) throw rpcError(error, 'Protokoll konnte nicht geladen werden');

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    details: row.details,
    createdAt: row.created_at,
    adminUsername: row.admin_username,
    targetUserId: row.target_user_id,
    targetUsername: row.target_username,
  }));
}

/**
 * Die Meldungen über eine bestimmte Person.
 *
 * Für die Nutzerdetailseite: dort steht die Frage "warum ist der aufgefallen",
 * und die beantwortet die Liste seiner eigenen Meldungen, nicht die aller.
 */
export async function listReportsAbout(userId: string): Promise<UserReportRow[]> {
  const all = await listUserReports();
  return all.filter((report) => report.reportedId === userId);
}
