import type { Enums, Tables } from '@quizbyte/database';
import { Constants } from '@quizbyte/database';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export const PAGE_SIZE = 25;

export interface QuestionFilters {
  q?: string;
  category?: string;
  status?: Enums<'question_status'> | '';
  difficulty?: Enums<'difficulty_level'> | '';
  audio?: 'missing' | 'present' | '';
  image?: 'missing' | 'present' | '';
  pro?: 'yes' | 'no' | '';
  tag?: string;
  /**
   * Filter, die nicht in der Fragetabelle stehen.
   *
   * "gemeldet" und "hohe Fehlerquote" hängen an den Meldungen und an den
   * Antworten. Sie kommen als Id-Liste aus einem eigenen RPC und werden hier
   * als weiterer `in`-Filter angehängt – damit bleiben Blätterung und alle
   * übrigen Filter unverändert.
   */
  signal?: 'reported' | 'hard' | '';
  page?: number;
}

export interface QuestionListRow extends Tables<'questions'> {
  categories: { name: string; slug: string } | null;
}

export interface QuestionListResult {
  rows: QuestionListRow[];
  total: number;
  page: number;
  pageCount: number;
}

function isStatus(value: string | undefined): value is Enums<'question_status'> {
  return (Constants.public.Enums.question_status as readonly string[]).includes(value ?? '');
}

function isDifficulty(value: string | undefined): value is Enums<'difficulty_level'> {
  return (Constants.public.Enums.difficulty_level as readonly string[]).includes(value ?? '');
}

/** Parses URL search params into typed filters. */
export function parseQuestionFilters(params: Record<string, string | string[] | undefined>): QuestionFilters {
  const pick = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const status = pick('status');
  const difficulty = pick('difficulty');
  const audio = pick('audio');
  const image = pick('image');
  const pro = pick('pro');
  const signal = pick('signal');
  const page = Number(pick('page') ?? '1');
  return {
    q: pick('q')?.trim() ?? '',
    category: pick('category') ?? '',
    status: isStatus(status) ? status : '',
    difficulty: isDifficulty(difficulty) ? difficulty : '',
    audio: audio === 'missing' || audio === 'present' ? audio : '',
    image: image === 'missing' || image === 'present' ? image : '',
    pro: pro === 'yes' || pro === 'no' ? pro : '',
    signal: signal === 'reported' || signal === 'hard' ? signal : '',
    tag: pick('tag')?.trim().toLowerCase() ?? '',
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

/**
 * Eine Seite der Fragenliste.
 *
 * `signalIds` schränkt zusätzlich auf eine Id-Liste ein – siehe `signal` oben.
 * Eine leere Liste ist dabei ausdrücklich "kein Treffer" und nicht "kein
 * Filter": wer nach gemeldeten Fragen sucht und keine hat, will eine leere
 * Liste sehen, nicht alle.
 */
export async function listQuestions(filters: QuestionFilters, signalIds?: string[]): Promise<QuestionListResult> {
  const supabase = await createSupabaseServerClient();
  const page = filters.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;

  if (signalIds && signalIds.length === 0) {
    return { rows: [], total: 0, page, pageCount: 1 };
  }

  let query = supabase
    .from('questions')
    .select('*, categories(name, slug)', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (filters.q) {
    const term = filters.q.replace(/[%,()]/g, ' ');
    query = query.or(`question_text.ilike.%${term}%,subcategory.ilike.%${term}%,explanation.ilike.%${term}%`);
  }
  if (filters.category) query = query.eq('category_id', filters.category);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
  if (filters.audio === 'missing') query = query.is('audio_url', null);
  if (filters.audio === 'present') query = query.not('audio_url', 'is', null);
  if (filters.image === 'missing') query = query.is('image_url', null);
  if (filters.image === 'present') query = query.not('image_url', 'is', null);
  if (filters.pro === 'yes') query = query.eq('requires_pro', true);
  if (filters.pro === 'no') query = query.eq('requires_pro', false);
  if (filters.tag) query = query.contains('tags', [filters.tag]);
  if (signalIds) query = query.in('id', signalIds);

  const { data, error, count } = await query;
  if (error) throw new Error(`Fragen konnten nicht geladen werden: ${error.message}`);

  const total = count ?? 0;
  return {
    rows: (data ?? []) as QuestionListRow[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/**
 * Eine Frage vollstaendig – Loesung und Erklaerung eingeschlossen.
 *
 * Ueber eine Funktion statt ueber die Tabelle: das Leserecht auf
 * `correct_answer` und `explanation` faellt fuer die API-Rollen weg, sobald
 * genug App-Installationen ohne es auskommen. Das Adminformular braucht beides
 * und bekommt es ueber einen Weg, der die Adminrolle selbst prueft.
 */
export async function getQuestion(id: string): Promise<Tables<'questions'> | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('admin_question', { p_id: id });
  if (error) throw new Error(`Frage konnte nicht geladen werden: ${error.message}`);
  return data?.[0] ?? null;
}
