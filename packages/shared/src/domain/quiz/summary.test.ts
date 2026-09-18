import { describe, expect, it } from 'vitest';

import type { AttemptResult, QuizQuestion } from '../../types/domain';
import { summarizeSession } from './summary';

const question = (id: string, subcategory: string | null): QuizQuestion => ({
  id,
  categoryId: 'cat',
  categoryName: 'Netzwerke',
  categorySlug: 'netzwerke',
  categoryIcon: 'git-network',
  categoryAccentColor: '#06B6D4',
  subcategory,
  questionText: `Frage ${id}`,
  answers: { A: 'a', B: 'b', C: 'c', D: 'd' },
  correctAnswer: 'A',
  explanation: 'x',
  difficulty: 'easy',
  tags: [],
  imageUrl: null,
  audioUrl: null,
  status: 'published',
  requiresPro: false,
});

const attempt = (questionId: string, isCorrect: boolean): AttemptResult => ({
  questionId,
  selectedAnswer: isCorrect ? 'A' : 'B',
  isCorrect,
  responseTimeMs: 1000,
  xpEarned: isCorrect ? 10 : 2,
});

describe('summarizeSession', () => {
  it('computes totals and xp', () => {
    const questions = [question('1', 'OSI'), question('2', 'OSI'), question('3', 'DNS')];
    const summary = summarizeSession(questions, [attempt('1', true), attempt('2', false), attempt('3', true)]);
    expect(summary.totalQuestions).toBe(3);
    expect(summary.answered).toBe(3);
    expect(summary.correct).toBe(2);
    expect(summary.accuracy).toBe(67);
    expect(summary.answerXp).toBe(22);
  });

  it('reports strongest and weakest topics when at least two topics were played', () => {
    const questions = [question('1', 'OSI'), question('2', 'OSI'), question('3', 'DNS'), question('4', 'DNS')];
    const summary = summarizeSession(questions, [
      attempt('1', false),
      attempt('2', false),
      attempt('3', true),
      attempt('4', true),
    ]);
    expect(summary.strongestTopics.map((topic) => topic.label)).toEqual(['DNS']);
    expect(summary.weakestTopics.map((topic) => topic.label)).toEqual(['OSI']);
  });

  it('does not report topics when only one topic was played', () => {
    const questions = [question('1', 'OSI'), question('2', 'OSI')];
    const summary = summarizeSession(questions, [attempt('1', true), attempt('2', false)]);
    expect(summary.strongestTopics).toEqual([]);
    expect(summary.weakestTopics).toEqual([]);
  });

  it('falls back to the category name when a question has no subcategory', () => {
    const questions = [question('1', null), question('2', 'DNS')];
    const summary = summarizeSession(questions, [attempt('1', false), attempt('2', true)]);
    expect(summary.weakestTopics.map((t) => t.label)).toEqual(['Netzwerke']);
  });

  it('reports no weakest topic when every topic is equally good', () => {
    const questions = [question('1', 'OSI'), question('2', 'DNS')];
    const summary = summarizeSession(questions, [attempt('1', true), attempt('2', true)]);
    expect(summary.weakestTopics).toEqual([]);
    expect(summary.strongestTopics.map((t) => t.label)).toEqual(['DNS', 'OSI']);
  });

  it('lists every topic that shares the top spot', () => {
    const questions = [question('1', 'OSI'), question('2', 'DNS'), question('3', 'ARP')];
    const summary = summarizeSession(questions, [attempt('1', true), attempt('2', true), attempt('3', false)]);
    expect(summary.strongestTopics.map((t) => t.label).sort()).toEqual(['DNS', 'OSI']);
    expect(summary.weakestTopics.map((t) => t.label)).toEqual(['ARP']);
  });

  it('lists every topic that shares the bottom spot', () => {
    const questions = [question('1', 'OSI'), question('2', 'DNS'), question('3', 'ARP')];
    const summary = summarizeSession(questions, [attempt('1', true), attempt('2', false), attempt('3', false)]);
    expect(summary.weakestTopics.map((t) => t.label).sort()).toEqual(['ARP', 'DNS']);
  });

  it('handles abandoned sessions with no attempts', () => {
    const summary = summarizeSession([question('1', 'OSI')], []);
    expect(summary.answered).toBe(0);
    expect(summary.accuracy).toBe(0);
  });
});
