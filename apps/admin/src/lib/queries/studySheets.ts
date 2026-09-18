import type { Tables } from '@quizbyte/database';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type StudySheetRow = Tables<'study_sheets'>;
export type StudyFolderRow = Tables<'study_sheet_folders'>;

/** Every sheet, published or not – the admin list shows both. */
export async function listStudySheets(): Promise<StudySheetRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('study_sheets')
    .select('*')
    .order('sort_order')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Lernzettel konnten nicht geladen werden: ${error.message}`);
  return data ?? [];
}

/** Every folder, published or not – the admin list shows both. */
export async function listStudyFolders(): Promise<StudyFolderRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('study_sheet_folders')
    .select('*')
    .order('sort_order')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Ordner konnten nicht geladen werden: ${error.message}`);
  return data ?? [];
}
