'use server';

import { revalidatePath } from 'next/cache';

import type { Enums } from '@quizbyte/database';

import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ModerationActionState {
  error: string | null;
  message: string | null;
}

export const EMPTY_MODERATION_STATE: ModerationActionState = { error: null, message: null };

/**
 * Every moderation action goes through the same shape.
 *
 * `requireAdmin()` guards the page, and the RPC behind it checks the role a
 * second time – the first check keeps the panel honest, the second one is what
 * actually holds, because an RPC can be called without the panel.
 *
 * Revalidiert werden alle Seiten, auf denen dieselbe Person auftauchen kann:
 * eine Sperre, die in der Moderation greift und in der Nutzerliste noch nicht,
 * sieht nach einem Fehler aus.
 */
async function run(
  task: (supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) => Promise<string>,
): Promise<ModerationActionState> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  try {
    const message = await task(supabase);
    revalidatePath('/moderation');
    revalidatePath('/users', 'layout');
    revalidatePath('/dashboard');
    return { error: null, message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Das hat nicht geklappt.', message: null };
  }
}

export async function suspendUserAction(_previous: ModerationActionState, formData: FormData): Promise<ModerationActionState> {
  const userId = String(formData.get('userId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  return run(async (supabase) => {
    const { error } = await supabase.rpc('admin_suspend_user', { p_user_id: userId, p_reason: reason });
    if (error) throw new Error(error.message);
    return 'Nutzer gesperrt.';
  });
}

export async function unsuspendUserAction(_previous: ModerationActionState, formData: FormData): Promise<ModerationActionState> {
  const userId = String(formData.get('userId') ?? '');

  return run(async (supabase) => {
    const { error } = await supabase.rpc('admin_unsuspend_user', { p_user_id: userId });
    if (error) throw new Error(error.message);
    return 'Sperre aufgehoben.';
  });
}

export async function resetUsernameAction(_previous: ModerationActionState, formData: FormData): Promise<ModerationActionState> {
  const userId = String(formData.get('userId') ?? '');

  return run(async (supabase) => {
    const { data, error } = await supabase.rpc('admin_reset_username', { p_user_id: userId });
    if (error) throw new Error(error.message);
    return `Neuer Name: ${data}`;
  });
}

const STATUS_LABELS: Record<Enums<'report_status'>, string> = {
  open: 'Wieder geöffnet.',
  in_review: 'In Prüfung.',
  reviewed: 'Als erledigt markiert.',
  rejected: 'Abgelehnt.',
};

/** Status und – wenn eine mitkommt – Notiz einer Nutzermeldung. */
export async function setReportStatusAction(_previous: ModerationActionState, formData: FormData): Promise<ModerationActionState> {
  const reportId = String(formData.get('reportId') ?? '');
  const status = String(formData.get('status') ?? 'reviewed') as Enums<'report_status'>;
  const note = String(formData.get('note') ?? '').trim();

  return run(async (supabase) => {
    const { error } = await supabase.rpc('admin_set_report_status', {
      p_report_id: reportId,
      p_status: status,
      p_note: note || null,
    });
    if (error) throw new Error(error.message);
    return STATUS_LABELS[status] ?? 'Gespeichert.';
  });
}

/** Dasselbe für eine Fragemeldung. */
export async function setQuestionReportStatusAction(
  _previous: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  const reportId = String(formData.get('reportId') ?? '');
  const status = String(formData.get('status') ?? 'reviewed') as Enums<'report_status'>;
  const note = String(formData.get('note') ?? '').trim();

  return run(async (supabase) => {
    const { error } = await supabase.rpc('admin_set_question_report_status', {
      p_report_id: reportId,
      p_status: status,
      p_note: note || null,
    });
    if (error) throw new Error(error.message);
    revalidatePath('/questions', 'layout');
    return STATUS_LABELS[status] ?? 'Gespeichert.';
  });
}

/**
 * Nur die Notiz, ohne den Status anzufassen.
 *
 * Eine Notiz ist oft der erste Schritt: jemand sieht sich die Sache an und
 * schreibt auf, was er gefunden hat, bevor er entscheidet. Würde das Speichern
 * die Meldung gleich schließen, schriebe niemand etwas auf.
 */
export async function saveReportNoteAction(_previous: ModerationActionState, formData: FormData): Promise<ModerationActionState> {
  const reportId = String(formData.get('reportId') ?? '');
  const kind = String(formData.get('kind') ?? 'user');
  const note = String(formData.get('note') ?? '').trim();
  const status = String(formData.get('currentStatus') ?? 'open') as Enums<'report_status'>;

  if (!note) return { error: 'Die Notiz ist leer.', message: null };

  return run(async (supabase) => {
    const rpc = kind === 'question' ? 'admin_set_question_report_status' : 'admin_set_report_status';
    const { error } = await supabase.rpc(rpc, { p_report_id: reportId, p_status: status, p_note: note });
    if (error) throw new Error(error.message);
    return 'Notiz gespeichert.';
  });
}
