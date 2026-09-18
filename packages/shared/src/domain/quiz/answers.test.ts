import { describe, expect, it } from 'vitest';

import { ANSWER_KEYS } from '../../types/domain';
import { answerOrder } from './answers';

describe('answerOrder', () => {
  it('returns every answer exactly once', () => {
    const order = answerOrder('question-1', 'session-1');
    expect([...order].sort()).toEqual([...ANSWER_KEYS].sort());
  });

  it('is stable for the same question and session', () => {
    expect(answerOrder('question-1', 'session-1')).toEqual(answerOrder('question-1', 'session-1'));
  });

  it('differs between questions', () => {
    const orders = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map((id) => answerOrder(id, 's').join(''));
    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  it('differs between sessions for the same question', () => {
    const orders = ['s1', 's2', 's3', 's4', 's5', 's6'].map((seed) => answerOrder('q1', seed).join(''));
    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  it('does not always start with A', () => {
    const firsts = new Set(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'].map((id) => answerOrder(id)[0]));
    expect(firsts.size).toBeGreaterThan(1);
  });

  it('works without a session seed', () => {
    expect([...answerOrder('question-1')].sort()).toEqual([...ANSWER_KEYS].sort());
  });
});
