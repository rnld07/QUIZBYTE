import type { Tables } from '@quizbyte/database';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type CategoryOverviewRow = Tables<'categories_overview'>;

export async function listCategories(): Promise<CategoryOverviewRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('categories_overview').select('*').order('sort_order').order('name');
  if (error) throw new Error(`Kategorien konnten nicht geladen werden: ${error.message}`);
  return data ?? [];
}

export async function getCategory(id: string): Promise<Tables<'categories'> | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Kategorie konnte nicht geladen werden: ${error.message}`);
  return data;
}
