/** Central quiz session configuration. */
export const quizConfig = {
  /**
   * Number of questions in a regular quiz session – the same five the daily
   * quiz has, and the number "a perfect round" is counted in.
   */
  DEFAULT_QUIZ_LENGTH: 5,
  /** A session can start as soon as this many published questions are available. */
  MIN_QUESTIONS_TO_START: 1,
  /**
   * Share of a weakness-training session that should be filled with questions from
   * weak topics (the rest is filled randomly to keep sessions varied).
   */
  WEAKNESS_PREFERRED_SHARE: 0.7,
  /** Number of questions in the daily quiz. */
  DAILY_QUIZ_LENGTH: 5,
  /** Upper bound for the question pool requested from the server per session. */
  MAX_POOL_SIZE: 60,
  /**
   * How many questions an open round is dealt.
   *
   * Blitz, Survival and Perfekte Runde end on their own rule – the clock, the
   * last life, the first mistake – so they are dealt everything the pool has.
   * Running out of questions would end them for a reason the mode never
   * promised, which is exactly what a perfect round hitting five did.
   */
  OPEN_ROUND_LENGTH: 60,
} as const;
