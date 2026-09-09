/** Central quiz session configuration. */
export const quizConfig = {
  /** Number of questions in a regular quiz session. */
  DEFAULT_QUIZ_LENGTH: 10,
  /** A session can start as soon as this many published questions are available. */
  MIN_QUESTIONS_TO_START: 1,
  /**
   * Share of a weakness-training session that should be filled with questions from
   * weak topics (the rest is filled randomly to keep sessions varied).
   */
  WEAKNESS_PREFERRED_SHARE: 0.7,
  /** Upper bound for the question pool requested from the server per session. */
  MAX_POOL_SIZE: 60,
} as const;
