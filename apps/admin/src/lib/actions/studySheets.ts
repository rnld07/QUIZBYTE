'use server';

import { revalidatePath } from 'next/cache';

import { STORAGE_BUCKETS } from '@quizbyte/database';

import { requireAdmin } from '@/lib/auth';
import { getPublicSupabaseEnv } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface StudySheetActionState {
  error: string | null;
  ok: boolean;
}

/** More pages than anyone will scroll through on a phone. */
const MAX_PAGES = 60;

/**
 * Records a study sheet whose files are already in storage.
 *
 * The files themselves never pass through here: a Server Action body is capped
 * at 1 MB, and a sheet is a PDF plus one image per page. `StudySheetForm`
 * uploads them from the browser – with the admin's own session, under the same
 * storage policies – and this only writes the row.
 */
export async function createStudySheetAction(
  _previous: StudySheetActionState,
  formData: FormData,
): Promise<StudySheetActionState> {
  await requireAdmin();

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const categoryId = String(formData.get('categoryId') ?? '').trim();
  const folderId = String(formData.get('folderId') ?? '').trim();
  const sortOrder = Number(formData.get('sortOrder') ?? 0);
  const pdfUrl = String(formData.get('pdfUrl') ?? '').trim();
  const pageUrls = formData.getAll('pageUrls').map((entry) => String(entry));

  if (title.length < 3) return { error: 'Der Titel braucht mindestens 3 Zeichen.', ok: false };
  if (!isOwnStorageUrl(pdfUrl)) return { error: 'Das PDF wurde nicht hochgeladen. Bitte erneut versuchen.', ok: false };
  if (pageUrls.length === 0) return { error: 'Die Seitenvorschau fehlt. Bitte das PDF erneut auswählen.', ok: false };
  if (pageUrls.length > MAX_PAGES) return { error: `Mehr als ${MAX_PAGES} Seiten werden nicht unterstützt.`, ok: false };
  // Nothing from the browser is taken on trust, not even from an admin: a URL
  // pointing anywhere else would be served to every reader of the app.
  if (!pageUrls.every(isOwnStorageUrl)) return { error: 'Eine Seite liegt nicht im richtigen Speicher.', ok: false };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('study_sheets').insert({
    title,
    description: description || null,
    category_id: categoryId || null,
    folder_id: folderId || null,
    pdf_url: pdfUrl,
    page_urls: pageUrls,
    page_count: pageUrls.length,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  });
  if (error) return { error: `Speichern fehlgeschlagen: ${error.message}`, ok: false };

  revalidatePath('/study-sheets');
  return { error: null, ok: true };
}

/** True when the URL is a public file in our own study-sheets bucket. */
function isOwnStorageUrl(url: string): boolean {
  const { url: base } = getPublicSupabaseEnv();
  return url.startsWith(`${base}/storage/v1/object/public/${STORAGE_BUCKETS.studySheets}/`);
}

/** Takes a sheet out of the app without deleting it. */
export async function toggleStudySheetAction(id: string, published: boolean): Promise<void> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('study_sheets').update({ is_published: published }).eq('id', id);
  if (error) throw new Error(`Ändern fehlgeschlagen: ${error.message}`);
  revalidatePath('/study-sheets');
}

/**
 * Deletes a sheet and its files.
 *
 * The row goes first: a leftover file costs storage, a row pointing at files
 * that are gone shows the user an empty sheet.
 */
export async function deleteStudySheetAction(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase.from('study_sheets').select('pdf_url, page_urls').eq('id', id).maybeSingle();
  const { error } = await supabase.from('study_sheets').delete().eq('id', id);
  if (error) throw new Error(`Löschen fehlgeschlagen: ${error.message}`);

  const paths = [data?.pdf_url ?? '', ...(data?.page_urls ?? [])]
    .map((url) => storagePathFromUrl(url))
    .filter((path): path is string => path !== null);
  if (paths.length > 0) await supabase.storage.from(STORAGE_BUCKETS.studySheets).remove(paths);

  revalidatePath('/study-sheets');
}

/**
 * Creates a folder – a title and a place in the order, nothing else.
 *
 * No files pass through here, so unlike the sheet itself this is an ordinary
 * form post.
 */
export async function createStudyFolderAction(
  _previous: StudySheetActionState,
  formData: FormData,
): Promise<StudySheetActionState> {
  await requireAdmin();

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const sortOrder = Number(formData.get('sortOrder') ?? 0);

  if (title.length < 3) return { error: 'Der Titel braucht mindestens 3 Zeichen.', ok: false };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('study_sheet_folders').insert({
    title,
    description: description || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  });
  if (error) return { error: `Speichern fehlgeschlagen: ${error.message}`, ok: false };

  revalidatePath('/study-sheets');
  return { error: null, ok: true };
}

/** Takes a folder out of the app. Its sheets then stand on their own again. */
export async function toggleStudyFolderAction(id: string, published: boolean): Promise<void> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('study_sheet_folders').update({ is_published: published }).eq('id', id);
  if (error) throw new Error(`Ändern fehlgeschlagen: ${error.message}`);
  revalidatePath('/study-sheets');
}

/**
 * Deletes a folder. The sheets in it stay – they go back to standing on their
 * own in the list (`on delete set null` on the column).
 */
export async function deleteStudyFolderAction(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('study_sheet_folders').delete().eq('id', id);
  if (error) throw new Error(`Löschen fehlgeschlagen: ${error.message}`);
  revalidatePath('/study-sheets');
}

/** Moves a sheet into a folder, or out of every folder when `folderId` is null. */
export async function moveStudySheetAction(id: string, folderId: string | null): Promise<void> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('study_sheets').update({ folder_id: folderId }).eq('id', id);
  if (error) throw new Error(`Verschieben fehlgeschlagen: ${error.message}`);
  revalidatePath('/study-sheets');
}

/** Extracts the object path from a public storage URL, or null if it is not ours. */
function storagePathFromUrl(url: string): string | null {
  const marker = `/${STORAGE_BUCKETS.studySheets}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const path = url.slice(index + marker.length).split('?')[0];
  return path || null;
}
