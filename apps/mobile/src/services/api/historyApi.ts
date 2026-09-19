import { toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

/** One day of the recent past, with everything the analysis charts. */
export interface DayHistory {
  /** Local calendar date, YYYY-MM-DD. */
  day: string;
  answered: number;
  correct: number;
  wrong: number;
  sessions: number;
  perfect: number;
  /** Beendete Duelle des Tages – die drei darunter summieren sich zu dieser Zahl. */
  duels: number;
  duelsWon: number;
  duelsDrawn: number;
  duelsLost: number;
}

/**
 * The last few days, one row each.
 *
 * Days with nothing on them come back as zeroes rather than being left out: a
 * gap in the row would be a jump in the chart, and "played nothing" is itself
 * something the week has to say.
 */
export async function fetchDailyHistory(days = 7): Promise<DayHistory[]> {
  const { data, error } = await supabase.rpc('get_my_daily_history', { p_days: days });
  if (error) throw toAppError(error, 'Der Verlauf konnte nicht geladen werden.');

  return (data ?? []).map((row) => ({
    day: row.day,
    answered: Number(row.answered),
    correct: Number(row.correct),
    wrong: Number(row.wrong),
    sessions: Number(row.sessions),
    perfect: Number(row.perfect),
    duels: Number(row.duels),
    // Mit `|| 0`, weil die drei Spalten juenger sind als der Rest: gegen eine
    // Datenbank, in der die Migration noch nicht liegt, kaeme sonst NaN heraus
    // und das Diagramm bliebe leer statt nur ungeteilt.
    duelsWon: Number(row.duels_won) || 0,
    duelsDrawn: Number(row.duels_drawn) || 0,
    duelsLost: Number(row.duels_lost) || 0,
  }));
}

/** Ein Punkt der Quotenlinie – ein Tag, eine Woche oder ein Monat. */
export interface TrendPoint {
  /** Beginn des Zeitabschnitts, YYYY-MM-DD. */
  bucketStart: string;
  answered: number;
  correct: number;
  /** null, wenn in diesem Abschnitt nichts beantwortet wurde. */
  accuracy: number | null;
}

/**
 * Der Verlauf der Trefferquote.
 *
 * Die Körnung bestimmt die Datenbank anhand des Zeitraums – bis zu einem Monat
 * je Tag, bis zu einem halben Jahr je Woche, darüber je Monat. Die Linie hat
 * damit immer eine Zahl von Punkten, die sich lesen lässt.
 */
export async function fetchAccuracyTrend(days: number): Promise<TrendPoint[]> {
  const { data, error } = await supabase.rpc('get_my_accuracy_trend', { p_days: days });
  if (error) throw toAppError(error, 'Der Verlauf konnte nicht geladen werden.');

  return (data ?? []).map((row) => ({
    bucketStart: row.bucket_start,
    answered: Number(row.answered),
    correct: Number(row.correct),
    accuracy: row.accuracy === null ? null : Number(row.accuracy),
  }));
}

/** Die sechs Zahlen unter "Insgesamt" – seit Beginn oder für einen Zeitraum. */
export interface Totals {
  answered: number;
  correct: number;
  wrong: number;
  sessions: number;
  perfect: number;
  duels: number;
  longestStreak: number;
}

const EMPTY_TOTALS: Totals = {
  answered: 0,
  correct: 0,
  wrong: 0,
  sessions: 0,
  perfect: 0,
  duels: 0,
  longestStreak: 0,
};

/**
 * Die Gesamtzahlen.
 *
 * `days = null` heißt "seit Beginn" und liest die geführten Werte; mit einem
 * Zeitraum wird gezählt. Beides derselbe Aufruf, damit die Kacheln nicht wissen
 * müssen, aus welcher Quelle ihre Zahl kommt.
 */
export async function fetchTotals(days: number | null): Promise<Totals> {
  const { data, error } = await supabase.rpc('get_my_totals', { p_days: days });
  if (error) throw toAppError(error, 'Die Zahlen konnten nicht geladen werden.');

  const row = (data ?? [])[0];
  if (!row) return EMPTY_TOTALS;

  return {
    answered: Number(row.answered),
    correct: Number(row.correct),
    wrong: Number(row.wrong),
    sessions: Number(row.sessions),
    perfect: Number(row.perfect),
    duels: Number(row.duels),
    longestStreak: Number(row.longest_streak),
  };
}

/**
 * Der Verlauf aller Kennzahlen für einen Zeitraum.
 *
 * Gebündelt nach Tag, Woche oder Monat – die Körnung bestimmt die Datenbank
 * anhand des Zeitraums, damit die Diagramme auf einer Seite gleich dicht sind.
 */
export async function fetchHistory(days: number): Promise<DayHistory[]> {
  const { data, error } = await supabase.rpc('get_my_history', { p_days: days });
  if (error) throw toAppError(error, 'Der Verlauf konnte nicht geladen werden.');

  return (data ?? []).map((row) => ({
    day: row.bucket_start,
    answered: Number(row.answered),
    correct: Number(row.correct),
    wrong: Number(row.wrong),
    sessions: Number(row.sessions),
    perfect: Number(row.perfect),
    duels: Number(row.duels),
    duelsWon: Number(row.duels_won) || 0,
    duelsDrawn: Number(row.duels_drawn) || 0,
    duelsLost: Number(row.duels_lost) || 0,
  }));
}

/**
 * Die Tage, an denen überhaupt gespielt wurde – für das Kalendergitter.
 *
 * Nur die gespielten: die Lücken dazwischen ergeben sich daraus, und das sind
 * ein paar hundert Daten statt eines Eintrags für jeden Tag des Jahres.
 */
export async function fetchPlayedDays(days: number): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('get_my_played_days', { p_days: days });
  if (error) throw toAppError(error, 'Die gespielten Tage konnten nicht geladen werden.');
  return new Set((data ?? []) as string[]);
}
