/**
 * Domain types used by the mobile app and the admin panel.
 *
 * These are intentionally decoupled from the generated database row types
 * (`@quizbyte/database`). Repositories map DB rows to these shapes.
 */
import type { AvatarConfig } from '../domain/profile/avatar';

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

/**
 * A question as delivered to a quiz session (published, with its category branding).
 *
 * `correctAnswer` is nullable here and not on {@link Question}: the editorial
 * question always has a solution, but what reaches a player need not carry it.
 * In a duel it does not – the verdict comes from the server once the answer is
 * in – and a shared question in the chat only reveals it after it was answered.
 */
export interface QuizQuestion extends Omit<Question, 'correctAnswer'> {
  /** null when the server withholds the solution until the answer is given. */
  correctAnswer: AnswerKey | null;
  categoryName: string;
  categorySlug: string;
  /** Icon identifier of the category; resolved by the UI layer. */
  categoryIcon: string | null;
  /** Accent colour (hex) of the category. */
  categoryAccentColor: string | null;
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
  /**
   * The drawn pet avatar – species, fur, breed and what it wears.
   *
   * There is no uploaded picture any more: `profiles.avatar_url` still exists in
   * the database for the ones uploaded before, but nothing reads it.
   */
  avatarConfig: AvatarConfig;
  /** Id of the equipped profile frame; null when none is worn. */
  selectedFrame: string | null;
  role: UserRole;
  /**
   * When an admin suspended this account, or null while it is in good standing.
   *
   * The app reads it to explain why nothing works any more; the database is
   * what actually stops the account – see `is_suspended()`.
   */
  suspendedAt: string | null;
  /** What the admin wrote when suspending, if anything. */
  suspendedReason: string | null;
  /** Found through the user search. */
  searchable: boolean;
  /** Strangers may send a friend request. */
  allowFriendRequests: boolean;
  createdAt: string;
}

/** One answered question. */
export interface AttemptResult {
  questionId: string;
  selectedAnswer: AnswerKey;
  isCorrect: boolean;
  responseTimeMs: number;
  xpEarned: number;
  /**
   * A question the player asked to see again later in the same round.
   *
   * Practice, not an answer: it is never sent to the server, pays no XP, costs
   * no life and counts towards nothing in the summary. Without that it would
   * be a way to farm – answer wrong, ask for a repeat, answer right.
   */
  isRepeat?: boolean;
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
