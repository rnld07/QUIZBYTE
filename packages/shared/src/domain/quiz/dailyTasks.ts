/** What a task asks of you. The key is what the server counts. */
export type DailyTaskKey =
  | 'answer_questions'
  | 'correct_answers'
  | 'finish_sessions'
  | 'play_daily'
  | 'perfect_round'
  | 'blitz_round';

export interface DailyTaskDefinition {
  key: DailyTaskKey;
  name: string;
  /** How the goal reads with its target filled in. */
  describe: (target: number) => string;
  /** Ionicons name, drawn when no custom symbol is registered. */
  icon: string;
  /** How many of the thing are needed. Always 1 for the yes/no tasks. */
  target: number;
  /** What finishing it pays. Mirrored by `daily_task_xp()` in SQL. */
  xp: number;
}

/**
 * Everything a day can ask for.
 *
 * Deliberately small and countable: each one is a figure the server already has
 * from the attempts and sessions of that day, so nothing new has to be tracked
 * while you play – the progress is simply read back when the list is opened.
 */
export const DAILY_TASK_DEFINITIONS: readonly DailyTaskDefinition[] = [
  {
    key: 'answer_questions',
    name: 'Dranbleiben',
    describe: (target) => `Beantworte ${target} Fragen`,
    icon: 'help-circle',
    target: 15,
    xp: 25,
  },
  {
    key: 'correct_answers',
    name: 'Treffsicher',
    describe: (target) => `${target} richtige Antworten`,
    icon: 'checkmark-circle',
    target: 10,
    xp: 30,
  },
  {
    key: 'finish_sessions',
    name: 'Durchgezogen',
    describe: (target) => `Spiele ${target} Runden zu Ende`,
    icon: 'flag',
    target: 3,
    xp: 25,
  },
  {
    key: 'play_daily',
    name: 'Tagesfrage',
    describe: () => 'Spiele das Daily Quiz',
    icon: 'calendar',
    target: 1,
    xp: 20,
  },
  {
    key: 'perfect_round',
    name: 'Makellos',
    describe: () => 'Beende eine Runde ohne Fehler',
    icon: 'ribbon',
    target: 1,
    xp: 35,
  },
  {
    key: 'blitz_round',
    name: 'Auf die Uhr',
    describe: () => 'Spiele eine Blitz-Runde',
    icon: 'flash',
    target: 1,
    xp: 25,
  },
];

/** How many of them a day carries. */
export const DAILY_TASK_COUNT = 3;

export function dailyTaskByKey(key: string): DailyTaskDefinition | undefined {
  return DAILY_TASK_DEFINITIONS.find((task) => task.key === key);
}

/** The state of one task for one day. */
export interface DailyTaskProgress {
  key: DailyTaskKey;
  /** How far along, capped at the target. */
  progress: number;
  target: number;
  /** The XP has been collected – a task pays once. */
  claimed: boolean;
}

export function isDailyTaskDone(task: DailyTaskProgress): boolean {
  return task.progress >= task.target;
}

/** Ready to pay out: finished, and not yet collected. */
export function isDailyTaskClaimable(task: DailyTaskProgress): boolean {
  return isDailyTaskDone(task) && !task.claimed;
}

/** What is still there to collect today. */
export function unclaimedDailyTaskXp(tasks: readonly DailyTaskProgress[]): number {
  return tasks.filter(isDailyTaskClaimable).reduce((sum, task) => sum + (dailyTaskByKey(task.key)?.xp ?? 0), 0);
}
