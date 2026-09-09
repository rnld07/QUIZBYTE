import { env } from '@/config/env';

/**
 * Central logging. Developer details never reach the UI; in production this is
 * the place to forward errors to a crash reporter.
 */
export const logger = {
  debug(message: string, ...details: unknown[]): void {
    if (env.appEnv !== 'production') console.debug(`[QuizByte] ${message}`, ...details);
  },
  warn(message: string, ...details: unknown[]): void {
    console.warn(`[QuizByte] ${message}`, ...details);
  },
  error(message: string, error?: unknown): void {
    console.error(`[QuizByte] ${message}`, error);
  },
};
