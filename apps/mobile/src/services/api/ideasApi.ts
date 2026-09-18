import type { Enums } from '@quizbyte/database';

import { toAppError } from '@/services/errors';
import { supabase } from '@/services/supabase/client';

/** Which part of the app an idea is about – mirrors the `idea_area` enum. */
export type IdeaArea = Enums<'idea_area'>;
export type IdeaStatus = Enums<'report_status'>;

export interface AppIdea {
  id: string;
  area: IdeaArea;
  title: string;
  details: string;
  status: IdeaStatus;
  createdAt: number;
}

export interface SubmitIdeaInput {
  userId: string;
  area: IdeaArea;
  title: string;
  details: string;
}

/** Files one idea. Everything is trimmed to the limits the table enforces. */
export async function submitIdea(input: SubmitIdeaInput): Promise<void> {
  const { error } = await supabase.from('app_ideas').insert({
    user_id: input.userId,
    area: input.area,
    title: input.title.trim().slice(0, 120),
    details: input.details.trim().slice(0, 2000),
  });
  if (error) throw toAppError(error, 'Deine Idee konnte nicht gesendet werden. Bitte versuche es erneut.');
}

/** The ideas this user submitted, newest first. RLS keeps it to their own. */
export async function fetchMyIdeas(): Promise<AppIdea[]> {
  const { data, error } = await supabase
    .from('app_ideas')
    .select('id, area, title, details, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw toAppError(error, 'Deine Ideen konnten nicht geladen werden.');

  return (data ?? []).map((row) => ({
    id: row.id,
    area: row.area,
    title: row.title,
    details: row.details,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
  }));
}
