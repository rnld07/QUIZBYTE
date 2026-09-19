import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  DEFAULT_QUIZ_MODE,
  filterByDifficulty,
  preferUnseenQuestions,
  quizConfig,
  quizModeById,
  selectSessionQuestions,
} from '@quizbyte/shared';
import type { Category, QuizMode, QuizQuestion, SessionType, TrainingFocus } from '@quizbyte/shared';

import { fetchCategories } from '@/services/api/categoriesApi';
import { fetchProgress } from '@/services/api/progressApi';
import { queryKeys } from '@/services/api/queryKeys';
import {
  fetchAnswerHistory,
  fetchSessionQuestions,
  fetchTrainingQuestions,
  fetchWrongQuestions,
} from '@/services/api/questionsApi';
import { createQuizSession, fetchIsRepeatedDaily, startDailyRound, startDuelRound } from '@/services/api/sessionsApi';
import type { StartedRound } from '@/services/api/sessionsApi';
import { analytics } from '@/services/analytics/analytics';
import { AppError, getUserMessage, logger } from '@/services/errors';
import { useAuthStore } from '@/state/authStore';
import { useQuizSessionStore } from '@/state/quizSessionStore';
import { useSettingsStore } from '@/state/settingsStore';

export const RANDOM_CATEGORY_NAME = 'Random';
export const WEAKNESS_CATEGORY_NAME = 'Schwächen trainieren';
export const MISTAKES_CATEGORY_NAME = 'Meine Fehler';
export const DAILY_CATEGORY_NAME = 'Daily Quiz';
export const DUEL_CATEGORY_NAME = 'Duell';

export type StartQuizRequest =
  /** The mode is picked before the round starts; classic when nothing is given. */
  | { type: 'category'; category: Category; mode?: QuizMode }
  | { type: 'random'; mode?: QuizMode }
  /** Five random questions, double XP. Always a classic round. */
  | { type: 'daily' }
  /** One side of a duel: the fixed questions both players get, in their mode. */
  | { type: 'duel'; duelId: string; mode?: QuizMode; /** Who the duel is against – lets the result find its way back to the chat. */ friendId?: string }
  | { type: 'weakness'; focus: TrainingFocus }
  /** Replays the questions the user answered wrong. */
  | { type: 'mistakes' }
  /** Replays an explicit set of questions (from the category drill-down). */
  | { type: 'replay'; questions: QuizQuestion[]; label: string; categoryId?: string | null };

interface StartQuizState {
  starting: boolean;
  /** Which request is currently starting (to show a loader on the right card). */
  startingKey: string | null;
  error: string | null;
}

/** Which mode this request plays in; everything fixed runs the classic round. */
function requestMode(request: StartQuizRequest): QuizMode {
  if (request.type === 'category' || request.type === 'random' || request.type === 'duel') {
    return request.mode ?? DEFAULT_QUIZ_MODE;
  }
  return DEFAULT_QUIZ_MODE;
}

function requestKey(request: StartQuizRequest): string {
  if (request.type === 'category') return `category:${request.category.id}`;
  if (request.type === 'replay') return `replay:${request.label}`;
  if (request.type === 'duel') return `duel:${request.duelId}`;
  return request.type;
}

/**
 * Loads all questions for a session up-front, creates the server session and
 * navigates to the quiz screen. Later questions never need another request.
 */
export function useStartQuiz() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);
  const startSession = useQuizSessionStore((state) => state.start);
  // Difficulty preference is applied to the freshly loaded pool.
  // The quiz screen can change it mid-round via the session store's retune.
  const difficulties = useSettingsStore((state) => state.difficulties);
  // When on, category and random rounds skip everything already answered.
  const onlyNewQuestions = useSettingsStore((state) => state.onlyNewQuestions);
  const [state, setState] = useState<StartQuizState>({ starting: false, startingKey: null, error: null });

  const start = useCallback(
    async (request: StartQuizRequest) => {
      if (state.starting) return;
      if (!userId) {
        setState({ starting: false, startingKey: null, error: 'Bitte warte einen Moment, die Anmeldung läuft noch.' });
        return;
      }
      setState({ starting: true, startingKey: requestKey(request), error: null });

      try {
        const categories = await queryClient.fetchQuery({
          queryKey: queryKeys.categories,
          queryFn: fetchCategories,
          staleTime: 5 * 60 * 1000,
        });
        const lookup = new Map(categories.map((category) => [category.id, category]));
        // The mode decides how long the round is drawn: Blitz and Survival need
        // a deep set, because they end on the clock or on the last life.
        const mode = requestMode(request);
        const modeRules = quizModeById(mode);
        const count = modeRules.questionCount;

        /**
         * "Nur neue Fragen": unanswered questions come first.
         *
         * They are not the *only* ones though – the round is topped up with
         * already-answered questions when there are not enough new ones, so a
         * Blitz round ends on the clock and not because the category ran dry.
         * Once enough new questions exist, the seen ones stop being reached.
         */
        const narrowToNew = async (candidates: QuizQuestion[]) => {
          if (!onlyNewQuestions || candidates.length === 0) return candidates;
          const history = await fetchAnswerHistory(userId, candidates.map((question) => question.id));
          return preferUnseenQuestions(candidates, history.seen, count);
        };

        let questions: QuizQuestion[] = [];
        let sessionType: SessionType = 'category';
        let categoryId: string | null = null;
        let categoryName = RANDOM_CATEGORY_NAME;
        let repeatedDaily = false;
        let duelId: string | null = null;
        let duelFriendId: string | null = null;
        /*
          Gesetzt, wenn der Server die Runde angelegt hat.

          Daily und Duell entstehen seit 20260919008200 dort: der Server sucht
          die Fragen aus, haelt sie als Fragenset fest und gibt beides zurueck.
          Damit ist eine Antwort auf etwas anderes nicht mehr moeglich – vorher
          war die Runde das, was der Client behauptete.
        */
        let startedRound: StartedRound | null = null;
        // Kept for the difficulty setting so it can take effect mid-quiz.
        // Stays empty for fixed sets, which must not change under the user.
        let pool: QuizQuestion[] = [];

        if (request.type === 'category') {
          sessionType = 'category';
          categoryId = request.category.id;
          categoryName = request.category.name;
          analytics.track('category_viewed', { categoryId: request.category.id, categorySlug: request.category.slug });
          pool = await fetchSessionQuestions(categoryId, quizConfig.MAX_POOL_SIZE, lookup);
          questions = selectSessionQuestions(await narrowToNew(filterByDifficulty(pool, difficulties)), { count });
        } else if (request.type === 'random') {
          sessionType = 'random';
          pool = await fetchSessionQuestions(null, quizConfig.MAX_POOL_SIZE, lookup);
          questions = selectSessionQuestions(await narrowToNew(filterByDifficulty(pool, difficulties)), { count });
        } else if (request.type === 'daily') {
          sessionType = 'daily';
          categoryName = DAILY_CATEGORY_NAME;
          // Fixed set for the day, already in order - no filter, no shuffle.
          // Round and questions come together; which of them pays is decided
          // per question by the server, not by a client-side guess.
          startedRound = await startDailyRound(lookup);
          questions = startedRound.questions;
        } else if (request.type === 'duel') {
          // Both players get the same fixed set, in the same order - and
          // without the solutions. In a duel the verdict is the server's.
          sessionType = 'duel';
          categoryName = DUEL_CATEGORY_NAME;
          duelId = request.duelId;
          duelFriendId = request.friendId ?? null;
          startedRound = await startDuelRound(request.duelId, lookup);
          questions = startedRound.questions;
        } else if (request.type === 'replay') {
          // The questions are already loaded – replay them in the given order.
          sessionType = 'weakness';
          categoryId = request.categoryId ?? null;
          categoryName = request.label;
          questions = request.questions.slice(0, 100);
        } else if (request.type === 'mistakes') {
          // Every wrong question is replayed, so the pool is used as-is.
          sessionType = 'weakness';
          categoryName = MISTAKES_CATEGORY_NAME;
          questions = await fetchWrongQuestions(quizConfig.MAX_POOL_SIZE, lookup);
          if (questions.length === 0) {
            throw new AppError('not_found', 'Du hast aktuell keine falsch beantworteten Fragen. Stark!');
          }
          analytics.track('weakness_training_started', { topicCount: questions.length });
        } else {
          sessionType = 'weakness';
          categoryName = WEAKNESS_CATEGORY_NAME;
          const [preferred, filler] = await Promise.all([
            fetchTrainingQuestions(request.focus, quizConfig.MAX_POOL_SIZE, lookup),
            fetchSessionQuestions(null, quizConfig.MAX_POOL_SIZE, lookup),
          ]);
          const preferredIds = new Set(preferred.map((question) => question.id));
          questions = selectSessionQuestions([...preferred, ...filler], {
            count,
            isPreferred: (question) => preferredIds.has(question.id),
          });
          analytics.track('weakness_training_started', {
            topicCount: request.focus.subcategories.length + request.focus.tags.length + request.focus.categoryIds.length,
          });
        }

        if (questions.length === 0) {
          throw new AppError('not_found', 'Für diese Kategorie sind momentan noch keine Fragen verfügbar.');
        }

        const [sessionId, progress, history] = await Promise.all([
          startedRound
            ? Promise.resolve(startedRound.sessionId)
            : createQuizSession({ userId, categoryId, sessionType, mode, totalQuestions: questions.length }),
          queryClient.fetchQuery({ queryKey: queryKeys.progress, queryFn: () => fetchProgress(userId), staleTime: 30_000 }),
          // Drives the "neu" / "schon beantwortet" badge and the no-XP-on-repeat rule.
          fetchAnswerHistory(userId, questions.map((question) => question.id)),
        ]);

        // Die Bindung an die eigene Seite des Duells passiert in
        // start_duel_round() – in derselben Transaktion wie die Runde selbst.
        // Es gibt damit keinen Moment mehr, in dem eine Duellrunde existiert,
        // die zu keinem Duell gehoert.

        // The server pays out only for the earliest daily round of the day.
        // Asking it directly keeps the result screen in sync with the payout.
        if (sessionType === 'daily') {
          repeatedDaily = await fetchIsRepeatedDaily(sessionId);
        }

        startSession({
          sessionId,
          sessionType,
          mode,
          categoryId,
          categoryName,
          questions,
          pool,
          attempts: [],
          currentIndex: 0,
          duelFriendId,
          duelId,
          repeatIndices: [],
          seenQuestionIds: history.seen,
          masteredQuestionIds: history.mastered,
          repeatedDaily,
          // Set last, right before the first question appears – everything above
          // still had to be loaded, and that time is not the player's to lose.
          deadlineAt: modeRules.timeLimitSeconds === null ? null : Date.now() + modeRules.timeLimitSeconds * 1000,
          questionShownAt: Date.now(),
          startTotalXp: progress.totalXp,
        });
        analytics.track('quiz_started', { sessionId, sessionType, mode, categoryId, questionCount: questions.length });
        setState({ starting: false, startingKey: null, error: null });
        router.push('/quiz/session');
      } catch (error) {
        logger.error('start quiz failed', error);
        setState({ starting: false, startingKey: null, error: getUserMessage(error) });
      }
    },
    [difficulties, onlyNewQuestions, queryClient, router, startSession, state.starting, userId],
  );

  const clearError = useCallback(() => setState((previous) => ({ ...previous, error: null })), []);

  return { start, clearError, ...state };
}
