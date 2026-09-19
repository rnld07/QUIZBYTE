import { STORAGE_BUCKETS } from '@quizbyte/database';

/**
 * Was eine Frage an Dateien haben darf – ohne Netz und ohne Server.
 *
 * Eigene Datei, weil beide Seiten das brauchen: der Browser prueft, bevor er
 * hochlaedt, und die Server-Action prueft die URL, die dabei herauskam.
 */

export type MediaKind = 'image' | 'audio';

export const MEDIA_LIMITS: Record<
  MediaKind,
  { bucket: string; maxBytes: number; column: 'image_url' | 'audio_url'; accept: string[] }
> = {
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

export function extensionFor(file: File): string {
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
