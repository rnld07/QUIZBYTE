import { ANSWER_KEYS } from '../../types/domain';
import type { AnswerKey } from '../../types/domain';
import { createSeededRandom, shuffle } from '../../utils/random';

/** Stable 32-bit hash of a string – only used to seed the shuffle. */
function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

/**
 * The order the four answers are shown in.
 *
 * Deliberately **deterministic** for a given seed rather than drawn fresh on
 * every render: the options must not jump around while the question is on
 * screen, and after answering, the highlighted option has to stay where the
 * user tapped it. Seeding with the session id as well means the same question
 * gets a different order the next time it comes up.
 */
export function answerOrder(questionId: string, seed = ''): AnswerKey[] {
  return shuffle(ANSWER_KEYS, createSeededRandom(hash(`${questionId}:${seed}`)));
}
