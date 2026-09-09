/**
 * Domain types used by the mobile app and the admin panel.
 *
 * These are intentionally decoupled from the generated database row types
 * (`@quizbyte/database`). Repositories map DB rows to these shapes.
 */

export const ANSWER_KEYS = ['A', 'B', 'C', 'D'] as const;
export type AnswerKey = (typeof ANSWER_KEYS)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const QUESTION_STATUSES = ['draft', 'review', 'published', 'archived'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const SESSION_TYPES = ['category', 'random', 'weakness', 'daily', 'duel', 'exam'] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Icon identifier (Ionicons name); resolved by the UI layer. */
  icon: string | null;
  /** Optional accent colour (hex) for the category card. */
  accentColor: string | null;
  sortOrder: number;
  isActive: boolean;
  requiresPro: boolean;
  /** Number of published questions – computed by the database. */
  publishedQuestionCount: number;
}

export interface Question {
  id: string;
  categoryId: string;
  subcategory: string | null;
  questionText: string;
  answers: Record<AnswerKey, string>;
  correctAnswer: AnswerKey;
  explanation: string;
  difficulty: Difficulty;
  tags: string[];
  imageUrl: string | null;
  audioUrl: string | null;
  status: QuestionStatus;
  requiresPro: boolean;
}

/** A question as delivered to a quiz session (published, with its category name). */
export interface QuizQuestion extends Question {
  categoryName: string;
  categorySlug: string;
}

export interface UserProgress {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  /** Local calendar date (YYYY-MM-DD) of the last answered question, or null. */
  lastActiveDate: string | null;
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  totalSessionsCompleted: number;
}

export interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
}

/** One answered question. */
export interface AttemptResult {
  questionId: string;
  selectedAnswer: AnswerKey;
  isCorrect: boolean;
  responseTimeMs: number;
  xpEarned: number;
}

/** Aggregated performance for a category, subcategory or tag. */
export interface TopicStat {
  kind: 'category' | 'subcategory' | 'tag';
  /** Stable key, e.g. category id, subcategory name or tag. */
  key: string;
  /** Human readable label. */
  label: string;
  attempts: number;
  correct: number;
}
