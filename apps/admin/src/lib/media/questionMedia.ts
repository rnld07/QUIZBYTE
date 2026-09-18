import { STORAGE_BUCKETS } from '@quizbyte/database';
import type { TablesUpdate } from '@quizbyte/database';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type MediaKind = 'image' | 'audio';

export const MEDIA_LIMITS: Record<MediaKind, { bucket: string; maxBytes: number; column: 'image_url' | 'audio_url'; accept: string[] }> = {
  image: {
    bucket: STORAGE_BUCKETS.questionImages,
    maxBytes: 5 * 1024 * 1024,
    column: 'image_url',
    accept: ['image/png', 'image/jpeg', 'image/webp'],
  },
  audio: {
    bucket: STORAGE_BUCKETS.questionAudio,
    maxBytes: 10 * 1024 * 1024,
    column: 'audio_url',
    accept: ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav'],
  },
};

function extensionFor(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  return file.type.split('/').pop() ?? 'bin';
}

/**
 * Checks a file without touching the network.
 *
 * Kept separate so a new question can be rejected *before* it is created –
 * otherwise a file that is too large would leave a saved question behind.
 */
export function validateMediaFile(kind: MediaKind, file: File): string | null {
  const limit = MEDIA_LIMITS[kind];
  if (file.size > limit.maxBytes) return 'Die Datei ist zu groß.';
  if (!limit.accept.includes(file.type)) return `Dateityp ${file.type || 'unbekannt'} wird nicht unterstützt.`;
  return null;
}

/** Puts the file in its bucket and writes the public URL onto the question. */
export async function storeQuestionMedia(
  questionId: string,
  kind: MediaKind,
  file: File,
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const invalid = validateMediaFile(kind, file);
  if (invalid) return { url: null, error: invalid };

  const limit = MEDIA_LIMITS[kind];
  const supabase = await createSupabaseServerClient();
  const path = `${questionId}/${Date.now()}.${extensionFor(file)}`;
  const { error: uploadError } = await supabase.storage
    .from(limit.bucket)
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
  if (uploadError) return { url: null, error: `Upload fehlgeschlagen: ${uploadError.message}` };

  const { data } = supabase.storage.from(limit.bucket).getPublicUrl(path);
  const patch: TablesUpdate<'questions'> = kind === 'image' ? { image_url: data.publicUrl } : { audio_url: data.publicUrl };
  const { error } = await supabase.from('questions').update(patch).eq('id', questionId);
  if (error) return { url: null, error: `Speichern fehlgeschlagen: ${error.message}` };

  return { url: data.publicUrl, error: null };
}
