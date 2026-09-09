import type { AttemptResult, QuizQuestion } from '../../types/domain';
import { computeAccuracy } from '../stats/accuracy';

export interface SessionTopicResult {
  label: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface SessionSummary {
  totalQuestions: number;
  answered: number;
  correct: number;
  accuracy: number;
  /** XP from answers only (session bonus is added by the server on completion). */
  answerXp: number;
  strongestTopic: SessionTopicResult | null;
  weakestTopic: SessionTopicResult | null;
}

function topicLabel(question: QuizQuestion): string {
  return question.subcategory ?? question.categoryName;
}

/**
 * Summarises one finished (or abandoned) session from its attempts.
 * Strongest/weakest topic are only reported when at least two different topics
 * were played, otherwise the information is meaningless.
 */
export function summarizeSession(
  questions: readonly QuizQuestion[],
  attempts: readonly AttemptResult[],
): SessionSummary {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const topics = new Map<string, SessionTopicResult>();

  let correct = 0;
  let answerXp = 0;
  for (const attempt of attempts) {
    if (attempt.isCorrect) correct += 1;
    answerXp += attempt.xpEarned;
    const question = byId.get(attempt.questionId);
    if (!question) continue;
    const label = topicLabel(question);
    const entry = topics.get(label) ?? { label, attempts: 0, correct: 0, accuracy: 0 };
    entry.attempts += 1;
    if (attempt.isCorrect) entry.correct += 1;
    topics.set(label, entry);
  }

  const ranked = [...topics.values()]
    .map((topic) => ({ ...topic, accuracy: computeAccuracy(topic.correct, topic.attempts) }))
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts || a.label.localeCompare(b.label));

  const hasComparison = ranked.length >= 2;
  const strongest = hasComparison ? (ranked[0] ?? null) : null;
  const weakest = hasComparison ? (ranked[ranked.length - 1] ?? null) : null;

  return {
    totalQuestions: questions.length,
    answered: attempts.length,
    correct,
    accuracy: computeAccuracy(correct, attempts.length),
    answerXp,
    strongestTopic: strongest,
    weakestTopic: weakest && weakest.label !== strongest?.label ? weakest : null,
  };
}
