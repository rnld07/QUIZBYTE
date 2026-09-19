import { create } from 'zustand';

import { isRoundOver, livesLeft, retuneSessionQuestions } from '@quizbyte/shared';
import type { AnswerKey, AttemptResult, Difficulty, QuizMode, QuizQuestion, SessionType } from '@quizbyte/shared';

export interface ActiveQuizSession {
  sessionId: string;
  sessionType: SessionType;
  /** How this round is played – decides lives, clock and length. */
  mode: QuizMode;
  categoryId: string | null;
  categoryName: string;
  questions: QuizQuestion[];
  /**
   * Everything this round could have drawn from, unfiltered. Lets the
   * difficulty setting take effect mid-quiz without another request. Empty for
   * fixed sets (daily, replays, weakness training), which must not change.
   */
  pool: QuizQuestion[];
  attempts: AttemptResult[];
  currentIndex: number;
  /** Timestamp when the current question was shown (for response time). */
  questionShownAt: number;
  /**
   * In a duel: the friend on the other side.
   *
   * Carried through the round so the result screen can offer a way back into
   * the chat the challenge came from – that is where the score appears.
   */
  duelFriendId: string | null;
  /** The duel this round is one half of, so its result can be looked up. */
  duelId: string | null;
  /**
   * Positions in  that are repeats the player asked for.
   *
   * By position, not by id: the same question appears twice, and only the
   * second showing is practice.
   */
  repeatIndices: number[];
  /** Question ids the user had already answered before this session started. */
  seenQuestionIds: string[];
  /** Question ids already answered correctly – they no longer pay XP. */
  masteredQuestionIds: string[];
  /** Second daily round of the day: the whole session pays nothing. */
  repeatedDaily: boolean;
  /**
   * When the clock runs out, as an absolute timestamp; null in an untimed mode.
   * Absolute rather than a remaining duration, so it survives a re-render and
   * keeps running while the explanation is on screen.
   */
  deadlineAt: number | null;
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
  /** Replaces the guessed XP of an answer with what the server actually paid. */
  settleAttemptXp: (questionId: string, xpEarned: number) => void;
  /**
   * Fills in a solution the round did not come with.
   *
   * Duel questions arrive without it – the verdict is the server's – and the
   * explanation card and the review screen need it once the answer is in.
   */
  revealSolution: (questionId: string, correctAnswer: AnswerKey | null, explanation: string) => void;
  /** Queues the question on screen to be asked once more at the end of the round. */
  repeatLater: () => void;
  next: () => void;
  /** Re-draws the unanswered part of the round for new difficulties. */
  retune: (difficulties: readonly Difficulty[]) => void;
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
    // Per slot, not per question id – a repeat is the same question in a new
    // slot, and it has to be answerable again.
    if (active.attempts.length > active.currentIndex) return;
    set({ active: { ...active, attempts: [...active.attempts, attempt] } });
  },
  /*
    The client guesses the XP so the answer can be acknowledged at once, but
    the database triggers are what decide it. When the two differ – a question
    already mastered, a repeated daily – the server wins, or the result screen
    reports a figure nobody was paid.
  */
  settleAttemptXp: (questionId, xpEarned) => {
    const active = get().active;
    if (!active) return;
    set({
      active: {
        ...active,
        attempts: active.attempts.map((entry) => (entry.questionId === questionId ? { ...entry, xpEarned } : entry)),
      },
    });
  },
  revealSolution: (questionId, correctAnswer, explanation) => {
    const active = get().active;
    if (!active || !correctAnswer) return;
    const patch = (question: QuizQuestion): QuizQuestion =>
      question.id === questionId
        ? { ...question, correctAnswer, explanation: explanation || question.explanation }
        : question;
    set({
      active: {
        ...active,
        questions: active.questions.map(patch),
        pool: active.pool.map(patch),
      },
    });
  },
  /*
    The same question again at the end of the round.

    Appended to the list rather than swapped in place, so the round keeps its
    order and the repeat comes when the rest is done. Nothing else changes:
    the attempt already given stands, and the repeat is marked as practice when
    it is answered.
  */
  repeatLater: () => {
    const active = get().active;
    const question = active?.questions[active.currentIndex];
    if (!active || !question) return;
    set({
      active: {
        ...active,
        questions: [...active.questions, question],
        repeatIndices: [...active.repeatIndices, active.questions.length],
      },
    });
  },
  next: () => {
    const active = get().active;
    if (!active) return;
    set({ active: { ...active, currentIndex: active.currentIndex + 1, questionShownAt: Date.now() } });
  },
  retune: (difficulties) => {
    const active = get().active;
    if (!active || active.pool.length === 0) return;
    // A queued repeat sits at the end of the list, which is exactly the part a
    // re-draw would replace. Leave the round alone rather than lose it.
    if (active.repeatIndices.length > 0) return;

    // Answered questions stay put, including one the user is currently reading
    // the explanation for – its attempt is already on the server.
    const answered = new Set(active.attempts.map((attempt) => attempt.questionId));
    let keepCount = 0;
    while (keepCount < active.questions.length && answered.has(active.questions[keepCount]?.id ?? '')) keepCount += 1;
    keepCount = Math.max(keepCount, active.currentIndex + (answered.has(active.questions[active.currentIndex]?.id ?? '') ? 1 : 0));

    const questions = retuneSessionQuestions({ questions: active.questions, pool: active.pool, keepCount, difficulties });
    if (questions.every((question, index) => question.id === active.questions[index]?.id)) return;

    // The question on screen may be a different one now – restart its timer.
    set({ active: { ...active, questions, questionShownAt: Date.now() } });
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

/**
 * The answer to the question on screen.
 *
 * Looked up by position: every slot is answered before the next is shown, so
 * the nth attempt belongs to the nth question – and a repeated question, which
 * shares its id with an earlier slot, is unanswered until its own slot is.
 */
export function selectCurrentAttempt(state: QuizSessionState): AttemptResult | null {
  const active = state.active;
  if (!active) return null;
  return active.attempts[active.currentIndex] ?? null;
}

export function hasAnswered(session: ActiveQuizSession, questionId: string): boolean {
  return session.attempts.some((attempt) => attempt.questionId === questionId);
}

export function answerFor(session: ActiveQuizSession, questionId: string): AnswerKey | null {
  return session.attempts.find((attempt) => attempt.questionId === questionId)?.selectedAnswer ?? null;
}

/** Lives left in this round, or null in a mode that has none. */
export function selectLivesLeft(state: QuizSessionState): number | null {
  const active = state.active;
  if (!active) return null;
  return livesLeft(active.mode, active.attempts);
}

/**
 * True when nothing more can be played – the lives are gone or the questions
 * have run out. The clock is checked by the controller, which is the only place
 * that knows the current time.
 */
export function roundIsOver(session: ActiveQuizSession, remainingMs?: number | null): boolean {
  return isRoundOver({
    mode: session.mode,
    attempts: session.attempts,
    questionCount: session.questions.length,
    remainingMs,
  });
}
