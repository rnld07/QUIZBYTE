/**
 * Was eine Medaille misst.
 *
 * Bewusst die Zahlen, die der Fortschritt ohnehin fuehrt: eine Medaille, fuer
 * die erst etwas mitgeschrieben werden muesste, wuerde fuer alle, die die App
 * schon benutzen, bei null anfangen.
 */
export type MedalMetric =
  | 'answered'
  | 'correct'
  | 'longestStreak'
  | 'totalXp'
  | 'sessions'
  | 'perfect'
  | 'duels'
  | 'level';

/** Die vier Stufen jeder Medaille. */
export type MedalTier = 'bronze' | 'silver' | 'gold' | 'platinum';

/** Von unten nach oben – die Reihenfolge, in der sie verdient werden. */
export const MEDAL_TIERS: readonly MedalTier[] = ['bronze', 'silver', 'gold', 'platinum'];

export interface Medal {
  id: string;
  /** Der Name auf der Medaille. */
  name: string;
  metric: MedalMetric;
  /**
   * Die Aufgabe, mit der Zahl der jeweiligen Stufe eingesetzt.
   *
   * Eine Funktion statt dreier fertiger Saetze: „10 Quiz beendet" und
   * „200 Quiz beendet" sind derselbe Satz, und drei Kopien davon waeren drei
   * Stellen, an denen die Formulierung auseinanderlaufen kann.
   */
  describe: (target: number) => string;
  /**
   * Bronze, Silber, Gold, Platin – aufsteigend.
   *
   * Platin liegt absichtlich um ein Vielfaches ueber Gold und nicht eine
   * Stufe weiter: Gold ist das Ende dessen, was sich nebenbei ergibt, Platin
   * ist das, wofuer man die App ein Jahr lang benutzt haben muss.
   */
  tiers: readonly [number, number, number, number];
}

/**
 * Alle Medaillen.
 *
 * Acht Stueck, und jede haengt an einer anderen Art zu spielen: wer nur das
 * Tagesquiz macht, kommt an andere heran als wer Duelle spielt. Die
 * Bronzestufen sind absichtlich niedrig – die erste Medaille soll in der ersten
 * Woche fallen, sonst ist die Seite monatelang nur eine Liste von Absagen.
 */
export const MEDALS: readonly Medal[] = [
  {
    id: 'curious',
    name: 'Wissensdurst',
    metric: 'answered',
    describe: (target) => `${target.toLocaleString('de-DE')} Fragen beantworten`,
    tiers: [50, 250, 1000, 5000],
  },
  {
    id: 'sharpshooter',
    name: 'Treffsicher',
    metric: 'correct',
    describe: (target) => `${target.toLocaleString('de-DE')} Fragen richtig`,
    tiers: [25, 150, 600, 3000],
  },
  {
    id: 'persistent',
    name: 'Am Ball',
    metric: 'longestStreak',
    describe: (target) => `${target} Tage in Folge spielen`,
    tiers: [3, 7, 30, 180],
  },
  {
    id: 'finisher',
    name: 'Durchgezogen',
    metric: 'sessions',
    describe: (target) => `${target.toLocaleString('de-DE')} Quiz beenden`,
    tiers: [10, 50, 200, 1000],
  },
  {
    id: 'flawless',
    name: 'Makellos',
    metric: 'perfect',
    describe: (target) => (target === 1 ? 'Ein Quiz fehlerfrei beenden' : `${target} Quiz fehlerfrei beenden`),
    tiers: [1, 10, 50, 250],
  },
  {
    id: 'duellist',
    name: 'Duellant',
    metric: 'duels',
    describe: (target) => `${target} Duelle austragen`,
    tiers: [5, 25, 100, 500],
  },
  {
    id: 'collector',
    name: 'Sammler',
    metric: 'totalXp',
    describe: (target) => `${target.toLocaleString('de-DE')} XP sammeln`,
    tiers: [1000, 10_000, 50_000, 250_000],
  },
  {
    id: 'climber',
    name: 'Aufsteiger',
    metric: 'level',
    // Level 100 ist die Spitze – dieselbe Marke, an der auch der Platinrahmen haengt.
    describe: (target) => `Level ${target} erreichen`,
    tiers: [10, 25, 50, 100],
  },
];

/** Die Zahlen, aus denen sich der Medaillenstand ergibt. */
export type MedalStats = Record<MedalMetric, number>;

export interface MedalProgress {
  medal: Medal;
  /** Der aktuelle Stand der gemessenen Zahl. */
  value: number;
  /** Die hoechste erreichte Stufe, oder `null` solange keine erreicht ist. */
  tier: MedalTier | null;
  /** Die Schwelle der naechsten Stufe, oder `null` ab Platin. */
  nextTarget: number | null;
  /** Die Aufgabe, die gerade ansteht – bei Platin die, die erfuellt wurde. */
  requirement: string;
  /** 0–100 auf dem Weg zur naechsten Stufe; ab Platin 100. */
  percent: number;
}

/** Die hoechste Stufe, die dieser Stand erreicht – oder `null`. */
export function medalTierFor(medal: Medal, value: number): MedalTier | null {
  let reached: MedalTier | null = null;
  medal.tiers.forEach((target, index) => {
    if (value >= target) reached = MEDAL_TIERS[index] ?? null;
  });
  return reached;
}

/**
 * Wo eine Medaille steht.
 *
 * Der Fortschrittsanteil zaehlt ab der zuletzt erreichten Schwelle, nicht ab
 * null: wer 260 von 1000 Fragen hat, ist nicht zu einem Viertel bei Gold,
 * sondern gerade erst ueber Silber – und ein Balken, der bei jeder neuen Stufe
 * fast voll startet, sagt nichts mehr.
 */
export function medalProgress(medal: Medal, stats: MedalStats): MedalProgress {
  const value = Math.max(0, stats[medal.metric]);
  const tier = medalTierFor(medal, value);
  const index = tier ? MEDAL_TIERS.indexOf(tier) : -1;
  const nextTarget = index < MEDAL_TIERS.length - 1 ? medal.tiers[index + 1] ?? null : null;
  const floor = index >= 0 ? medal.tiers[index] ?? 0 : 0;

  const percent =
    nextTarget === null
      ? 100
      : Math.max(0, Math.min(100, Math.round(((value - floor) / (nextTarget - floor)) * 100)));

  return {
    medal,
    value,
    tier,
    nextTarget,
    requirement: medal.describe(nextTarget ?? medal.tiers[MEDAL_TIERS.length - 1] ?? 0),
    percent,
  };
}

/** Alle Medaillen mit ihrem Stand, in Katalogreihenfolge. */
export function allMedalProgress(stats: MedalStats): MedalProgress[] {
  return MEDALS.map((medal) => medalProgress(medal, stats));
}

/**
 * Wie viele Medaillen ueberhaupt verdient sind.
 *
 * Gezaehlt wird die Medaille, nicht die Stufe: „3 / 8" neben der Ueberschrift
 * meint drei Medaillen im Regal, gleich in welcher Farbe.
 */
export function earnedMedalCount(stats: MedalStats): number {
  return MEDALS.filter((medal) => medalTierFor(medal, Math.max(0, stats[medal.metric])) !== null).length;
}
