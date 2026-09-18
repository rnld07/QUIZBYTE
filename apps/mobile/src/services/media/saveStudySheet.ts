import { File, Paths } from 'expo-file-system';
// The class API, not the legacy helpers: everything under the old names is a
// deprecation stub in SDK 57 that type-checks and then throws when called.
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';

import { logger } from '@/services/errors';

export type SaveOutcome =
  | { status: 'done'; message: string }
  | { status: 'denied'; message: string }
  | { status: 'failed'; message: string };

/** Keeps a file name from breaking a path. */
function safeName(title: string, fallback: string): string {
  const cleaned = title
    .normalize('NFD')
    // Strips the accents NFD just split off, so "Prüfung" becomes "Prufung"
    // instead of losing the letter entirely in the next step.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return cleaned.length > 0 ? cleaned.slice(0, 60) : fallback;
}

/**
 * Downloads the PDF and hands it to the system share sheet, which is where
 * "save to Files" lives on both platforms.
 *
 * There is no way to write straight into the user's documents from an Expo app –
 * the share sheet is the supported route, and it also covers sending the sheet
 * to someone else.
 */
export async function saveStudySheetPdf(title: string, pdfUrl: string): Promise<SaveOutcome> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return { status: 'failed', message: 'Dieses Gerät kann Dateien nicht weitergeben.' };
    }

    const target = new File(Paths.cache, `${safeName(title, 'lernzettel')}.pdf`);
    if (target.exists) target.delete();
    const downloaded = await File.downloadFileAsync(pdfUrl, target);

    await Sharing.shareAsync(downloaded.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: title,
    });
    // Nothing to report: the system share sheet already stood in front of the
    // person and asked what to do with the file. A line underneath saying it
    // went well is a second answer to a question nobody asked twice.
    return { status: 'done', message: '' };
  } catch (error) {
    logger.error('saving study sheet pdf failed', error);
    const reason = error instanceof Error ? error.message : String(error);
    return { status: 'failed', message: `Das PDF konnte nicht geladen werden. (${reason})` };
  }
}

/**
 * Saves every page into the photo library.
 *
 * Pages go in one at a time and in order: the library sorts by the moment a file
 * arrives, so downloading them in parallel would shuffle the pages.
 */
export async function saveStudySheetImages(title: string, pageUrls: readonly string[]): Promise<SaveOutcome> {
  if (pageUrls.length === 0) return { status: 'failed', message: 'Dieser Lernzettel hat keine Seiten.' };

  // Write-only: the app adds pages, it never reads what else is in there.
  const permission = await requestPermissionsAsync(true, ['photo']);
  if (!permission.granted) {
    return {
      status: 'denied',
      message: 'QuizByte darf gerade nicht in deine Galerie speichern. Du kannst das in den Systemeinstellungen erlauben.',
    };
  }

  const name = safeName(title, 'lernzettel');
  const written: File[] = [];

  try {
    for (const [index, url] of pageUrls.entries()) {
      const target = new File(Paths.cache, `${name}-${String(index + 1).padStart(3, '0')}.png`);
      if (target.exists) target.delete();
      const downloaded = await File.downloadFileAsync(url, target);
      written.push(downloaded);
      await Asset.create(downloaded.uri);
    }

    return {
      status: 'done',
      message: pageUrls.length === 1 ? 'Seite in deiner Galerie gespeichert.' : `${pageUrls.length} Seiten in deiner Galerie gespeichert.`,
    };
  } catch (error) {
    logger.error('saving study sheet images failed', error);
    // The real reason comes along: "es geht nicht" is not something either of
    // us can act on, and the causes here are all device-specific.
    const reason = error instanceof Error ? error.message : String(error);
    return { status: 'failed', message: `Die Seiten konnten nicht gespeichert werden. (${reason})` };
  } finally {
    // The copies in the cache have served their purpose once the library has them.
    for (const file of written) {
      try {
        file.delete();
      } catch {
        // A leftover cache file is harmless; the system clears it eventually.
      }
    }
  }
}
