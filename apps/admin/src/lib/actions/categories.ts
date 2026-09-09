'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { TablesInsert } from '@quizbyte/database';

import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface CategoryActionState {
  error: string | null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function saveCategoryAction(
  categoryId: string | null,
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const text = (key: string): string => String(formData.get(key) ?? '').trim();

  const name = text('name');
  if (!name) return { error: 'Name fehlt.' };
  const slug = slugify(text('slug') || name);
  if (!slug) return { error: 'Ungültiger Slug.' };
  const accent = text('accentColor');
  if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) return { error: 'Akzentfarbe muss ein Hex-Wert wie #3B82F6 sein.' };

  const row: TablesInsert<'categories'> = {
    name,
    slug,
    description: text('description') || null,
    icon: text('icon') || null,
    accent_color: accent || null,
    sort_order: Number(text('sortOrder') || '0') || 0,
    is_active: formData.get('isActive') === 'on',
    requires_pro: formData.get('requiresPro') === 'on',
  };

  const supabase = await createSupabaseServerClient();
  if (categoryId) {
    const { error } = await supabase.from('categories').update(row).eq('id', categoryId);
    if (error) return { error: `Speichern fehlgeschlagen: ${error.message}` };
  } else {
    const { error } = await supabase.from('categories').insert(row);
    if (error) return { error: `Speichern fehlgeschlagen: ${error.message}` };
  }

  revalidatePath('/categories');
  revalidatePath('/dashboard');
  redirect('/categories');
}
