import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import { extensionFor, MEDIA_LIMITS, validateMediaFile } from './mediaLimits';
import type { MediaKind } from './mediaLimits';

export { MEDIA_LIMITS, validateMediaFile };
export type { MediaKind };

/**
 * Laedt eine Datei aus dem Browser in ihren Bucket.
 *
 * Vorher ging sie durch eine Server-Action, und die haben in Next.js ein
 * Standardlimit von einem Megabyte fuer den Rumpf – ein Bild darf aber fuenf
 * haben, Audio zehn. Die Grenze schlug also zu, *bevor* `validateMediaFile` je
 * lief, und die Fehlermeldung sprach von etwas anderem als dem, was passiert
 * war.
 *
 * Das Limit hochzusetzen waere die kleinere Antwort gewesen: die Datei liefe
 * weiterhin durch den Server, nur langsamer und mit mehr Speicherbedarf. Den
 * Weg gibt es schon woanders – die Lernzettel laden seit jeher direkt in den
 * Bucket (StudySheetForm), mit der Sitzung des Admins und den Regeln aus
 * `20260909000700_storage.sql`.
 *
 * Der Ordner braucht keine Frage-Id: eine neue Frage hat noch keine, und ein
 * Upload, der auf das Speichern warten muss, war genau der Grund, warum ein
 * fehlgeschlagener Upload bisher eine halbfertige Frage hinterliess.
 */
export async function uploadQuestionMedia(
  kind: MediaKind,
  file: File,
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const invalid = validateMediaFile(kind, file);
  if (invalid) return { url: null, error: invalid };

  const limit = MEDIA_LIMITS[kind];
  const supabase = createSupabaseBrowserClient();
  const path = `${Date.now()}-${crypto.randomUUID()}.${extensionFor(file)}`;

  const { error } = await supabase.storage
    .from(limit.bucket)
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' });
  if (error) return { url: null, error: `Upload fehlgeschlagen: ${error.message}` };

  return { url: supabase.storage.from(limit.bucket).getPublicUrl(path).data.publicUrl, error: null };
}
