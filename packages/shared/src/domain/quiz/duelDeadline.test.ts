import { describe, expect, it } from 'vitest';

import { DUEL_DEADLINE_DAYS, duelDaysLeft, duelDeadlineLabel, duelExpired } from './duelDeadline';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const created = Date.UTC(2026, 8, 13, 12, 0, 0);

describe('duel deadline', () => {
  it('gives three days', () => {
    expect(DUEL_DEADLINE_DAYS).toBe(3);
    expect(duelDaysLeft(created, created)).toBe(3);
  });

  it('counts down day by day', () => {
    expect(duelDaysLeft(created, created + DAY)).toBe(2);
    expect(duelDaysLeft(created, created + 2 * DAY)).toBe(1);
  });

  it('rounds up – an hour left is still a day', () => {
    expect(duelDaysLeft(created, created + 3 * DAY - HOUR)).toBe(1);
  });

  it('is over at the deadline itself, not a moment later', () => {
    expect(duelExpired(created, created + 3 * DAY - 1)).toBe(false);
    expect(duelExpired(created, created + 3 * DAY)).toBe(true);
    expect(duelDaysLeft(created, created + 3 * DAY)).toBe(0);
  });

  it('switches to hours on the last day', () => {
    expect(duelDeadlineLabel(created, created)).toBe('Noch 3 Tage');
    expect(duelDeadlineLabel(created, created + 2 * DAY)).toBe('Noch 24 Stunden');
    expect(duelDeadlineLabel(created, created + 3 * DAY - 2 * HOUR)).toBe('Noch 2 Stunden');
    expect(duelDeadlineLabel(created, created + 3 * DAY - HOUR / 2)).toBe('Noch 1 Stunde');
  });

  it('says so once it is gone', () => {
    expect(duelDeadlineLabel(created, created + 4 * DAY)).toBe('Abgelaufen');
  });
});
