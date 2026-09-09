import { APP_NAME } from '../config/app';
import { ANSWER_KEYS } from '../types/domain';
import type { AnswerKey } from '../types/domain';

export interface ShareableQuestion {
  id: string;
  questionText: string;
  answers: Record<AnswerKey, string>;
}

export interface ShareTextOptions {
  /** Optional deep link to the question; appended when provided. */
  url?: string | null;
}

/**
 * Builds the text for the native share sheet. The correct answer is
 * deliberately NOT included.
 */
export function buildQuestionShareText(question: ShareableQuestion, options: ShareTextOptions = {}): string {
  const answers = ANSWER_KEYS.map((key) => `${key}: ${question.answers[key]}`).join('\n');
  const lines = ['Schaffst du diese Informatik-Frage?', '', question.questionText, '', answers, '', APP_NAME];
  if (options.url) lines.push(options.url);
  return lines.join('\n');
}

/** Deep-link helper – questions have stable ids, so links can be generated today. */
export function buildQuestionDeepLink(questionId: string, scheme = 'quizbyte'): string {
  return `${scheme}://question/${questionId}`;
}

export interface ShareableResult {
  categoryName: string;
  correct: number;
  total: number;
  accuracy: number;
}

/** Text for sharing a quiz result (prepared for later social features). */
export function buildResultShareText(result: ShareableResult): string {
  return [
    APP_NAME,
    result.categoryName,
    '',
    `${result.correct}/${result.total} richtig`,
    `${result.accuracy} %`,
    '',
    'Schaffst du mehr?',
  ].join('\n');
}
