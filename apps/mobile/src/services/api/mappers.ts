import type { Tables } from '@quizbyte/database';
import { normalizeAvatarConfig } from '@quizbyte/shared';
import type { Category, Profile, QuizQuestion, TopicStat, UserProgress } from '@quizbyte/shared';

export function toCategory(row: Tables<'categories_overview'>): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    accentColor: row.accent_color,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    requiresPro: row.requires_pro,
    publishedQuestionCount: row.published_question_count,
  };
}

export interface CategoryLookup {
  get(id: string): Pick<Category, 'name' | 'slug' | 'icon' | 'accentColor'> | undefined;
}

export function toQuizQuestion(row: Tables<'questions'>, categories: CategoryLookup): QuizQuestion {
  const category = categories.get(row.category_id);
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: category?.name ?? 'Allgemein',
    categorySlug: category?.slug ?? 'unknown',
    categoryIcon: category?.icon ?? null,
    categoryAccentColor: category?.accentColor ?? null,
    subcategory: row.subcategory,
    questionText: row.question_text,
    answers: { A: row.answer_a, B: row.answer_b, C: row.answer_c, D: row.answer_d },
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    difficulty: row.difficulty,
    tags: row.tags,
    imageUrl: row.image_url,
    audioUrl: row.audio_url,
    status: row.status,
    requiresPro: row.requires_pro,
  };
}

export function toUserProgress(row: Tables<'user_progress'>): UserProgress {
  return {
    totalXp: row.total_xp,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActiveDate: row.last_active_date,
    totalQuestionsAnswered: row.total_questions_answered,
    totalCorrectAnswers: row.total_correct_answers,
    totalSessionsCompleted: row.total_sessions_completed,
  };
}

export function toProfile(row: Tables<'profiles'>): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarConfig: normalizeAvatarConfig(row.avatar_config),
    selectedFrame: row.selected_frame,
    role: row.role,
    suspendedAt: row.suspended_at,
    suspendedReason: row.suspended_reason,
    searchable: row.searchable,
    allowFriendRequests: row.allow_friend_requests,
    createdAt: row.created_at,
  };
}

export function toTopicStat(row: { kind: string; key: string; label: string; attempts: number; correct: number }): TopicStat | null {
  if (row.kind !== 'category' && row.kind !== 'subcategory' && row.kind !== 'tag') return null;
  return {
    kind: row.kind,
    key: row.key,
    label: row.label,
    attempts: Number(row.attempts),
    correct: Number(row.correct),
  };
}
