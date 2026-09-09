import { beforeEach, describe, expect, it } from 'vitest';

import type { QuizQuestion } from '@quizbyte/shared';

import { selectCurrentAttempt, selectCurrentQuestion, useQuizSessionStore } from './quizSessionStore';
import type { ActiveQuizSession } from './quizSessionStore';

const question = (id: string): QuizQuestion => ({
  id,
  categoryId: 'cat',
  categoryName: 'Netzwerke',
  categorySlug: 'netzwerke',
  subcategory: null,
  questionText: `Frage ${id}`,
  answers: { A: 'a', B: 'b', C: 'c', D: 'd' },
  correctAnswer: 'A',
  explanation: '',
  difficulty: 'easy',
  tags: [],
  imageUrl: null,
  audioUrl: null,
  status: 'published',
  requiresPro: false,
});

const session = (): ActiveQuizSession => ({
  sessionId: 's1',
  sessionType: 'category',
  categoryId: 'cat',
  categoryName: 'Netzwerke',
  questions: [question('q1'), question('q2')],
  attempts: [],
  currentIndex: 0,
  questionShownAt: Date.now(),
  startTotalXp: 0,
});

describe('quizSessionStore', () => {
  beforeEach(() => {
    useQuizSessionStore.setState({ active: null, lastCompleted: null });
  });

  it('starts a session and exposes the current question', () => {
    useQuizSessionStore.getState().start(session());
    expect(selectCurrentQuestion(useQuizSessionStore.getState())?.id).toBe('q1');
    expect(selectCurrentAttempt(useQuizSessionStore.getState())).toBeNull();
  });

  it('records one attempt per question only', () => {
    const store = useQuizSessionStore.getState();
    store.start(session());
    store.recordAttempt({ questionId: 'q1', selectedAnswer: 'A', isCorrect: true, responseTimeMs: 10, xpEarned: 10 });
    store.recordAttempt({ questionId: 'q1', selectedAnswer: 'B', isCorrect: false, responseTimeMs: 10, xpEarned: 2 });
    const attempts = useQuizSessionStore.getState().active?.attempts ?? [];
    expect(attempts).toHaveLength(1);
    expect(attempts[0]?.selectedAnswer).toBe('A');
    expect(selectCurrentAttempt(useQuizSessionStore.getState())?.isCorrect).toBe(true);
  });

  it('moves to the next question and completes', () => {
    const store = useQuizSessionStore.getState();
    store.start(session());
    store.next();
    expect(selectCurrentQuestion(useQuizSessionStore.getState())?.id).toBe('q2');
    store.complete(120, 10);
    const state = useQuizSessionStore.getState();
    expect(state.active).toBeNull();
    expect(state.lastCompleted?.totalXpAfter).toBe(120);
    expect(state.lastCompleted?.completionBonusXp).toBe(10);
  });

  it('abandon clears the active session', () => {
    const store = useQuizSessionStore.getState();
    store.start(session());
    store.abandon();
    expect(useQuizSessionStore.getState().active).toBeNull();
  });
});
