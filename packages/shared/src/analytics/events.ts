import type { QuizMode } from '../domain/quiz/modes';
import type { SessionType } from '../types/domain';

/**
 * Analytics event catalogue. Every event and its payload is typed here so that
 * providers (PostHog, Firebase, …) can be swapped without touching call sites.
 * Never add personal data (names, e-mails) to event payloads.
 */
export interface AnalyticsEventMap {
  app_opened: Record<string, never>;
  screen_viewed: { screen: string };
  category_viewed: { categoryId: string; categorySlug: string };
  quiz_started: {
    sessionId: string;
    sessionType: SessionType;
    mode: QuizMode;
    categoryId: string | null;
    questionCount: number;
  };
  question_answered: {
    sessionId: string;
    questionId: string;
    questionIndex: number;
    isCorrect: boolean;
    responseTimeMs: number;
  };
  question_audio_played: { questionId: string };
  question_shared: { questionId: string };
  quiz_completed: {
    sessionId: string;
    sessionType: SessionType;
    mode: QuizMode;
    categoryId: string | null;
    totalQuestions: number;
    correctAnswers: number;
    xpEarned: number;
  };
  quiz_abandoned: {
    sessionId: string;
    sessionType: SessionType;
    questionIndex: number;
    answeredQuestions: number;
  };
  weakness_training_started: { topicCount: number };
  level_up: { fromLevel: number; toLevel: number };
  streak_extended: { currentStreak: number };
  profile_updated: { field: 'username' | 'display_name' | 'avatar' };
  account_created: { confirmationSent: boolean };
  /** A leftover guest turned into a real account – same user, now with an e-mail. */
  account_linked: { confirmationSent: boolean };
  signed_in: Record<string, never>;
  signed_out: Record<string, never>;
  settings_changed: { setting: string; value: string | number | boolean };
  error_shown: { code: string };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

export interface AnalyticsEvent<Name extends AnalyticsEventName = AnalyticsEventName> {
  name: Name;
  properties: AnalyticsEventMap[Name];
  timestamp: string;
}

/** Contract every analytics provider has to fulfil. */
export interface AnalyticsProvider {
  track<Name extends AnalyticsEventName>(name: Name, properties: AnalyticsEventMap[Name]): void;
  identify(userId: string): void;
  reset(): void;
}
