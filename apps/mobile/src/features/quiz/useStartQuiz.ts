import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { quizConfig, selectSessionQuestions } from '@quizbyte/shared';
import type { Category, QuizQuestion, SessionType, TrainingFocus } from '@quizbyte/shared';

import { fetchCategories } from '@/services/api/categoriesApi';
import { fetchProgress } from '@/services/api/progressApi';
import { queryKeys } from '@/services/api/queryKeys';
import { fetchSessionQuestions, fetchTrainingQuestions } from '@/services/api/questionsApi';
import { createQuizSession } from '@/services/api/sessionsApi';
import { analytics } from '@/services/analytics/analytics';
import { AppError, getUserMessage, logger } from '@/services/errors';
import { useAuthStore } from '@/state/authStore';
import { useQuizSessionStore } from '@/state/quizSessionStore';

export const RANDOM_CATEGORY_NAME = 'Random';
export const WEAKNESS_CATEGORY_NAME = 'Schwächen trainieren';

export type StartQuizRequest =
  | { type: 'category'; category: Category }
  | { type: 'random' }
  | { type: 'weakness'; focus: TrainingFocus };

interface StartQuizState {
  starting: boolean;
  /** Which request is currently starting (to show a loader on the right card). */
  startingKey: string | null;
  error: string | null;
}

function requestKey(request: StartQuizRequest): string {
  return request.type === 'category' ? `category:${request.category.id}` : request.type;
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
        const count = quizConfig.DEFAULT_QUIZ_LENGTH;

        let questions: QuizQuestion[] = [];
        let sessionType: SessionType = 'category';
        let categoryId: string | null = null;
        let categoryName = RANDOM_CATEGORY_NAME;

        if (request.type === 'category') {
          sessionType = 'category';
          categoryId = request.category.id;
          categoryName = request.category.name;
          analytics.track('category_viewed', { categoryId: request.category.id, categorySlug: request.category.slug });
          const pool = await fetchSessionQuestions(categoryId, quizConfig.MAX_POOL_SIZE, lookup);
          questions = selectSessionQuestions(pool, { count });
        } else if (request.type === 'random') {
          sessionType = 'random';
          const pool = await fetchSessionQuestions(null, quizConfig.MAX_POOL_SIZE, lookup);
          questions = selectSessionQuestions(pool, { count });
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

        const [sessionId, progress] = await Promise.all([
          createQuizSession({ userId, categoryId, sessionType, totalQuestions: questions.length }),
          queryClient.fetchQuery({ queryKey: queryKeys.progress, queryFn: () => fetchProgress(userId), staleTime: 30_000 }),
        ]);

        startSession({
          sessionId,
          sessionType,
          categoryId,
          categoryName,
          questions,
          attempts: [],
          currentIndex: 0,
          questionShownAt: Date.now(),
          startTotalXp: progress.totalXp,
        });
        analytics.track('quiz_started', { sessionId, sessionType, categoryId, questionCount: questions.length });
        setState({ starting: false, startingKey: null, error: null });
        router.push('/quiz/session');
      } catch (error) {
        logger.error('start quiz failed', error);
        setState({ starting: false, startingKey: null, error: getUserMessage(error) });
      }
    },
    [queryClient, router, startSession, state.starting, userId],
  );

  const clearError = useCallback(() => setState((previous) => ({ ...previous, error: null })), []);

  return { start, clearError, ...state };
}
