import { describe, expect, it } from 'vitest';

import { normalizeTags, parseTagList, validateImportRows, validateQuestionForPublish } from './question';

const validQuestion = {
  categoryId: '2c3f4a58-6b1e-4b3f-9a0e-1a2b3c4d5e6f',
  subcategory: 'OSI-Modell',
  questionText: 'Welche Schicht im OSI-Modell ist die Transportschicht?',
  answerA: 'Layer 2',
  answerB: 'Layer 3',
  answerC: 'Layer 4',
  answerD: 'Layer 7',
  correctAnswer: 'C',
  explanation: 'Die Transportschicht ist Layer 4.',
  difficulty: 'easy',
  tags: ['osi', 'tcp'],
};

describe('validateQuestionForPublish', () => {
  it('accepts a complete question', () => {
    expect(validateQuestionForPublish(validQuestion)).toEqual([]);
  });

  it('reports every missing field', () => {
    const issues = validateQuestionForPublish({
      ...validQuestion,
      questionText: '  ',
      answerD: '',
      explanation: '',
      correctAnswer: 'E',
      difficulty: 'ultra',
      categoryId: 'nope',
    });
    const fields = issues.map((issue) => issue.field).sort();
    expect(fields).toEqual(['answerD', 'categoryId', 'correctAnswer', 'difficulty', 'explanation', 'questionText']);
  });
});

describe('validateImportRows', () => {
  it('normalises valid JSON rows', () => {
    const [row] = validateImportRows([
      {
        category: 'Netzwerke',
        subcategory: 'OSI-Modell',
        question: 'Welche Schicht ist Layer 4?',
        answers: ['Layer 2', 'Layer 3', 'Layer 4', 'Layer 7'],
        correctAnswer: 2,
        explanation: 'Layer 4 ist die Transportschicht.',
        difficulty: 'easy',
        tags: ['OSI', 'tcp', 'OSI'],
      },
    ]);
    expect(row?.ok).toBe(true);
    expect(row?.question).toMatchObject({
      category: 'Netzwerke',
      correctAnswer: 'C',
      answers: { A: 'Layer 2', B: 'Layer 3', C: 'Layer 4', D: 'Layer 7' },
      tags: ['osi', 'tcp'],
      difficulty: 'easy',
      requiresPro: false,
    });
  });

  it('accepts letters and numeric strings as correct answer', () => {
    const rows = validateImportRows([
      { category: 'x', question: 'q', answers: ['1', '2', '3', '4'], correctAnswer: 'd', explanation: 'e' },
      { category: 'x', question: 'q', answers: ['1', '2', '3', '4'], correctAnswer: '1', explanation: 'e' },
    ]);
    expect(rows[0]?.question?.correctAnswer).toBe('D');
    expect(rows[1]?.question?.correctAnswer).toBe('B');
    expect(rows[1]?.question?.difficulty).toBe('medium');
  });

  it('reports invalid rows with their index and field', () => {
    const rows = validateImportRows([
      { category: 'x', question: 'q', answers: ['1', '2', '3'], correctAnswer: 0, explanation: 'e' },
      { category: '', question: 'q', answers: ['1', '2', '3', '4'], correctAnswer: 9, explanation: 'e' },
      'not an object',
    ]);
    expect(rows.map((row) => row.ok)).toEqual([false, false, false]);
    expect(rows[0]?.issues.some((issue) => issue.field === 'answers')).toBe(true);
    expect(rows[1]?.issues.map((issue) => issue.field).sort()).toEqual(['category', 'correctAnswer']);
    expect(rows[2]?.index).toBe(2);
  });
});

describe('tags', () => {
  it('normalises and de-duplicates tags', () => {
    expect(normalizeTags([' TCP ', 'tcp', '', 'Layer 4'])).toEqual(['tcp', 'layer 4']);
    expect(parseTagList('OSI, TCP;Transport\nosi')).toEqual(['osi', 'tcp', 'transport']);
  });
});
