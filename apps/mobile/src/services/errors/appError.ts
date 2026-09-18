import { isNetworkError } from './network';

export type AppErrorCode =
  | 'network'
  | 'not_configured'
  | 'unauthorized'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'unknown';

/**
 * Error type used across the app. Carries a stable code plus a user-facing German
 * message; the original error is kept for logging only.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  override readonly cause: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

const USER_MESSAGES: Record<AppErrorCode, string> = {
  network: 'Keine Verbindung. Bitte prüfe dein Internet und versuche es erneut.',
  not_configured: 'Die App ist noch nicht mit einem Backend verbunden.',
  unauthorized: 'Deine Sitzung ist abgelaufen. Bitte starte die App neu.',
  not_found: 'Der Inhalt wurde nicht gefunden.',
  validation: 'Die Eingabe ist ungültig.',
  conflict: 'Dieser Wert ist bereits vergeben.',
  rate_limited: 'Zu viele Versuche. Warte einen Moment und probiere es dann erneut.',
  unknown: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
};

const MISSING_FUNCTION_MESSAGE =
  'Diese Funktion fehlt noch in der Datenbank. Bitte spiele die ausstehenden Migrationen ein (supabase db push).';

interface PostgrestLikeError {
  code?: string;
  message?: string;
  status?: number;
  details?: string;
}

function isPostgrestLike(error: unknown): error is PostgrestLikeError {
  return typeof error === 'object' && error !== null && ('code' in error || 'status' in error);
}

/** Maps any thrown value to an AppError with a stable code. */
export function toAppError(error: unknown, fallbackMessage?: string): AppError {
  if (error instanceof AppError) return error;

  if (isNetworkError(error)) {
    return new AppError('network', USER_MESSAGES.network, error);
  }

  if (isPostgrestLike(error)) {
    const status = error.status;
    const code = error.code ?? '';
    if (status === 401 || status === 403 || code === '42501' || code === 'PGRST301') {
      return new AppError('unauthorized', USER_MESSAGES.unauthorized, error);
    }
    // PostgREST reports an unknown function this way – almost always a
    // migration that has not been pushed yet.
    if (code === 'PGRST202') {
      return new AppError('not_configured', MISSING_FUNCTION_MESSAGE, error);
    }
    if (code === 'PGRST116' || status === 404) {
      return new AppError('not_found', USER_MESSAGES.not_found, error);
    }
    if (code === '23505') {
      return new AppError('conflict', USER_MESSAGES.conflict, error);
    }
    if (code === '23514' || code === '22P02') {
      return new AppError('validation', USER_MESSAGES.validation, error);
    }
  }

  return new AppError('unknown', fallbackMessage ?? USER_MESSAGES.unknown, error);
}

/** Convenience: user message for any error. */
export function getUserMessage(error: unknown, fallbackMessage?: string): string {
  return toAppError(error, fallbackMessage).message;
}
