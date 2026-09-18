-- =============================================================================
-- QuizByte – Filter fuer unangemessene Benutzernamen
--
-- Dieselbe Pruefung wie `isBlockedUsername()` in packages/shared. Sie muss auch
-- hier liegen, weil ein Filter, der nur in der App laeuft, keiner ist: mit dem
-- oeffentlichen anon-Key laesst sich die App umgehen und direkt in die Tabelle
-- schreiben.
--
-- Wird die Liste geaendert, muss sie an BEIDEN Stellen geaendert werden:
--   packages/shared/src/validation/blockedUsernames.ts
--   diese Datei
-- =============================================================================

/**
 * Kocht einen Namen auf das Wort herunter, das jemand schreiben wollte.
 *
 * Dieselben fuenf Schritte wie `flattenUsername()`: Kleinschreibung mit
 * ausgeschriebenen Umlauten, Akzente weg, Leetspeak zurueckgelesen, alles ausser
 * Buchstaben verworfen, Buchstabenwiederholungen zusammengezogen.
 *
 * Das Ergebnis wird nirgends gespeichert und nirgends angezeigt – es existiert
 * nur, um mit der Liste verglichen zu werden.
 */
create or replace function public.flatten_username(p_input text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text;
begin
  v := lower(coalesce(p_input, ''));

  -- Umlaute ausschreiben, damit beide Schreibweisen gleich ankommen.
  v := replace(v, 'ä', 'a');
  v := replace(v, 'ö', 'o');
  v := replace(v, 'ü', 'u');
  v := replace(v, 'ß', 'ss');

  -- Akzente. Direkt uebersetzt statt per unaccent-Extension: die Liste der
  -- Zeichen, die in einem Benutzernamen ueberhaupt vorkommen koennen, ist kurz.
  v := translate(v, 'áàâãåéèêëíìîïóòôõúùûñç', 'aaaaaeeeeiiiioooouuunc');

  -- Leetspeak: 4 = a, 3 = e, 1 = i, 0 = o und so weiter.
  v := translate(v, '01345789@$!|+(', 'oieastbgasiitc');

  -- Punkte, Unterstriche, Leerzeichen und restliche Ziffern fallen weg.
  v := regexp_replace(v, '[^a-z]', '', 'g');

  -- "fuuuck" wird "fuck".
  return regexp_replace(v, '(.)\1+', '\1', 'g');
end;
$$;

comment on function public.flatten_username(text) is
  'Normalises a username for the word filter. Mirrors flattenUsername() in packages/shared.';

/**
 * Ob ein Name nicht benutzt werden darf.
 *
 * Zwei Regeln: die eindeutigen Begriffe sind ueberall verboten, die kurzen und
 * mehrdeutigen nur, wenn der ganze Name auf sie hinauslaeuft. "Klassenass"
 * behaelt sein "ass"; "xXarschlochXx" behaelt sein "arschloch" nicht.
 */
create or replace function public.username_is_blocked(p_username text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_flat text := public.flatten_username(p_username);
  v_term text;
  -- Ueberall verboten – keiner dieser Begriffe steckt in einem normalen Wort.
  v_anywhere text[] := array[
    'arschloch', 'wichser', 'wixer', 'fotze', 'hurensohn', 'hurentochter', 'missgeburt',
    'schlampe', 'nutte', 'bastard', 'spast', 'spasti', 'behindert', 'krupel', 'schwuchtel',
    'transe', 'kanake', 'zigeuner', 'neger', 'judensau', 'untermensch', 'scheis', 'kacke',
    'pisse', 'penner', 'hodensack', 'schwanzlutscher', 'muschi', 'titten', 'nutten',
    'vergewaltig', 'kinderficker', 'ficken', 'ficker', 'gefickt', 'fuck', 'shit', 'bitch',
    'cunt', 'whore', 'slut', 'penis', 'vagina', 'pussy', 'pusy', 'boobs', 'tits', 'blowjob',
    'handjob', 'jizz', 'wank', 'asshole', 'arsehole', 'motherfucker', 'retard', 'faggot',
    'nigger', 'niga', 'nigga', 'chink', 'tranny', 'rapist', 'pedo', 'pedophile', 'paedo',
    'childporn', 'porn', 'porno', 'hentai', 'incest', 'bestiality', 'suicide', 'killyourself',
    'hitler', 'adolfhitler', 'nazi', 'nazis', 'heilhitler', 'sieghail', 'siegheil',
    'hakenkreuz', 'swastika', 'thirdreich', 'drittesreich', 'holocaust', 'auschwitz',
    'gaskammer', 'gaschamber', 'genocide', 'volkermord', 'aljaida', 'alqaida', 'alqaeda',
    'taliban', 'terrorist', 'whitepower', 'whitepride', 'kkk', 'kuklux', 'blutundehre',
    'wehrmacht', 'reichsburger', 'judenhas'
  ];
  -- Nur als ganzer Name verboten: jeder dieser Begriffe steckt in einem Wort,
  -- das jemand ehrlich meinen kann (nigeria, mongolei, Dickmann, cocktail,
  -- document, grapefruit, narcissist, suspicion, Fagott, Fukushima, Bichler).
  v_whole text[] := array[
    'niger', 'mongo', 'mongoloid', 'dick', 'cock', 'cum', 'rape', 'isis', 'spic', 'fagot',
    'fuk', 'bich', 'kys', 'ass', 'as', 'arsch', 'sex', 'sexy', 'anal', 'anus', 'poop', 'kot',
    'piss', 'fick', 'hure', 'gay', 'homo', 'schwul', 'lesbe', 'idiot', 'dumm',
    'dummkopf', 'depp', 'trotel', 'noob', 'hoe', 'milf', 'dildo', 'vibrator', 'drugs', 'kokain',
    'cocaine', 'heroin', 'meth', 'weed', 'admin', 'moderator', 'quizbyte', 'support', 'root',
    'system'
  ];
begin
  if v_flat = '' then
    return false;
  end if;

  foreach v_term in array v_anywhere loop
    if position(v_term in v_flat) > 0 then
      return true;
    end if;
  end loop;

  return v_flat = any (v_whole);
end;
$$;

comment on function public.username_is_blocked(text) is
  'True when a username may not be used. Mirrors isBlockedUsername() in packages/shared.';

-- Ein Trigger statt eines Check-Constraints: der Constraint wuerde bei jeder
-- Aenderung der Liste ueber die ganze Tabelle nachvalidiert und alte Namen
-- nachtraeglich ungueltig machen. Der Trigger greift nur beim Schreiben.
create or replace function public.reject_blocked_username()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.username_is_blocked(new.username) then
    -- Der Wortlaut ist derselbe wie in der App: faellt die Pruefung im Client
    -- aus, liest der Nutzer trotzdem einen verstaendlichen Satz.
    raise exception 'Dieser Benutzername ist nicht erlaubt.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_reject_blocked_username on public.profiles;
create trigger profiles_reject_blocked_username
  before insert or update of username on public.profiles
  for each row execute function public.reject_blocked_username();

-- Bei der Registrierung wird ein gesperrter Wunschname nicht abgelehnt, sondern
-- durch einen erzeugten ersetzt – wie ein schon vergebener auch. Sonst wuerde
-- der Trigger oben die Anmeldung selbst scheitern lassen.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wanted text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_username text;
begin
  -- Dieselbe Regel wie der Check-Constraint und validateUsername() im Client.
  if v_wanted ~ '^[a-z0-9_](\.?[a-z0-9_])*$'
     and char_length(v_wanted) between 3 and 20
     and not public.username_is_blocked(v_wanted)
     and not exists (select 1 from public.profiles p where lower(p.username) = v_wanted)
  then
    v_username := v_wanted;
  else
    v_username := public.generate_username(new.id);
  end if;

  insert into public.profiles (id, username, display_name, is_anonymous)
  values (
    new.id,
    v_username,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.is_anonymous, false)
  );

  insert into public.user_progress (user_id) values (new.id);
  return new;
end;
$$;

grant execute on function public.flatten_username(text) to authenticated;
grant execute on function public.username_is_blocked(text) to authenticated;
