/** Central TanStack Query keys – keeps invalidation consistent. */
export const queryKeys = {
  categories: ['categories'] as const,
  progress: ['progress'] as const,
  categoryStats: ['stats', 'categories'] as const,
  topicStats: ['stats', 'topics'] as const,
  profile: ['profile'] as const,
} as const;
