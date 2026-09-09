'use server';

import { revalidatePath } from 'next/cache';

import { STORAGE_BUCKETS } from '@quizbyte/database';
import type { TablesUpdate } from '@quizbyte/database';

import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface MediaActionState {
  error: string | null;
  url: string | null;
}

type MediaKind = 'image' | 'audio';

const LIMITS: Record<MediaKind, { bucket: string; maxBytes: number; column: 'image_url' | 'audio_url'; accept: string[] }> = {
  image: { bucket: STORAGE_BUCKETS.questionImages, maxBytes: 5 * 1024 * 1024, column: 'image_url', accept: ['image/png', 'image/jpeg', 'image/webp'] },
  audio: { bucket: STORAGE_BUCKETS.questionAudio, maxBytes: 10 * 1024 * 1024, column: 'audio_url', accept: ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav'] },
};

function extensionFor(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return file.type.split('/').pop() ?? 'bin';
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

  const limit = LIMITS[kind];
  if (file.size > limit.maxBytes) return { error: 'Die Datei ist zu groß.', url: null };
  if (!limit.accept.includes(file.type)) return { error: `Dateityp ${file.type || 'unbekannt'} wird nicht unterstützt.`, url: null };

  const supabase = await createSupabaseServerClient();
  const path = `${questionId}/${Date.now()}.${extensionFor(file)}`;
  const { error: uploadError } = await supabase.storage
    .from(limit.bucket)
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
  if (uploadError) return { error: `Upload fehlgeschlagen: ${uploadError.message}`, url: null };

  const { data } = supabase.storage.from(limit.bucket).getPublicUrl(path);
  const patch: TablesUpdate<'questions'> = kind === 'image' ? { image_url: data.publicUrl } : { audio_url: data.publicUrl };
  const { error } = await supabase.from('questions').update(patch).eq('id', questionId);
  if (error) return { error: `Speichern fehlgeschlagen: ${error.message}`, url: null };

  revalidatePath(`/questions/${questionId}`);
  revalidatePath('/questions');
  return { error: null, url: data.publicUrl };
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
