import { describe, expect, it } from 'vitest';

import {
  MEDALS,
  allMedalProgress,
  earnedMedalCount,
  medalProgress,
  medalTierFor,
} from './medals';
import type { MedalStats } from './medals';

const EMPTY: MedalStats = {
  answered: 0,
  correct: 0,
  longestStreak: 0,
  totalXp: 0,
  sessions: 0,
  perfect: 0,
  duels: 0,
  level: 1,
};

const medal = (id: string) => {
  const found = MEDALS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Keine Medaille "${id}"`);
  return found;
};

describe('medalTierFor', () => {
  it('gibt nichts zurück, solange die Bronzeschwelle nicht erreicht ist', () => {
    expect(medalTierFor(medal('curious'), 49)).toBeNull();
  });

  it('erkennt jede Stufe genau auf ihrer Schwelle', () => {
    const curious = medal('curious');
    expect(medalTierFor(curious, 50)).toBe('bronze');
    expect(medalTierFor(curious, 250)).toBe('silver');
    expect(medalTierFor(curious, 1000)).toBe('gold');
    expect(medalTierFor(curious, 5000)).toBe('platinum');
  });

  it('bleibt über der Platinschwelle bei Platin', () => {
    expect(medalTierFor(medal('curious'), 999_999)).toBe('platinum');
  });
});

describe('medalProgress', () => {
  it('zählt ab der zuletzt erreichten Schwelle, nicht ab null', () => {
    // 260 von 1000 wäre ab null gerechnet ein Viertel – tatsächlich ist es
    // gerade über Silber, also fast nichts auf dem Weg zu Gold.
    const progress = medalProgress(medal('curious'), { ...EMPTY, answered: 260 });
    expect(progress.tier).toBe('silver');
    expect(progress.nextTarget).toBe(1000);
    expect(progress.percent).toBe(1);
  });

  it('führt von Gold weiter zu Platin', () => {
    const progress = medalProgress(medal('flawless'), { ...EMPTY, perfect: 80 });
    expect(progress.tier).toBe('gold');
    expect(progress.nextTarget).toBe(250);
  });

  it('steht bei Platin auf 100 und kennt kein nächstes Ziel', () => {
    const progress = medalProgress(medal('flawless'), { ...EMPTY, perfect: 300 });
    expect(progress.tier).toBe('platinum');
    expect(progress.nextTarget).toBeNull();
    expect(progress.percent).toBe(100);
  });

  it('nennt vor der ersten Stufe die Bronzeaufgabe', () => {
    const progress = medalProgress(medal('duellist'), EMPTY);
    expect(progress.tier).toBeNull();
    expect(progress.nextTarget).toBe(5);
    expect(progress.requirement).toBe('5 Duelle austragen');
    expect(progress.percent).toBe(0);
  });

  it('nennt bei Platin die erfüllte Aufgabe statt gar keiner', () => {
    const progress = medalProgress(medal('duellist'), { ...EMPTY, duels: 600 });
    expect(progress.requirement).toBe('500 Duelle austragen');
  });

  it('behandelt einen negativen Stand wie null', () => {
    const progress = medalProgress(medal('collector'), { ...EMPTY, totalXp: -50 });
    expect(progress.value).toBe(0);
    expect(progress.percent).toBe(0);
  });

  it('schreibt die eine fehlerfreie Runde aus', () => {
    expect(medalProgress(medal('flawless'), EMPTY).requirement).toBe('Ein Quiz fehlerfrei beenden');
  });
});

describe('allMedalProgress', () => {
  it('liefert jede Medaille in Katalogreihenfolge', () => {
    expect(allMedalProgress(EMPTY).map((entry) => entry.medal.id)).toEqual(MEDALS.map((entry) => entry.id));
  });
});

describe('earnedMedalCount', () => {
  it('zählt ein frisches Konto als leer', () => {
    expect(earnedMedalCount(EMPTY)).toBe(0);
  });

  it('zählt die Medaille, nicht die Stufe', () => {
    const stats: MedalStats = { ...EMPTY, answered: 1200, correct: 30 };
    // Wissensdurst steht auf Gold, Treffsicher auf Bronze – zwei Medaillen.
    expect(earnedMedalCount(stats)).toBe(2);
  });
});

describe('der Katalog', () => {
  it('hat aufsteigende Schwellen', () => {
    for (const entry of MEDALS) {
      expect(entry.tiers[0]).toBeLessThan(entry.tiers[1]);
      expect(entry.tiers[1]).toBeLessThan(entry.tiers[2]);
      expect(entry.tiers[2]).toBeLessThan(entry.tiers[3]);
    }
  });

  it('setzt Platin deutlich über Gold', () => {
    // Der Sinn der Stufe: nicht der nächste Schritt, sondern der, für den man
    // die App wirklich benutzt haben muss. Mindestens das Doppelte von Gold.
    for (const entry of MEDALS) {
      expect(entry.tiers[3]).toBeGreaterThanOrEqual(entry.tiers[2] * 2);
    }
  });

  it('vergibt jede Id nur einmal', () => {
    expect(new Set(MEDALS.map((entry) => entry.id)).size).toBe(MEDALS.length);
  });
});
