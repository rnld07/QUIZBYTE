import { toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

export interface StudySheet {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  /** The folder it sits in, or null when it stands on its own. */
  folderId: string | null;
  /** The original file, offered for download. */
  pdfUrl: string;
  /** One image per page, in order; the first one is the preview. */
  pageUrls: string[];
  pageCount: number;
}

/** A folder holding several sheets that belong together. */
export interface StudyFolder {
  id: string;
  title: string;
  description: string | null;
}

/** Published sheets, in the order the admin put them in. */
export async function fetchStudySheets(): Promise<StudySheet[]> {
  const { data, error } = await supabase
    .from('study_sheets')
    .select('id, title, description, category_id, folder_id, pdf_url, page_urls, page_count')
    .eq('is_published', true)
    .order('sort_order')
    .order('created_at', { ascending: false });
  if (error) throw toAppError(error, 'Die Lernzettel konnten nicht geladen werden.');

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    folderId: row.folder_id,
    pdfUrl: row.pdf_url,
    pageUrls: row.page_urls ?? [],
    pageCount: row.page_count,
  }));
}

/** Published folders. Order does not matter here – the sheets decide it. */
export async function fetchStudyFolders(): Promise<StudyFolder[]> {
  const { data, error } = await supabase
    .from('study_sheet_folders')
    .select('id, title, description')
    .eq('is_published', true)
    .order('sort_order');
  if (error) throw toAppError(error, 'Die Lernzettel konnten nicht geladen werden.');

  return (data ?? []).map((row) => ({ id: row.id, title: row.title, description: row.description }));
}
