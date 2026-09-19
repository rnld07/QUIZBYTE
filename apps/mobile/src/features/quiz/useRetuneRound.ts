import { useCallback, useState } from 'react';

import type { Difficulty } from '@quizbyte/shared';

import { retuneQuizRound } from '@/services/api/sessionsApi';
import { logger } from '@/services/errors';
import { useQuizSessionStore } from '@/state/quizSessionStore';

/**
 * Stellt die Schwierigkeit einer laufenden Runde um.
 *
 * Der Tausch passiert auf dem Server: seit 20260919008000 haelt die Runde ihr
 * Fragenset, und eine Auswahl, die sich der Client selbst zusammenstellt, waere
 * eine Behauptung, die beim naechsten Antworten zurueckgewiesen wuerde.
 * `retune_quiz_round` ersetzt die noch offenen Plaetze und gibt die Runde
 * vollstaendig zurueck – beantwortete Fragen bleiben, wo sie sind.
 *
 * Schlaegt es fehl, bleibt die Runde, wie sie war: eine Einstellung darf eine
 * laufende Runde nicht kaputt machen. Die neue Stufe gilt dann ab der naechsten.
 */
export function useRetuneRound() {
  const replaceQuestions = useQuizSessionStore((state) => state.replaceQuestions);
  const [pending, setPending] = useState(false);

  const retune = useCallback(
    async (difficulties: readonly Difficulty[]) => {
      const active = useQuizSessionStore.getState().active;
      if (!active || !active.retunable || pending) return;
      // Eine vorgemerkte Wiederholung steht am Ende der Liste – genau dort, wo
      // neu gezogen wird. Dann lieber nichts tauschen als sie verlieren.
      if (active.repeatIndices.length > 0) return;

      setPending(true);
      try {
        const round = await retuneQuizRound(active.sessionId, difficulties);
        const current = useQuizSessionStore.getState().active;
        // Zwischenzeitlich beendet oder verlassen: dann gibt es nichts mehr
        // zu tauschen.
        if (!current || current.sessionId !== active.sessionId) return;
        replaceQuestions(round.questions);
      } catch (error) {
        logger.warn('retune failed', error);
      } finally {
        setPending(false);
      }
    },
    [pending, replaceQuestions],
  );

  return { retune, pending };
}
