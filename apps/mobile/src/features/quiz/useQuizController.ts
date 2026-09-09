import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { computeLevelProgress, summarizeSession, toLocalDateString, xpForAnswer } from '@quizbyte/shared';
import type { AnswerKey, AttemptResult } from '@quizbyte/shared';

import { queryKeys } from '@/services/api/queryKeys';
import { completeQuizSession, submitAttempt } from '@/services/api/sessionsApi';
import { analytics } from '@/services/analytics/analytics';
import { getUserMessage, isNetworkError, logger } from '@/services/errors';
import { haptics } from '@/services/haptics/haptics';
import { flushAttemptOutbox, useAttemptOutbox } from '@/services/outbox/attemptOutbox';
import { useAuthStore } from '@/state/authStore';
import { selectCurrentAttempt, selectCurrentQuestion, useQuizSessionStore } from '@/state/quizSessionStore';

/**
 * Drives the running quiz: answering, moving on and finishing.
 * The UI stays responsive – server writes never block the flow.
 */
export function useQuizController() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);
  const session = useQuizSessionStore((state) => state.active);
  const question = useQuizSessionStore(selectCurrentQuestion);
  const attempt = useQuizSessionStore(selectCurrentAttempt);
  const recordAttempt = useQuizSessionStore((state) => state.recordAttempt);
  const next = useQuizSessionStore((state) => state.next);
  const complete = useQuizSessionStore((state) => state.complete);
  const abandon = useQuizSessionStore((state) => state.abandon);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const answer = useCallback(
    (selected: AnswerKey) => {
      if (!session || !question || attempt || !userId) return;

      const isCorrect = selected === question.correctAnswer;
      const responseTimeMs = Math.max(0, Date.now() - session.questionShownAt);
      const optimistic: AttemptResult = {
        questionId: question.id,
        selectedAnswer: selected,
        isCorrect,
        responseTimeMs,
        xpEarned: xpForAnswer(isCorrect),
      };
      recordAttempt(optimistic);
      void (isCorrect ? haptics.correct() : haptics.wrong());
      analytics.track('question_answered', {
        sessionId: session.sessionId,
        questionId: question.id,
        questionIndex: session.currentIndex,
        isCorrect,
        responseTimeMs,
      });

      const input = {
        userId,
        sessionId: session.sessionId,
        questionId: question.id,
        selectedAnswer: selected,
        responseTimeMs,
        answeredOn: toLocalDateString(),
      };
      submitAttempt(input).catch((error: unknown) => {
        if (isNetworkError(error)) {
          useAttemptOutbox.getState().enqueue(input);
        } else {
          logger.error('submit attempt failed', error);
        }
      });
    },
    [attempt, question, recordAttempt, session, userId],
  );

  const isLast = session ? session.currentIndex >= session.questions.length - 1 : true;

  const finish = useCallback(async () => {
    if (!session || finishing) return;
    setFinishing(true);
    setFinishError(null);
    try {
      const delivered = await flushAttemptOutbox();
      if (!delivered) {
        throw new Error('Network request failed');
      }
      const result = await completeQuizSession(session.sessionId);
      const summary = summarizeSession(session.questions, session.attempts);
      analytics.track('quiz_completed', {
        sessionId: session.sessionId,
        sessionType: session.sessionType,
        categoryId: session.categoryId,
        totalQuestions: session.questions.length,
        correctAnswers: summary.correct,
        xpEarned: result.session.xp_earned,
      });
      const before = computeLevelProgress(session.startTotalXp).level;
      const after = computeLevelProgress(result.progress.totalXp).level;
      if (after > before) {
        analytics.track('level_up', { fromLevel: before, toLevel: after });
        void haptics.levelUp();
      }
      complete(result.progress.totalXp, result.completionBonusXp);
      await queryClient.invalidateQueries({ queryKey: queryKeys.progress });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });
      router.replace('/quiz/result');
    } catch (error) {
      logger.error('finish session failed', error);
      setFinishError(getUserMessage(error, 'Das Ergebnis konnte nicht gespeichert werden. Bitte versuche es erneut.'));
    } finally {
      setFinishing(false);
    }
  }, [complete, finishing, queryClient, router, session]);

  const continueOrFinish = useCallback(() => {
    if (!session) return;
    if (isLast) {
      void finish();
    } else {
      next();
    }
  }, [finish, isLast, next, session]);

  const leave = useCallback(() => {
    if (session) {
      analytics.track('quiz_abandoned', {
        sessionId: session.sessionId,
        sessionType: session.sessionType,
        questionIndex: session.currentIndex,
        answeredQuestions: session.attempts.length,
      });
      void flushAttemptOutbox();
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    }
    abandon();
    router.dismissTo('/(tabs)');
  }, [abandon, queryClient, router, session]);

  return {
    session,
    question,
    attempt,
    isLast,
    finishing,
    finishError,
    answer,
    continueOrFinish,
    retryFinish: finish,
    leave,
  };
}
