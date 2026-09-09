import { z } from 'zod';

import { ANSWER_KEYS, DIFFICULTIES, QUESTION_STATUSES } from '../types/domain';
import type { AnswerKey, Difficulty } from '../types/domain';

const nonEmpty = (label: string) => z.string().trim().min(1, `${label} darf nicht leer sein.`);

/**
 * Editable fields of a question. Used by the admin form and for publish validation.
 * Strings are trimmed; empty optional fields become null.
 */
export const questionInputSchema = z.object({
  categoryId: z.string().uuid('Kategorie fehlt.'),
  subcategory: z
    .string()
    .trim()
    .max(80)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable(),
  questionText: nonEmpty('Frage').max(1000),
  answerA: nonEmpty('Antwort A').max(300),
  answerB: nonEmpty('Antwort B').max(300),
  answerC: nonEmpty('Antwort C').max(300),
  answerD: nonEmpty('Antwort D').max(300),
  correctAnswer: z.enum(ANSWER_KEYS, { message: 'Richtige Antwort muss A, B, C oder D sein.' }),
  explanation: nonEmpty('Erklärung').max(2000),
  difficulty: z.enum(DIFFICULTIES, { message: 'Schwierigkeit fehlt.' }),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  imageUrl: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .default(null),
  audioUrl: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .default(null),
  status: z.enum(QUESTION_STATUSES).default('draft'),
  requiresPro: z.boolean().default(false),
});

export type QuestionInput = z.infer<typeof questionInputSchema>;

export interface QuestionValidationIssue {
  field: string;
  message: string;
}

/**
 * Validates a question before it may be published. Returns a flat list of issues
 * (empty when the question is publishable).
 */
export function validateQuestionForPublish(input: unknown): QuestionValidationIssue[] {
  const result = questionInputSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    field: issue.path.map(String).join('.') || 'form',
    message: issue.message,
  }));
}

/** Normalises tags: trims, lower-cases, removes empties and duplicates. */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (tag.length === 0 || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }
  return result;
}

/** Parses "a,b, c" into a normalised tag list. */
export function parseTagList(value: string): string[] {
  return normalizeTags(value.split(/[,;\n]/));
}

const correctAnswerSchema = z.union([
  z.number().int().min(0).max(3),
  z.enum(ANSWER_KEYS),
  z
    .string()
    .trim()
    .regex(/^[0-3]$/)
    .transform((value) => Number(value)),
  z
    .string()
    .trim()
    .regex(/^[a-dA-D]$/)
    .transform((value) => value.toUpperCase() as AnswerKey),
]);

/**
 * Schema for one row of a bulk import (JSON or CSV). `category` may be a slug or
 * a display name – the importer resolves it against the database.
 */
export const importQuestionSchema = z.object({
  category: nonEmpty('Kategorie'),
  subcategory: z.string().trim().optional().nullable(),
  question: nonEmpty('Frage'),
  answers: z.array(z.string().trim().min(1, 'Antwort darf nicht leer sein.')).length(4, 'Genau vier Antworten erforderlich.'),
  correctAnswer: correctAnswerSchema,
  explanation: nonEmpty('Erklärung'),
  difficulty: z.enum(DIFFICULTIES).optional().default('medium'),
  tags: z.array(z.string()).optional().default([]),
  imageUrl: z.string().trim().optional().nullable(),
  audioUrl: z.string().trim().optional().nullable(),
  requiresPro: z.boolean().optional().default(false),
});

export type ImportQuestionRow = z.infer<typeof importQuestionSchema>;

export interface NormalizedImportQuestion {
  category: string;
  subcategory: string | null;
  questionText: string;
  answers: Record<AnswerKey, string>;
  correctAnswer: AnswerKey;
  explanation: string;
  difficulty: Difficulty;
  tags: string[];
  imageUrl: string | null;
  audioUrl: string | null;
  requiresPro: boolean;
}

export function toAnswerKey(value: number | AnswerKey): AnswerKey {
  if (typeof value === 'number') return ANSWER_KEYS[value] ?? 'A';
  return value;
}

/** Converts a validated import row into the normalised shape used for inserts. */
export function normalizeImportRow(row: ImportQuestionRow): NormalizedImportQuestion {
  const [a, b, c, d] = row.answers as [string, string, string, string];
  return {
    category: row.category.trim(),
    subcategory: row.subcategory?.trim() || null,
    questionText: row.question.trim(),
    answers: { A: a, B: b, C: c, D: d },
    correctAnswer: toAnswerKey(row.correctAnswer),
    explanation: row.explanation.trim(),
    difficulty: row.difficulty,
    tags: normalizeTags(row.tags),
    imageUrl: row.imageUrl?.trim() || null,
    audioUrl: row.audioUrl?.trim() || null,
    requiresPro: row.requiresPro,
  };
}

export interface ImportRowResult {
  index: number;
  ok: boolean;
  question: NormalizedImportQuestion | null;
  issues: QuestionValidationIssue[];
}

/** Validates a list of raw import rows and returns per-row results (never throws). */
export function validateImportRows(rows: readonly unknown[]): ImportRowResult[] {
  return rows.map((raw, index) => {
    const parsed = importQuestionSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        index,
        ok: false,
        question: null,
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.map(String).join('.') || 'row',
          message: issue.message,
        })),
      };
    }
    return { index, ok: true, question: normalizeImportRow(parsed.data), issues: [] };
  });
}
