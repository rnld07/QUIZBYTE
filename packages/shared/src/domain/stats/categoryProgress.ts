import type { Category } from '../../types/domain';
import { computeAccuracy } from './accuracy';

/** The category fields the progress list needs. */
export type CategoryLike = Pick<Category, 'id' | 'name' | 'slug' | 'icon' | 'accentColor' | 'sortOrder'>;

/** A per-category stat row as returned by `get_my_category_stats` (`key` = category id). */
export interface CategoryStatLike {
  key: string;
  attempts: number;
  correct: number;
}

export interface CategoryProgressRow {
  id: string;
  label: string;
  slug: string;
  icon: string | null;
  accentColor: string | null;
  attempts: number;
  correct: number;
  /** Accuracy 0–100; 0 while the category has not been played. */
  accuracy: number;
  /** False while the user has not answered a single question here. */
  played: boolean;
}

/**
 * Joins every category with the user's stats so the progress list can show all
 * of them – not just the ones that have already been played.
 *
 * Order: played categories first (best accuracy first, ties broken by evidence),
 * then the untouched ones in their configured order.
 */
export function mergeCategoryProgress(categories: CategoryLike[], stats: CategoryStatLike[]): CategoryProgressRow[] {
  const byCategoryId = new Map(stats.map((stat) => [stat.key, stat]));

  const rows: CategoryProgressRow[] = categories.map((category) => {
    const stat = byCategoryId.get(category.id);
    const attempts = stat?.attempts ?? 0;
    const correct = stat?.correct ?? 0;
    return {
      id: category.id,
      label: category.name,
      slug: category.slug,
      icon: category.icon,
      accentColor: category.accentColor,
      attempts,
      correct,
      accuracy: computeAccuracy(correct, attempts),
      played: attempts > 0,
    };
  });

  const order = new Map(categories.map((category, index) => [category.id, category.sortOrder ?? index]));

  return rows.sort((a, b) => {
    if (a.played !== b.played) return a.played ? -1 : 1;
    if (a.played) {
      return b.accuracy - a.accuracy || b.attempts - a.attempts || a.label.localeCompare(b.label);
    }
    return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0) || a.label.localeCompare(b.label);
  });
}
