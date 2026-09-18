import { beforeEach, describe, expect, it } from 'vitest';

import type { QuizQuestion } from '@quizbyte/shared';

import { roundIsOver, selectCurrentAttempt, selectCurrentQuestion, selectLivesLeft, useQuizSessionStore } from './quizSessionStore';
import type { ActiveQuizSession } from './quizSessionStore';

const question = (id: string): QuizQuestion => ({
  id,
  categoryId: 'cat',
  categoryName: 'Netzwerke',
  categorySlug: 'netzwerke',
  categoryIcon: 'git-network',
  categoryAccentColor: '#06B6D4',
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

const session = (overrides: Partial<ActiveQuizSession> = {}): ActiveQuizSession => ({
  sessionId: 's1',
  sessionType: 'category',
  mode: 'classic',
  categoryId: 'cat',
  categoryName: 'Netzwerke',
  questions: [question('q1'), question('q2')],
  pool: [],
  attempts: [],
  currentIndex: 0,
  duelFriendId: null,
  duelId: null,
  repeatIndices: [],
  seenQuestionIds: [],
  masteredQuestionIds: [],
  repeatedDaily: false,
  deadlineAt: null,
  questionShownAt: Date.now(),
  startTotalXp: 0,
  ...overrides,
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

  it('counts the lives of a survival round down and ends it at zero', () => {
    const store = useQuizSessionStore.getState();
    store.start(session({ mode: 'survival' }));
    expect(selectLivesLeft(useQuizSessionStore.getState())).toBe(3);

    store.recordAttempt({ questionId: 'q1', selectedAnswer: 'B', isCorrect: false, responseTimeMs: 10, xpEarned: 0 });
    expect(selectLivesLeft(useQuizSessionStore.getState())).toBe(2);

    const active = useQuizSessionStore.getState().active;
    expect(active && roundIsOver(active)).toBe(false);
  });

  it('ends a perfect round on the first wrong answer, before the questions run out', () => {
    const store = useQuizSessionStore.getState();
    store.start(session({ mode: 'perfect' }));
    store.recordAttempt({ questionId: 'q1', selectedAnswer: 'B', isCorrect: false, responseTimeMs: 10, xpEarned: 0 });
    const active = useQuizSessionStore.getState().active;
    expect(active && roundIsOver(active)).toBe(true);
  });

  it('ends a blitz round when the clock is out, however much is left', () => {
    const store = useQuizSessionStore.getState();
    store.start(session({ mode: 'blitz', deadlineAt: Date.now() + 60_000 }));
    const active = useQuizSessionStore.getState().active;
    expect(active && roundIsOver(active, 12_000)).toBe(false);
    expect(active && roundIsOver(active, 0)).toBe(true);
  });

  it('abandon clears the active session', () => {
    const store = useQuizSessionStore.getState();
    store.start(session());
    store.abandon();
    expect(useQuizSessionStore.getState().active).toBeNull();
  });
});
