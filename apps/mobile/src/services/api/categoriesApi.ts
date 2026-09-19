import { useFeatureStore } from '@/state/featureStore';
import type { Category } from '@quizbyte/shared';

import { toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

import { toCategory } from './mappers';

/** Active categories with their published question count, sorted for display. */
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories_overview')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw toAppError(error, 'Die Kategorien konnten gerade nicht geladen werden.');

  return (data ?? [])
    .map(toCategory)
    // Aus dem Store, nicht aus der Konstanten: ein Schalter, den der Server
    // umlegt, soll auch hier gelten – sonst laedt die App Kategorien, die es
    // laut Adminbereich gar nicht geben duerfte.
    .filter((category) => useFeatureStore.getState().flags.pro || !category.requiresPro);
}
