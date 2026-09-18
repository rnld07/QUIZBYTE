import { DAILY_TASK_DEFINITIONS, WHEEL_SEGMENTS, xpConfig } from '@quizbyte/shared';

import { statIcon } from '@/content/statIcons';

import { InfoDialog, InfoOverlay } from '../ui';
import type { InfoContent } from '../ui';

const {
  CORRECT_ANSWER_XP: correct,
  WRONG_ANSWER_XP: wrong,
  DAILY_XP_MULTIPLIER: dailyFactor,
  DUEL_XP_MULTIPLIER: duelFactor,
  DUEL_WIN_XP: duelWin,
} = xpConfig;

/*
  Read off the definitions rather than written out: the tasks and the wheel are
  lists that will grow, and a sentence naming their range by hand would be
  wrong the first time either of them changes.
*/
const taskXp = DAILY_TASK_DEFINITIONS.map((task) => task.xp);
const taskLow = Math.min(...taskXp);
const taskHigh = Math.max(...taskXp);

const wheelXp = WHEEL_SEGMENTS.map((segment) => segment.xp);
const wheelLow = Math.min(...wheelXp);
const wheelHigh = Math.max(...wheelXp);

/**
 * The XP explainer. The numbers come straight from `xpConfig`, so the text can
 * never drift away from what the app actually awards.
 */
export const xpInfoContent: InfoContent = {
  eyebrow: 'XP-Verteilung',
  title: 'So bekommst du XP',
  icon: 'flash-outline',
  // The same picture the XP figure wears everywhere else, when one is set.
  symbol: statIcon('xp'),
  message: [
    `Richtig beantwortet: ${correct.easy} XP (leicht), ${correct.medium} XP (mittel), ${correct.hard} XP (schwer).`,
    `Falsch beantwortet: ${wrong} XP.`,
    `Das Daily Quiz zahlt das ${dailyFactor}-Fache – aber nur beim ersten Durchlauf des Tages.`,
    `Im Duell gibt es das ${String(duelFactor).replace('.', ',')}-Fache pro richtiger Antwort, und wer gewinnt, bekommt ${duelWin} XP obendrauf. Bei einem Unentschieden bekommt den Bonus niemand.`,
    `Tagesaufgaben zahlen ${taskLow} bis ${taskHigh} XP, sobald du sie abholst.`,
    `Das Glücksrad nach einem fehlerfreien Daily Quiz dreht zwischen ${wheelLow} und ${wheelHigh} XP – meistens zwischen 5 und 30.`,
    'Eine Frage, die du schon einmal richtig hattest, gibt keine XP mehr. Im Daily Quiz zählt sie trotzdem: ' +
      'die fünf Fragen des Tages suchst du dir nicht aus.',
  ].join('\n\n'),
};

/** Just the payout per difficulty – used next to the difficulty setting. */
export const difficultyXpContent: InfoContent = {
  eyebrow: 'XP-Verteilung',
  title: 'XP nach Schwierigkeit',
  icon: 'flash-outline',
  message: [`Leicht: ${correct.easy} XP`, `Mittel: ${correct.medium} XP`, `Schwer: ${correct.hard} XP`].join('\n'),
};

/** Dialog for the difficulty setting on a plain screen. */
export function DifficultyXpDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return <InfoDialog visible={visible} onClose={onClose} {...difficultyXpContent} />;
}

/**
 * Overlay version for the difficulty setting – for the quiz settings, which are
 * themselves a modal. A second `Modal` on top of an open one does not reliably
 * show, so that case needs a plain overlay inside the existing one.
 */
export function DifficultyXpOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return <InfoOverlay visible={visible} onClose={onClose} {...difficultyXpContent} />;
}

/** Standalone dialog – for screens that are not already inside a modal. */
export function XpInfoDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return <InfoDialog visible={visible} onClose={onClose} {...xpInfoContent} />;
}

/** Overlay version – for opening from inside another dialog. */
export function XpInfoOverlay({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return <InfoOverlay visible={visible} onClose={onClose} {...xpInfoContent} />;
}
