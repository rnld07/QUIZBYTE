'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { Enums, TablesInsert } from '@quizbyte/database';
import { parseTagList, questionInputSchema, validateQuestionForPublish } from '@quizbyte/shared';
import type { QuestionValidationIssue } from '@quizbyte/shared';

import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type QuestionIntent = 'save' | 'draft' | 'review' | 'publish' | 'archive';

export interface QuestionActionState {
  error: string | null;
  issues: QuestionValidationIssue[];
  savedAt: string | null;
}

const INTENT_STATUS: Record<Exclude<QuestionIntent, 'save'>, Enums<'question_status'>> = {
  draft: 'draft',
  review: 'review',
  publish: 'published',
  archive: 'archived',
};

function readForm(formData: FormData) {
  const text = (key: string): string => String(formData.get(key) ?? '');
  return {
    categoryId: text('categoryId'),
    subcategory: text('subcategory'),
    questionText: text('questionText'),
    answerA: text('answerA'),
    answerB: text('answerB'),
    answerC: text('answerC'),
    answerD: text('answerD'),
    correctAnswer: text('correctAnswer'),
    explanation: text('explanation'),
    difficulty: text('difficulty'),
    tags: parseTagList(text('tags')),
    imageUrl: text('imageUrl'),
    audioUrl: text('audioUrl'),
    requiresPro: formData.get('requiresPro') === 'on',
    currentStatus: text('currentStatus') as Enums<'question_status'>,
  };
}

/**
 * Creates or updates a question. `intent` decides the status transition; publishing
 * runs the full validation (the database enforces the same rules as a safety net).
 */
export async function saveQuestionAction(
  questionId: string | null,
  _previous: QuestionActionState,
  formData: FormData,
): Promise<QuestionActionState> {
  const admin = await requireAdmin();
  const intent = (String(formData.get('intent') ?? 'save') as QuestionIntent) || 'save';
  const form = readForm(formData);
  const nextStatus: Enums<'question_status'> = intent === 'save' ? form.currentStatus || 'draft' : INTENT_STATUS[intent];

  if (nextStatus === 'published') {
    const issues = validateQuestionForPublish({ ...form, status: 'published' });
    if (issues.length > 0) {
      return { error: 'Die Frage kann so nicht veröffentlicht werden.', issues, savedAt: null };
    }
  }

  // Drafts may be incomplete – parse leniently but keep types safe.
  const parsed = questionInputSchema.partial().safeParse({ ...form, status: nextStatus });
  if (!parsed.success) {
    return {
      error: 'Ungültige Eingabe.',
      issues: parsed.error.issues.map((issue) => ({ field: issue.path.map(String).join('.'), message: issue.message })),
      savedAt: null,
    };
  }
  if (!form.categoryId) {
    return { error: 'Bitte eine Kategorie wählen.', issues: [{ field: 'categoryId', message: 'Kategorie fehlt.' }], savedAt: null };
  }

  const row: TablesInsert<'questions'> = {
    category_id: form.categoryId,
    subcategory: form.subcategory.trim() || null,
    question_text: form.questionText.trim(),
    answer_a: form.answerA.trim(),
    answer_b: form.answerB.trim(),
    answer_c: form.answerC.trim(),
    answer_d: form.answerD.trim(),
    correct_answer: (['A', 'B', 'C', 'D'].includes(form.correctAnswer) ? form.correctAnswer : 'A') as Enums<'answer_key'>,
    explanation: form.explanation.trim(),
    difficulty: (['easy', 'medium', 'hard'].includes(form.difficulty) ? form.difficulty : 'medium') as Enums<'difficulty_level'>,
    tags: form.tags,
    image_url: form.imageUrl.trim() || null,
    audio_url: form.audioUrl.trim() || null,
    status: nextStatus,
    requires_pro: form.requiresPro,
  };

  const supabase = await createSupabaseServerClient();
  let id = questionId;
  if (id) {
    const { error } = await supabase.from('questions').update(row).eq('id', id);
    if (error) return { error: `Speichern fehlgeschlagen: ${error.message}`, issues: [], savedAt: null };
  } else {
    const { data, error } = await supabase
      .from('questions')
      .insert({ ...row, created_by: admin.userId })
      .select('id')
      .single();
    if (error) return { error: `Speichern fehlgeschlagen: ${error.message}`, issues: [], savedAt: null };
    id = data.id;
  }

  revalidatePath('/questions');
  revalidatePath('/dashboard');
  if (!questionId) redirect(`/questions/${id}`);
  revalidatePath(`/questions/${id}`);
  return { error: null, issues: [], savedAt: new Date().toISOString() };
}

/** Quick status change from the list (e.g. archive). */
export async function setQuestionStatusAction(questionId: string, status: Enums<'question_status'>): Promise<void> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('questions').update({ status }).eq('id', questionId);
  if (error) throw new Error(`Status konnte nicht geändert werden: ${error.message}`);
  revalidatePath('/questions');
  revalidatePath(`/questions/${questionId}`);
  revalidatePath('/dashboard');
}
