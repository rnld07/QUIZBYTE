import { weaknessConfig } from '../../config/weakness';
import type { TopicStat } from '../../types/domain';
import { computeAccuracy } from '../stats/accuracy';

export interface TopicInsight extends TopicStat {
  /** Accuracy 0–100. */
  accuracy: number;
}

export interface WeaknessReport {
  /** Topics with enough data and low accuracy, weakest first. */
  weaknesses: TopicInsight[];
  /** Topics with enough data and high accuracy, strongest first. */
  strengths: TopicInsight[];
  /** True when at least one topic had enough attempts to be judged. */
  hasEnoughData: boolean;
}

export interface WeaknessDetectorOptions {
  minAttempts?: number;
  weaknessThreshold?: number;
  strengthThreshold?: number;
  maxTopics?: number;
  /** Restrict the report to certain topic kinds (default: all). */
  kinds?: TopicStat['kind'][];
}

/**
 * Pluggable interface so the detection strategy can be swapped later
 * (e.g. time-weighted or Bayesian scoring) without touching the UI.
 */
export type WeaknessDetector = (stats: TopicStat[], options?: WeaknessDetectorOptions) => WeaknessReport;

function toInsight(stat: TopicStat): TopicInsight {
  return { ...stat, accuracy: computeAccuracy(stat.correct, stat.attempts) };
}

/** Most specific first – a category label beats the tag that repeats it. */
const KIND_RANK: Record<TopicStat['kind'], number> = { category: 0, subcategory: 1, tag: 2 };

/**
 * Drops topics that only repeat another one under a different kind.
 *
 * A category "Netzwerke" and a tag "netzwerke" describe the same thing to the
 * user, so listing both looks like a bug. Entries are compared on the trimmed,
 * lower-cased label; the one with the most evidence wins, ties go to the
 * category over the subcategory over the tag.
 */
export function dedupeByLabel(topics: TopicInsight[]): TopicInsight[] {
  const best = new Map<string, TopicInsight>();

  for (const topic of topics) {
    const key = topic.label.trim().toLowerCase();
    const current = best.get(key);
    if (!current) {
      best.set(key, topic);
      continue;
    }
    const better = topic.attempts > current.attempts || (topic.attempts === current.attempts && KIND_RANK[topic.kind] < KIND_RANK[current.kind]);
    if (better) best.set(key, topic);
  }

  return [...best.values()];
}

/**
 * Default weakness detector.
 *
 * A topic is only judged once it has at least `minAttempts` attempts, so a single
 * unlucky question never produces a "weakness". Weaknesses are ordered by accuracy
 * ascending (ties: more attempts first – more evidence), strengths by accuracy
 * descending (ties: more attempts first).
 */
export const detectWeaknesses: WeaknessDetector = (stats, options = {}) => {
  const minAttempts = options.minAttempts ?? weaknessConfig.MIN_ATTEMPTS;
  const weaknessThreshold = options.weaknessThreshold ?? weaknessConfig.WEAKNESS_ACCURACY_THRESHOLD;
  const strengthThreshold = options.strengthThreshold ?? weaknessConfig.STRENGTH_ACCURACY_THRESHOLD;
  const maxTopics = options.maxTopics ?? weaknessConfig.MAX_TOPICS;
  const kinds = options.kinds;

  const judged = dedupeByLabel(
    stats.filter((stat) => stat.attempts >= minAttempts && (!kinds || kinds.includes(stat.kind))).map(toInsight),
  );

  const weaknesses = judged
    .filter((topic) => topic.accuracy < weaknessThreshold)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts || a.label.localeCompare(b.label))
    .slice(0, maxTopics);

  const strengths = judged
    .filter((topic) => topic.accuracy >= strengthThreshold)
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts || a.label.localeCompare(b.label))
    .slice(0, maxTopics);

  return { weaknesses, strengths, hasEnoughData: judged.length > 0 };
};

/**
 * Sorts all topics with enough data from weakest to strongest – used for the
 * "Leistung nach Kategorien" list where every judged topic is shown.
 */
export function rankTopics(stats: TopicStat[], minAttempts = 1): TopicInsight[] {
  return stats
    .filter((stat) => stat.attempts >= minAttempts)
    .map(toInsight)
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts || a.label.localeCompare(b.label));
}

export interface TrainingFocus {
  subcategories: string[];
  tags: string[];
  categoryIds: string[];
}

/**
 * Turns a weakness report into the concrete filters a training session needs.
 * Subcategories and tags are the most specific signal, categories are the fallback.
 */
export function buildTrainingFocus(report: WeaknessReport): TrainingFocus {
  const focus: TrainingFocus = { subcategories: [], tags: [], categoryIds: [] };
  for (const topic of report.weaknesses) {
    if (topic.kind === 'subcategory') focus.subcategories.push(topic.key);
    else if (topic.kind === 'tag') focus.tags.push(topic.key);
    else focus.categoryIds.push(topic.key);
  }
  return focus;
}
