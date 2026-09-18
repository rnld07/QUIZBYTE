export type { Database, Enums, FunctionArgs, FunctionReturns, Json, Tables, TablesInsert, TablesUpdate } from './database.types';
export { Constants } from './database.types';

/** Storage bucket names – must match supabase/migrations/*_storage.sql. */
export const STORAGE_BUCKETS = {
  questionImages: 'question-images',
  questionAudio: 'question-audio',
  studySheets: 'study-sheets',
} as const;
