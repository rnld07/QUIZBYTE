'use server';

import { revalidatePath } from 'next/cache';

import type { TablesInsert } from '@quizbyte/database';
import { validateImportRows } from '@quizbyte/shared';
import type { NormalizedImportQuestion } from '@quizbyte/shared';

import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ImportResult {
  inserted: number;
  failed: { index: number; message: string }[];
  error: string | null;
}

/**
 * Inserts validated rows as `review` questions. The rows are re-validated on the
 * server – the client preview is only a convenience.
 */
export async function importQuestionsAction(rows: unknown[]): Promise<ImportResult> {
  const admin = await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: categories, error: categoriesError } = await supabase.from('categories').select('id, slug, name');
  if (categoriesError) return { inserted: 0, failed: [], error: `Kategorien konnten nicht geladen werden: ${categoriesError.message}` };

  const byKey = new Map<string, string>();
  for (const category of categories ?? []) {
    byKey.set(category.slug.toLowerCase(), category.id);
    byKey.set(category.name.toLowerCase(), category.id);
  }

  const validated = validateImportRows(rows);
  const failed: ImportResult['failed'] = [];
  const inserts: TablesInsert<'questions'>[] = [];

  for (const result of validated) {
    if (!result.ok || !result.question) {
      failed.push({ index: result.index, message: result.issues.map((issue) => `${issue.field}: ${issue.message}`).join('; ') });
      continue;
    }
    const question: NormalizedImportQuestion = result.question;
    const categoryId = byKey.get(question.category.toLowerCase());
    if (!categoryId) {
      failed.push({ index: result.index, message: `Unbekannte Kategorie "${question.category}".` });
      continue;
    }
    inserts.push({
      category_id: categoryId,
      subcategory: question.subcategory,
      question_text: question.questionText,
      answer_a: question.answers.A,
      answer_b: question.answers.B,
      answer_c: question.answers.C,
      answer_d: question.answers.D,
      correct_answer: question.correctAnswer,
      explanation: question.explanation,
      difficulty: question.difficulty,
      tags: question.tags,
      image_url: question.imageUrl,
      audio_url: question.audioUrl,
      requires_pro: question.requiresPro,
      status: 'review',
      created_by: admin.userId,
    });
  }

  if (inserts.length === 0) return { inserted: 0, failed, error: failed.length > 0 ? 'Keine gültigen Zeilen zum Import.' : 'Keine Daten.' };

  const { error } = await supabase.from('questions').insert(inserts);
  if (error) return { inserted: 0, failed, error: `Import fehlgeschlagen: ${error.message}` };

  revalidatePath('/questions');
  revalidatePath('/dashboard');
  return { inserted: inserts.length, failed, error: null };
}
