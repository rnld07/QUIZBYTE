'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface SimpleActionState {
  error: string | null;
  message: string | null;
}

export const EMPTY_ACTION_STATE: SimpleActionState = { error: null, message: null };

/**
 * Derselbe Rahmen wie bei der Moderation: Rolle prüfen, ausführen, den Fehler
 * dort melden, wo der Knopf steht. Die RPCs prüfen die Rolle noch einmal
 * selbst – das hier ist die Bequemlichkeit, nicht die Sicherung.
 */
async function run(
  paths: string[],
  task: (supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) => Promise<string>,
): Promise<SimpleActionState> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  try {
    const message = await task(supabase);
    for (const path of paths) revalidatePath(path);
    return { error: null, message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Das hat nicht geklappt.', message: null };
  }
}

/** Verschiebt eine Kategorie um einen Platz nach oben oder unten. */
export async function moveCategoryAction(_previous: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const id = String(formData.get('categoryId') ?? '');
  const direction = String(formData.get('direction') ?? 'up');

  return run(['/categories'], async (supabase) => {
    const { error } = await supabase.rpc('admin_move_category', { p_category_id: id, p_direction: direction });
    if (error) throw new Error(error.message);
    return 'Reihenfolge geändert.';
  });
}

/**
 * Legt einen Feature-Schalter um.
 *
 * `value = 'default'` löscht die Überschreibung – dann gilt wieder, was in
 * `features.ts` steht. Ohne diesen Weg wäre eine einmal gesetzte Zeile für
 * immer die Wahrheit, auch wenn der Code längst etwas anderes sagt.
 */
export async function setFeatureFlagAction(_previous: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const key = String(formData.get('key') ?? '');
  const value = String(formData.get('value') ?? '');
  const note = String(formData.get('note') ?? '').trim();

  return run(['/flags', '/system'], async (supabase) => {
    const enabled = value === 'default' ? null : value === 'on';
    const { error } = await supabase.rpc('admin_set_feature_flag', {
      p_key: key,
      p_enabled: enabled,
      p_note: note || null,
    });
    if (error) throw new Error(error.message);
    if (enabled === null) return `${key}: zurück auf den Code-Standard.`;
    return `${key}: ${enabled ? 'an' : 'aus'}.`;
  });
}

/**
 * Belegt einen Tag des Tagesquiz von Hand – oder gibt ihn wieder frei.
 *
 * Die Fragen kommen als Zeilen aus einem Textfeld: eine Id je Zeile. Das ist
 * roh, aber ehrlich – die Alternative wäre ein Auswahldialog über alle Fragen,
 * und die Fragenliste hat dafür schon eine Suche.
 */
export async function setDailyPlanAction(_previous: SimpleActionState, formData: FormData): Promise<SimpleActionState> {
  const day = String(formData.get('day') ?? '');
  const raw = String(formData.get('questionIds') ?? '');

  const ids = raw
    .split(/[\s,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const invalid = ids.filter((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  if (invalid.length > 0) {
    return { error: `Keine gültige Frage-Id: ${invalid[0]}`, message: null };
  }
  if (ids.length > 50) {
    return { error: 'Höchstens 50 Fragen pro Tag.', message: null };
  }

  return run(['/daily'], async (supabase) => {
    const { error } = await supabase.rpc('admin_set_daily_plan', {
      p_day: day,
      p_question_ids: ids.length > 0 ? ids : null,
      p_note: String(formData.get('note') ?? '').trim() || null,
    });
    if (error) throw new Error(error.message);
    return ids.length === 0 ? `${day}: wieder automatisch.` : `${day}: ${ids.length} Fragen geplant.`;
  });
}
