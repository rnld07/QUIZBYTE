'use server';

import { revalidatePath } from 'next/cache';

import type { TablesUpdate } from '@quizbyte/database';

import { requireAdmin } from '@/lib/auth';
import { storeQuestionMedia } from '@/lib/media/questionMedia';
import type { MediaKind } from '@/lib/media/questionMedia';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface MediaActionState {
  error: string | null;
  url: string | null;
}

/** Uploads an image or audio file for a question and stores the public URL. */
export async function uploadQuestionMediaAction(
  questionId: string,
  kind: MediaKind,
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  await requireAdmin();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Bitte eine Datei auswählen.', url: null };

  const result = await storeQuestionMedia(questionId, kind, file);
  if (result.error) return { error: result.error, url: null };

  revalidatePath(`/questions/${questionId}`);
  revalidatePath('/questions');
  return { error: null, url: result.url };
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
