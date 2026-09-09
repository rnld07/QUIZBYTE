/** Heuristics for fetch-level failures thrown by supabase-js / fetch. */
export function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const message = String((error as { message?: unknown }).message ?? '').toLowerCase();
  const name = String((error as { name?: unknown }).name ?? '');
  return (
    name === 'AuthRetryableFetchError' ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('networkerror')
  );
}
