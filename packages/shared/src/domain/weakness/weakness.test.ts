import { describe, expect, it } from 'vitest';

import type { TopicStat } from '../../types/domain';
import { buildTrainingFocus, detectWeaknesses, rankTopics } from './weakness';

const stat = (key: string, attempts: number, correct: number, kind: TopicStat['kind'] = 'subcategory'): TopicStat => ({
  kind,
  key,
  label: key,
  attempts,
  correct,
});

describe('detectWeaknesses', () => {
  it('returns nothing without enough data', () => {
    const report = detectWeaknesses([stat('OSI', 1, 0), stat('TCP', 2, 0)]);
    expect(report.weaknesses).toEqual([]);
    expect(report.strengths).toEqual([]);
    expect(report.hasEnoughData).toBe(false);
  });

  it('identifies weaknesses and strengths with enough attempts', () => {
    const report = detectWeaknesses([
      stat('OSI', 5, 1), // 20 %
      stat('TCP', 4, 2), // 50 %
      stat('DNS', 6, 6), // 100 %
      stat('VLAN', 3, 3), // 100 %
      stat('NAT', 10, 7), // 70 % → neither weak nor strong
    ]);
    expect(report.hasEnoughData).toBe(true);
    expect(report.weaknesses.map((t) => t.key)).toEqual(['OSI', 'TCP']);
    expect(report.weaknesses[0]?.accuracy).toBe(20);
    expect(report.strengths.map((t) => t.key)).toEqual(['DNS', 'VLAN']);
  });

  it('breaks ties by evidence (more attempts first)', () => {
    const report = detectWeaknesses([stat('A', 3, 1), stat('B', 9, 3)]);
    expect(report.weaknesses.map((t) => t.key)).toEqual(['B', 'A']);
  });

  it('limits the number of topics and honours custom options', () => {
    const stats = Array.from({ length: 8 }, (_, i) => stat(`T${i}`, 4, 1));
    const report = detectWeaknesses(stats, { maxTopics: 3 });
    expect(report.weaknesses).toHaveLength(3);

    const strict = detectWeaknesses([stat('X', 2, 0)], { minAttempts: 2 });
    expect(strict.weaknesses.map((t) => t.key)).toEqual(['X']);
  });

  it('can be restricted to topic kinds', () => {
    const report = detectWeaknesses([stat('cat-1', 5, 1, 'category'), stat('tag-1', 5, 1, 'tag')], { kinds: ['tag'] });
    expect(report.weaknesses.map((t) => t.key)).toEqual(['tag-1']);
  });
});

describe('rankTopics', () => {
  it('sorts by accuracy descending and keeps unanswered topics out', () => {
    const ranked = rankTopics([stat('A', 4, 2), stat('B', 0, 0), stat('C', 5, 5)]);
    expect(ranked.map((t) => t.key)).toEqual(['C', 'A']);
  });
});

describe('buildTrainingFocus', () => {
  it('maps weaknesses to filters by kind', () => {
    const report = detectWeaknesses([
      stat('OSI', 4, 1, 'subcategory'),
      stat('TCP', 4, 1, 'tag'),
      stat('cat-1', 4, 1, 'category'),
    ]);
    expect(buildTrainingFocus(report)).toEqual({
      subcategories: ['OSI'],
      tags: ['TCP'],
      categoryIds: ['cat-1'],
    });
  });
});
