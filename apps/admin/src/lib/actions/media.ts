'use server';

import { revalidatePath } from 'next/cache';

import type { TablesUpdate } from '@quizbyte/database';

import { requireAdmin } from '@/lib/auth';
import { MEDIA_LIMITS } from '@/lib/media/mediaLimits';
import type { MediaKind } from '@/lib/media/mediaLimits';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface MediaActionState {
  error: string | null;
  url: string | null;
}

/**
 * Schreibt die URL einer hochgeladenen Datei an die Frage.
 *
 * Die Datei selbst geht nicht mehr hier durch: sie liegt schon im Bucket, vom
 * Browser aus hochgeladen. Eine Server-Action hat in Next.js ein Rumpflimit von
 * einem Megabyte, und daran scheiterte jedes Bild ueber dieser Groesse – mit
 * einer Fehlermeldung, die von etwas anderem sprach.
 *
 * Geprueft wird trotzdem: die URL muss in den Bucket zeigen, der zu dieser Art
 * gehoert. Sonst waere das hier eine Stelle, an der sich eine beliebige Adresse
 * an eine Frage haengen laesst.
 */
export async function setQuestionMediaUrlAction(
  questionId: string,
  kind: MediaKind,
  url: string,
): Promise<MediaActionState> {
  await requireAdmin();

  if (!url.includes(`/${MEDIA_LIMITS[kind].bucket}/`)) {
    return { error: 'Diese Adresse gehört nicht zu QuizByte.', url: null };
  }

  const supabase = await createSupabaseServerClient();
  const patch: TablesUpdate<'questions'> = kind === 'image' ? { image_url: url } : { audio_url: url };
  const { error } = await supabase.from('questions').update(patch).eq('id', questionId);
  if (error) return { error: `Speichern fehlgeschlagen: ${error.message}`, url: null };

  revalidatePath(`/questions/${questionId}`);
  revalidatePath('/questions');
  return { error: null, url };
}
/** Removes the URL from the question (the file stays in storage for now). */
export async function removeQuestionMediaAction(questionId: string, kind: MediaKind): Promise<void> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const patch: TablesUpdate<'questions'> = kind === 'image' ? { image_url: null } : { audio_url: null };
  const { error } = await supabase.from('questions').update(patch).eq('id', questionId);
  if (error) throw new Error(`Entfernen fehlgeschlagen: ${error.message}`);
  revalidatePath(`/questions/${questionId}`);
  revalidatePath('/questions');
}
