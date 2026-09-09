export type AppEnvironment = 'development' | 'staging' | 'production';

export const APP_NAME = 'QuizByte';

/** Parses an environment string coming from env variables; defaults to development. */
export function parseAppEnvironment(value: string | undefined): AppEnvironment {
  switch (value) {
    case 'production':
    case 'staging':
      return value;
    default:
      return 'development';
  }
}
