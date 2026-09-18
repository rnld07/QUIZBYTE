-- =============================================================================
-- QuizByte – Profilrahmen auf fünf Ränge zusammengefasst
--
-- Statt 21 Rahmen alle fünf Level gibt es jetzt fünf Ränge: Grau von Anfang an,
-- danach Bronze, Silber, Gold und Platin in Vierteln bis Level 100. Ab Bronze
-- trägt ein Rang zusätzlich ein kleines Emblem (nur Darstellung, siehe
-- `PROFILE_FRAMES` in packages/shared).
--
-- Gegenstück in `packages/shared/src/domain/profile/frames.ts`. Beim Ändern
-- beide Seiten nachziehen.
-- =============================================================================

create or replace function public.frame_required_level(p_frame text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_frame
    when 'none' then 1
    when 'graphite' then 1
    when 'bronze' then 25
    when 'silver' then 50
    when 'gold' then 75
    when 'platinum' then 100
    else null
  end;
$$;

comment on function public.frame_required_level(text) is 'Unlock level per frame. Keep in sync with PROFILE_FRAMES in packages/shared.';

-- Wer einen der alten Rahmen trug, hätte sonst einen, den es nicht mehr gibt:
-- die App zeichnet ihn dann nicht, die Auswahl zeigt aber auch nichts als
-- aktiv. Solche Einträge werden zurückgesetzt.
update public.profiles
set selected_frame = null
where selected_frame is not null
  and public.frame_required_level(selected_frame) is null;
