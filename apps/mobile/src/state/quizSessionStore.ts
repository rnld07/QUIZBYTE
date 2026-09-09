import { create } from 'zustand';

import type { AnswerKey, AttemptResult, QuizQuestion, SessionType } from '@quizbyte/shared';

export interface ActiveQuizSession {
  sessionId: string;
  sessionType: SessionType;
  categoryId: string | null;
  categoryName: string;
  questions: QuizQuestion[];
  attempts: AttemptResult[];
  currentIndex: number;
  /** Timestamp when the current question was shown (for response time). */
  questionShownAt: number;
  /** Total XP before the session started (for level-up detection). */
  startTotalXp: number;
}

export interface CompletedQuizSession extends ActiveQuizSession {
  completedAt: number;
  totalXpAfter: number;
  completionBonusXp: number;
}

interface QuizSessionState {
  active: ActiveQuizSession | null;
  lastCompleted: CompletedQuizSession | null;
  start: (session: ActiveQuizSession) => void;
  recordAttempt: (attempt: AttemptResult) => void;
  next: () => void;
  complete: (totalXpAfter: number, completionBonusXp: number) => void;
  abandon: () => void;
}

/** In-memory state of the running quiz. Persistence happens through quiz_attempts on the server. */
export const useQuizSessionStore = create<QuizSessionState>()((set, get) => ({
  active: null,
  lastCompleted: null,
  start: (session) => set({ active: session }),
  recordAttempt: (attempt) => {
    const active = get().active;
    if (!active) return;
    if (active.attempts.some((existing) => existing.questionId === attempt.questionId)) return;
    set({ active: { ...active, attempts: [...active.attempts, attempt] } });
  },
  next: () => {
    const active = get().active;
    if (!active) return;
    set({ active: { ...active, currentIndex: active.currentIndex + 1, questionShownAt: Date.now() } });
  },
  complete: (totalXpAfter, completionBonusXp) => {
    const active = get().active;
    if (!active) return;
    set({
      active: null,
      lastCompleted: { ...active, completedAt: Date.now(), totalXpAfter, completionBonusXp },
    });
  },
  abandon: () => set({ active: null }),
}));

export function selectCurrentQuestion(state: QuizSessionState): QuizQuestion | null {
  const active = state.active;
  if (!active) return null;
  return active.questions[active.currentIndex] ?? null;
}

export function selectCurrentAttempt(state: QuizSessionState): AttemptResult | null {
  const active = state.active;
  const question = selectCurrentQuestion(state);
  if (!active || !question) return null;
  return active.attempts.find((attempt) => attempt.questionId === question.id) ?? null;
}

export function hasAnswered(session: ActiveQuizSession, questionId: string): boolean {
  return session.attempts.some((attempt) => attempt.questionId === questionId);
}

export function answerFor(session: ActiveQuizSession, questionId: string): AnswerKey | null {
  return session.attempts.find((attempt) => attempt.questionId === questionId)?.selectedAnswer ?? null;
}
