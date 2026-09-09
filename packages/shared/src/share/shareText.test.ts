import { describe, expect, it } from 'vitest';

import { buildQuestionDeepLink, buildQuestionShareText, buildResultShareText } from './shareText';

describe('buildQuestionShareText', () => {
  const question = {
    id: 'q1',
    questionText: 'Welche Schicht im OSI-Modell ist die Transportschicht?',
    answers: { A: 'Layer 2', B: 'Layer 3', C: 'Layer 4', D: 'Layer 7' } as const,
  };

  it('contains question and answers but never marks the correct one', () => {
    const text = buildQuestionShareText(question);
    expect(text).toContain('Schaffst du diese Informatik-Frage?');
    expect(text).toContain(question.questionText);
    expect(text).toContain('A: Layer 2');
    expect(text).toContain('D: Layer 7');
    expect(text.endsWith('QuizByte')).toBe(true);
    expect(text).not.toMatch(/richtig|correct|✓/i);
  });

  it('appends a link when provided', () => {
    const text = buildQuestionShareText(question, { url: buildQuestionDeepLink('q1') });
    expect(text.endsWith('quizbyte://question/q1')).toBe(true);
  });
});

describe('buildResultShareText', () => {
  it('formats the result', () => {
    const text = buildResultShareText({ categoryName: 'IT-Security', correct: 8, total: 10, accuracy: 80 });
    expect(text).toContain('IT-Security');
    expect(text).toContain('8/10 richtig');
    expect(text).toContain('80 %');
  });
});
