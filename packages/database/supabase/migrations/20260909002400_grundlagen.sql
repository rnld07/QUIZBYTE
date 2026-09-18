-- =============================================================================
-- QuizByte – „Netzwerke" geht in „Fachinformatik" auf, „Grundlagen" kommt dazu
--
-- Netzwerkthemen sind Teil der Fachinformatik – eine eigene Kategorie dafür
-- war eine Dopplung. Die neun Fragen wandern deshalb samt ihrer Unterthemen
-- (OSI-Modell, DNS, Subnetting …) nach Fachinformatik, danach fällt die
-- Kategorie weg.
--
-- Bereits gespielte Netzwerk-Runden werden mitgezogen statt ihre Kategorie zu
-- verlieren: inhaltlich waren es Fachinformatik-Runden, und in „Letzte
-- Aktivität" steht dann weiterhin ein Kategoriename.
--
-- Neu ist „Grundlagen" mit sieben Fragen zu den Basics der Informatik.
-- =============================================================================

-- Netzwerke -> Fachinformatik ----------------------------------------------------------

update public.questions
set category_id = '10000000-0000-4000-8000-000000000001'
where category_id = '10000000-0000-4000-8000-000000000003';

update public.quiz_sessions
set category_id = '10000000-0000-4000-8000-000000000001'
where category_id = '10000000-0000-4000-8000-000000000003';

-- Erst jetzt löschbar: die Fremdschlüssel auf questions stehen auf `restrict`.
delete from public.categories
where id = '10000000-0000-4000-8000-000000000003';

-- Neue Kategorie „Grundlagen" ----------------------------------------------------------

insert into public.categories (id, slug, name, description, icon, accent_color, sort_order, is_active, requires_pro) values
  ('10000000-0000-4000-8000-000000000007', 'grundlagen', 'Grundlagen', 'Zahlensysteme, Algorithmen und Rechnerarchitektur', 'school', '#14B8A6', 5, true, false)
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  accent_color = excluded.accent_color,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  requires_pro = excluded.requires_pro;

insert into public.questions (id, category_id, subcategory, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, explanation, difficulty, tags, status) values
  ('20000000-0000-4000-8000-000000000058', '10000000-0000-4000-8000-000000000007', 'Zahlensysteme',
   'Welchen Dezimalwert hat die Binärzahl 1011?',
   '9', '11', '13', '15', 'B',
   'Die Stellen stehen von rechts für 1, 2, 4 und 8. Gesetzt sind 8, 2 und 1 – zusammen also 11.',
   'easy', '{binaer,zahlensysteme}', 'published'),
  ('20000000-0000-4000-8000-000000000059', '10000000-0000-4000-8000-000000000007', 'Einheiten',
   'Aus wie vielen Bit besteht ein Byte?',
   '4', '8', '16', '32', 'B',
   'Ein Byte fasst 8 Bit und kann damit 256 verschiedene Werte darstellen – von 0 bis 255.',
   'easy', '{bit,byte,einheiten}', 'published'),
  ('20000000-0000-4000-8000-000000000060', '10000000-0000-4000-8000-000000000007', 'Algorithmen',
   'Was beschreibt ein Algorithmus?',
   'Eine eindeutige, endliche Handlungsvorschrift zur Lösung eines Problems', 'Eine Programmiersprache', 'Einen Schaltkreis im Prozessor', 'Ein Dateiformat für Quelltext', 'A',
   'Ein Algorithmus ist eine Schritt-für-Schritt-Anweisung, die eindeutig formuliert ist und nach endlich vielen Schritten endet. Die Programmiersprache ist nur eine mögliche Schreibweise dafür.',
   'easy', '{algorithmus,grundlagen}', 'published'),
  ('20000000-0000-4000-8000-000000000061', '10000000-0000-4000-8000-000000000007', 'EVA-Prinzip',
   'Wofür steht das EVA-Prinzip in der Datenverarbeitung?',
   'Erfassen, Verwalten, Archivieren', 'Eingabe, Verarbeitung, Ausgabe', 'Entwurf, Validierung, Auslieferung', 'Einlesen, Verschlüsseln, Ablegen', 'B',
   'Jede Datenverarbeitung folgt dem Ablauf Eingabe, Verarbeitung, Ausgabe – oft ergänzt um die Speicherung (EVAS).',
   'easy', '{eva,datenverarbeitung}', 'published'),
  ('20000000-0000-4000-8000-000000000062', '10000000-0000-4000-8000-000000000007', 'Übersetzer',
   'Worin unterscheidet sich ein Compiler von einem Interpreter?',
   'Der Compiler übersetzt das ganze Programm vor der Ausführung, der Interpreter Zeile für Zeile zur Laufzeit', 'Der Compiler läuft nur unter Linux', 'Der Interpreter erzeugt immer schnelleren Code', 'Es gibt keinen Unterschied, nur zwei Namen', 'A',
   'Ein Compiler erzeugt vorab eine ausführbare Datei, ein Interpreter übersetzt und führt den Quelltext direkt Anweisung für Anweisung aus.',
   'medium', '{compiler,interpreter}', 'published'),
  ('20000000-0000-4000-8000-000000000063', '10000000-0000-4000-8000-000000000007', 'Rechnerarchitektur',
   'Was kennzeichnet die Von-Neumann-Architektur?',
   'Programme und Daten liegen im selben Speicher', 'Programme und Daten haben getrennte Speicher', 'Jeder Prozessorkern hat einen eigenen Arbeitsspeicher', 'Der Speicher sitzt direkt im Prozessor', 'A',
   'In der Von-Neumann-Architektur teilen sich Programmcode und Daten einen gemeinsamen Speicher. Die Harvard-Architektur trennt beide dagegen.',
   'medium', '{von-neumann,architektur}', 'published'),
  ('20000000-0000-4000-8000-000000000064', '10000000-0000-4000-8000-000000000007', 'Datenstrukturen',
   'Nach welchem Prinzip arbeitet ein Stack?',
   'First In – First Out', 'Last In – First Out', 'Größter Wert zuerst', 'Zufällige Reihenfolge', 'B',
   'Ein Stack ist ein Stapel: Das zuletzt abgelegte Element wird als Erstes wieder entnommen (LIFO). Eine Queue arbeitet dagegen nach FIFO.',
   'hard', '{stack,queue,datenstrukturen}', 'published')
on conflict (id) do update set
  category_id = excluded.category_id,
  subcategory = excluded.subcategory,
  question_text = excluded.question_text,
  answer_a = excluded.answer_a,
  answer_b = excluded.answer_b,
  answer_c = excluded.answer_c,
  answer_d = excluded.answer_d,
  correct_answer = excluded.correct_answer,
  explanation = excluded.explanation,
  difficulty = excluded.difficulty,
  tags = excluded.tags,
  status = excluded.status;
