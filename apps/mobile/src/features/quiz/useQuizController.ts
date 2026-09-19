import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { computeLevelProgress, summarizeSession, toLocalDateString, xpForAttempt } from '@quizbyte/shared';
import type { AnswerKey, AttemptResult } from '@quizbyte/shared';

import { settleDuel } from '@/services/api/friendsApi';
import { queryKeys } from '@/services/api/queryKeys';
import { completeQuizSession, submitAttempt } from '@/services/api/sessionsApi';
import { analytics } from '@/services/analytics/analytics';
import { AppError, getUserMessage, isNetworkError, logger } from '@/services/errors';
import { haptics } from '@/services/haptics/haptics';
import { deliverAttempt, flushAttemptOutbox } from '@/services/outbox/attemptOutbox';
import { useAuthStore } from '@/state/authStore';
import { roundIsOver, selectCurrentAttempt, selectCurrentQuestion, useQuizSessionStore } from '@/state/quizSessionStore';

import { useRoundClock } from './useRoundClock';

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
  const settleAttemptXp = useQuizSessionStore((state) => state.settleAttemptXp);
  const revealSolution = useQuizSessionStore((state) => state.revealSolution);
  const repeatLater = useQuizSessionStore((state) => state.repeatLater);
  const next = useQuizSessionStore((state) => state.next);
  const complete = useQuizSessionStore((state) => state.complete);
  const abandon = useQuizSessionStore((state) => state.abandon);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  /**
   * The answer a duel is currently waiting on.
   *
   * A duel round arrives without its solutions, so nothing can be shown until
   * the server has answered. Everywhere else the answer is acknowledged at once
   * and the server only corrects the XP.
   */
  const [pendingAnswer, setPendingAnswer] = useState<AnswerKey | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  /**
   * Alles, was gerade zum Server unterwegs ist.
   *
   * Der Abschluss wartet darauf. Ohne das rechnete der Server die Runde ab,
   * waehrend die letzte Antwort noch lief – und lehnte sie danach ab, weil die
   * Runde bereits abgeschlossen war. Gerade die letzte Antwort ist die, auf die
   * es ankommt.
   */
  const inFlight = useRef<Set<Promise<unknown>>>(new Set());

  const track = useCallback(<T,>(task: Promise<T>): Promise<T> => {
    inFlight.current.add(task);
    void task.finally(() => inFlight.current.delete(task));
    return task;
  }, []);

  /** Wartet, bis nichts mehr unterwegs ist – auch auf das, was dabei dazukommt. */
  const settleInFlight = useCallback(async () => {
    while (inFlight.current.size > 0) {
      await Promise.allSettled([...inFlight.current]);
    }
  }, []);

  const answer = useCallback(
    (selected: AnswerKey) => {
      if (!session || !question || attempt || !userId || pendingAnswer) return;

      const responseTimeMs = Math.max(0, Date.now() - session.questionShownAt);
      // Practice, asked for with "Später wiederholen": it is not sent, pays
      // nothing and counts for nothing. The server would refuse it anyway –
      // a question can be answered only once per session.
      const isRepeat = session.repeatIndices.includes(session.currentIndex);
      const input = {
        userId,
        sessionId: session.sessionId,
        questionId: question.id,
        selectedAnswer: selected,
        responseTimeMs,
        answeredOn: toLocalDateString(),
      };

      /*
        Duell: erst der Server, dann die Anzeige.

        Die Frage kam ohne Loesung – wer im Duell antwortet, erfaehrt vom Server,
        ob es richtig war, und nicht vom eigenen Geraet. Das kostet den Moment
        zwischen Tippen und Antwort, und genau den macht der Wartezustand an der
        Antwort sichtbar. Eine Verbindung ist dafuer noetig; in die
        Offline-Warteschlange darf eine Duellantwort nicht, sonst antwortet
        jemand ins Leere und erfaehrt nie, wie es ausging.
      */
      if (session.sessionType === 'duel' && !isRepeat) {
        setPendingAnswer(selected);
        setAnswerError(null);
        track(
          submitAttempt(input),
        )
          .then((stored) => {
            revealSolution(question.id, stored.correctAnswer, stored.explanation);
            recordAttempt({
              questionId: question.id,
              selectedAnswer: selected,
              isCorrect: stored.isCorrect,
              responseTimeMs,
              xpEarned: stored.xpEarned,
            });
            void (stored.isCorrect ? haptics.correct() : haptics.wrong());
            analytics.track('question_answered', {
              sessionId: session.sessionId,
              questionId: question.id,
              questionIndex: session.currentIndex,
              isCorrect: stored.isCorrect,
              responseTimeMs,
            });
          })
          .catch((error: unknown) => {
            logger.error('submit duel attempt failed', error);
            setAnswerError(
              isNetworkError(error)
                ? 'Für ein Duell brauchst du eine Verbindung. Tippe die Antwort noch einmal an.'
                : getUserMessage(error, 'Die Antwort kam nicht an. Tippe sie noch einmal an.'),
            );
          })
          .finally(() => setPendingAnswer(null));
        return;
      }

      const isCorrect = selected === question.correctAnswer;
      const optimistic: AttemptResult = {
        questionId: question.id,
        selectedAnswer: selected,
        isCorrect,
        responseTimeMs,
        isRepeat,
        xpEarned: isRepeat
          ? 0
          : xpForAttempt({
              isCorrect,
              difficulty: question.difficulty,
              alreadyCorrect: session.masteredQuestionIds.includes(question.id),
              sessionType: session.sessionType,
              repeatedDaily: session.repeatedDaily,
            }),
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

      if (isRepeat) return;

      /*
        Erst speichern, dann senden.

        `deliverAttempt` legt die Antwort dauerhaft ab und loest erst danach den
        Versand aus. Frueher stand es andersherum: gesendet wurde sofort, und
        nur ein Netzfehler brachte die Antwort in die Warteschlange. Ein
        Serverfehler oder ein Beenden der App im falschen Moment liess sie
        verschwinden.
      */
      void track(
        deliverAttempt(input).then((stored) => {
          if (stored) settleAttemptXp(stored.questionId, stored.xpEarned);
        }),
      );
    },
    [attempt, pendingAnswer, question, recordAttempt, revealSolution, session, settleAttemptXp, track, userId],
  );

  const finish = useCallback(async () => {
    if (!session || finishing) return;
    setFinishing(true);
    setFinishError(null);
    try {
      // Erst alles abwarten, was noch unterwegs ist, dann die Warteschlange.
      await settleInFlight();
      const delivered = await flushAttemptOutbox(userId);
      if (!delivered) {
        throw new AppError('network', 'Keine Verbindung. Deine Antworten sind gespeichert und gehen später raus.');
      }
      const result = await completeQuizSession(session.sessionId);
      const summary = summarizeSession(session.questions, session.attempts);
      analytics.track('quiz_completed', {
        sessionId: session.sessionId,
        sessionType: session.sessionType,
        mode: session.mode,
        categoryId: session.categoryId,
        // What was actually played – Blitz and Survival end before the drawn
        // set runs out, and the server trims the round to the same number.
        totalQuestions: summary.answered,
        correctAnswers: summary.correct,
        xpEarned: result.session.xp_earned,
      });
      const before = computeLevelProgress(session.startTotalXp).level;
      const after = computeLevelProgress(result.progress.totalXp).level;
      if (after > before) {
        analytics.track('level_up', { fromLevel: before, toLevel: after });
        void haptics.levelUp();
      }
      /*
        Clear the round and leave the screen in the same breath. Anything
        awaited in between – the refetches used to sit here – renders the quiz
        screen once more with no active session, and it flashes "Kein aktives
        Quiz" on the way to the result.
      */
      complete(result.progress.totalXp, result.completionBonusXp);
      router.replace('/quiz/result');

      /*
        A duel round is half of something two people are looking at. Settling it
        here rather than waiting for somebody to open the chat is what makes the
        score in the chat right on arrival instead of a few seconds later.
      */
      if (session.duelId) {
        void settleDuel(session.duelId)
          .catch(() => undefined)
          .finally(() => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.conversation });
            void queryClient.invalidateQueries({ queryKey: queryKeys.duel });
          });
      }

      // The lists behind the round are stale now; they can refresh while the
      // result screen is already up.
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
    } catch (error) {
      logger.error('finish session failed', error);
      setFinishError(getUserMessage(error, 'Das Ergebnis konnte nicht gespeichert werden. Bitte versuche es erneut.'));
    } finally {
      setFinishing(false);
    }
  }, [complete, finishing, queryClient, router, session, settleInFlight, userId]);

  /**
   * Drops the running round without navigating anywhere.
   *
   * Split out because the screen can also be left by the back-swipe, where the
   * navigation has already happened by the time we hear about it – and the
   * answers given so far still have to reach the server. Doing nothing when
   * there is no session makes it safe to call twice.
   */
  const abandonSession = useCallback(() => {
    if (!session) return;
    analytics.track('quiz_abandoned', {
      sessionId: session.sessionId,
      sessionType: session.sessionType,
      questionIndex: session.currentIndex,
      answeredQuestions: session.attempts.length,
    });
    // Auch beim Verlassen: was noch laeuft, darf zu Ende laufen, und was
    // liegengeblieben ist, bekommt einen Versuch.
    void settleInFlight().then(() => flushAttemptOutbox(userId));
    void queryClient.invalidateQueries({ queryKey: queryKeys.progress });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
    void queryClient.invalidateQueries({ queryKey: ['activity'] });
    abandon();
  }, [abandon, queryClient, session, settleInFlight, userId]);

  const leave = useCallback(() => {
    // Back to where the round was started from: training, replays and the saved
    // list all live on the progress tab, everything else on the start screen.
    const origin = session?.sessionType === 'weakness' ? '/(tabs)/progress' : '/(tabs)';
    abandonSession();
    router.dismissTo(origin);
  }, [abandonSession, router, session]);

  /**
   * The clock has run out (Blitz). Finishing needs at least one answer – the
   * server refuses an empty round – so an untouched one is simply dropped.
   */
  const expireRound = useCallback(() => {
    if (!session) return;
    if (session.attempts.length > 0) {
      void finish();
    } else {
      leave();
    }
  }, [finish, leave, session]);

  const remainingMs = useRoundClock(session?.deadlineAt ?? null, expireRound);

  /** Queue the question on screen to come round once more, then move on. */
  const repeatCurrentLater = useCallback(() => {
    repeatLater();
    next();
  }, [next, repeatLater]);

  /**
   * True when the answer on screen is the last one of the round: the final
   * question, the final life, or the final second. It is what turns "Weiter"
   * into "Ergebnis anzeigen".
   */
  const isLast = session ? roundIsOver(session, remainingMs) : true;

  const continueOrFinish = useCallback(() => {
    if (!session) return;
    if (isLast) {
      void finish();
    } else {
      next();
    }
  }, [finish, isLast, next, session]);

  return {
    session,
    question,
    attempt,
    isLast,
    /** Milliseconds left on the clock; null in an untimed mode. */
    remainingMs,
    finishing,
    finishError,
    /** The duel answer on its way to the server; nothing else can be tapped meanwhile. */
    pendingAnswer,
    /** Why the last answer did not reach the server. Only a duel can get here. */
    answerError,
    answer,
    continueOrFinish,
    repeatCurrentLater,
    /** Already queued, or the round is over anyway – then there is nothing to offer. */
    canRepeatLater: Boolean(session) && !isLast && !(attempt?.isRepeat ?? false),
    retryFinish: finish,
    leave,
    abandonSession,
  };
}
