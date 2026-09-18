/**
 * Categories that are already visible in the app but not playable yet.
 * Their tile is dimmed, badged "Coming soon" and opens a hint instead of a quiz.
 */
export const COMING_SOON_CATEGORY_SLUGS: readonly string[] = ['betriebssysteme'];

export function isComingSoon(slug: string | null | undefined): boolean {
  return slug ? COMING_SOON_CATEGORY_SLUGS.includes(slug) : false;
}
