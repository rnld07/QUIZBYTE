-- =============================================================================
-- QuizByte – heutige Daily-Runde nachschlagen
--
-- Die Ergebnisseite kann eine abgeschlossene Runde aus der Datenbank
-- rekonstruieren; dafür braucht sie deren Id. Ersetzt den reinen Boolean-Check,
-- der dafür nicht genug hergab.
-- =============================================================================

create or replace function public.get_my_daily_session_today(p_today date)
returns uuid
language sql
stable
set search_path = ''
as $$
  select s.id
  from public.quiz_sessions s
  where s.user_id = auth.uid()
    and s.session_type = 'daily'
    and s.completed_at is not null
    -- Matched against the caller's local day, like the streak.
    and exists (
      select 1 from public.quiz_attempts a
      where a.quiz_session_id = s.id and a.answered_on = p_today
    )
  order by s.completed_at desc
  limit 1;
$$;

grant execute on function public.get_my_daily_session_today(date) to authenticated;
