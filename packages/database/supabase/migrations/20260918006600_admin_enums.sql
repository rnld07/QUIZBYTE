-- =============================================================================
-- QuizByte – Enum-Erweiterungen fuer das Control Center
--
-- Bewusst eine Migration fuer sich: `alter type ... add value` darf den neuen
-- Wert in derselben Transaktion nicht schon verwenden. Jede Migrationsdatei
-- laeuft in einer eigenen Transaktion, also steht hier nur das Hinzufuegen,
-- und alles, was die Werte benutzt, kommt in den Dateien danach.
-- =============================================================================

-- Der Zwischenstand einer Meldung: jemand hat sie gesehen und arbeitet daran.
-- Ohne ihn gibt es nur "offen" und "fertig", und eine Meldung, an der gerade
-- jemand sitzt, sieht aus wie eine, die niemand angefasst hat.
alter type public.report_status add value if not exists 'in_review' after 'open';

-- Das Protokoll kannte bisher nur die vier Moderationsschritte. Ein Protokoll,
-- das die Haelfte dessen auslaesst, was ein Admin tut, ist keines.
alter type public.admin_action_kind add value if not exists 'resolve_question_report';
alter type public.admin_action_kind add value if not exists 'note_report';
alter type public.admin_action_kind add value if not exists 'set_feature_flag';
alter type public.admin_action_kind add value if not exists 'plan_daily_quiz';
alter type public.admin_action_kind add value if not exists 'edit_question';
alter type public.admin_action_kind add value if not exists 'edit_category';
