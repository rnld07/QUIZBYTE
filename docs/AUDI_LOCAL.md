**QuizByte – Codeprüfung vom 18. September 2026**

Geprüfter Stand: `rnld07/QUIZBYTE`, Branch `claude/quizbyte-mobile-architecture-qmnmge`, Commit `7e7321e61dcfa946cc9b7cce860421549806a60d` vom 18.09.2026, 12:12 Uhr MESZ, „Build out mobile app, admin control center and safety features“. Der Remote-Stand wurde am Ende erneut abgeglichen und war unverändert.

Mein Urteil: QuizByte hat eine brauchbare, gut gegliederte Grundlage. Die Trennung zwischen Mobile-App, Admin, gemeinsamer Fachlogik und Datenbank ist sinnvoll. Die nächste Entwicklungsphase sollte sich auf Zugriffsrechte, Speicherung und konsistente Spielregeln konzentrieren. Mehrere nachgewiesene Fehler würde ich vor einer öffentlichen Veröffentlichung beheben. Deine geringe Fragenanzahl ist ausdrücklich kein Bewertungskriterium.

Der Review umfasst die zentralen Abläufe und Querschnittsthemen der Mobile-App, des Admins, der gemeinsamen Logik, die Datenbankmigrationen, Berechtigungen und CI. Er ist keine Zusicherung, dass jede mögliche Fehlerkombination ausgeschlossen ist. Es gab keinen Test auf einem echten iOS-/Android-Gerät und keine Prüfung deiner produktiven Supabase-Konfiguration, E-Mail-Zustellung oder Store-Builds. Datenbankfälle wurden ausschließlich mit synthetischen Konten lokal ausgeführt. Der App-Code wurde nicht geändert und nichts gepusht.

**Die ausgeführten Prüfungen ergeben folgendes Bild:**

| Prüfung | Ergebnis | Aussage |
|---|---|---|
| Installation mit gepinnter pnpm-Version 10.33.0 und unverändertem Lockfile | Erfolgreich; Installationsskripte deaktiviert | Reproduzierbare Abhängigkeiten für die ausgeführten Prüfungen |
| `pnpm check` | Fehlgeschlagen beim Mobile-Typecheck | `react-native-svg` fehlt |
| Lint separat | Shared/Admin erfolgreich; Mobile fehlgeschlagen | Zwei nicht auflösbare SVG-Imports |
| Unit-Tests separat | 316 bestanden in 26 Dateien | 309 Shared-Tests und 7 Mobile-Store-Tests |
| Admin-Produktionsbuild | Erfolgreich | Mit denselben Supabase-Platzhaltern wie in CI; keine Live-Backend-Prüfung |
| 71 Migrationen und Seed | Erfolgreich lokal angewandt | PGlite/PostgreSQL-WASM mit dem Supabase-Shim aus dem Repository |
| Datenbank-Smoke-SQL | Fehlgeschlagen | Erwartet 47 veröffentlichte Fragen, Seed liefert 54; weitere Assertions enthalten alte XP-Regeln |
| Gezielte Berechtigungs-/Spielflussfälle | Mehrere Fehler reproduziert | Details in den folgenden Befunden |
| Git-Arbeitsverzeichnis | Unverändert | Keine Änderungen an getrackten Dateien |

`pnpm db:verify` selbst konnte hier wegen fehlender ausführbarer PostgreSQL-Serverumgebung nicht vollständig über seinen Shell-Runner laufen. Stattdessen wurden dieselben Migrationen, der Seed und das Smoke-SQL mit dem vorhandenen Supabase-Shim in PGlite ausgeführt. Der Smoke-Test wurde dabei nur um seine psql-Steuerzeile bereinigt. Die lokalen Resultate belegen das Verhalten der Repository-Definitionen; abweichende Berechtigungen in deiner Live-Datenbank müssten separat geprüft werden.

**1. Hohe Priorität: Freundschaften können ohne Zustimmung angelegt werden. Lokal reproduziert.**

Die INSERT-Policy auf `friendships` prüft nur, ob `requester_id` der angemeldete Nutzer ist. Sie verbietet nicht, direkt `status = 'accepted'` mit einer bekannten fremden Nutzer-ID einzufügen. Die UPDATE-Policy schützt außerdem die beteiligten IDs und erlaubten Statuswechsel nicht ausreichend. Dadurch lassen sich die sorgfältigeren Prüfungen in `send_friend_request` umgehen.

Im lokalen Test konnte Nutzer A sich selbst als akzeptierten Freund von B eintragen und anschließend B über die Freundesfreigabe lesen. Ein zweiter Test zeigte zugleich `are_friends = true` und `is_blocked = true`: Auch nach einer Blockierung konnte A die Freundschaft neu anlegen. Betroffen sind Zustimmung, Blockierung und die Datenfreigabe zwischen Freunden.

Änderung: Direkte Schreibrechte für die Tabelle reduzieren und Statuswechsel ausschließlich über streng prüfende RPCs durchführen. Alternativ müssen Policies/Trigger Initialstatus, unveränderliche Teilnehmer und jeden zulässigen Übergang erzwingen. Blockierungen gehören zusätzlich in die gemeinsame Berechtigungsprüfung für Freundesfunktionen.

Code: [Freundschaftspolicies und are_friends](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260909002900_friends.sql), [Privatsphäre und Anfrage-RPC](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260915005700_privacy_settings.sql).

**2. Hohe Priorität: Zwei RPCs lassen nicht angemeldete Aufrufe mit bekannter Objekt-ID zu. Lokal reproduziert.**

`complete_quiz_session` und `decline_duel` verwenden an entscheidenden Stellen einen Vergleich wie `owner_id <> auth.uid()`. Ohne Anmeldung ist `auth.uid()` NULL. Der Vergleich ergibt dann NULL und löst die vorgesehene Ablehnung in einem PL/pgSQL-IF nicht aus.

Unter den Repository-Berechtigungen hatte die Rolle `anon` EXECUTE-Rechte. Damit konnte ich eine fremde Runde über ihre bekannte Session-ID abschließen und bekam Session-/Fortschrittsdaten des Besitzers zurück. Ebenso ließ sich ein Duell über seine bekannte ID anonym ablehnen. Die IDs müssen bekannt sein; daraus folgt kein frei durchsuchbarer Zugriff auf sämtliche Nutzer.

Änderung: Zuerst ausdrücklich `auth.uid() is null` abweisen; anschließend Besitz mit NULL-sicherer Logik prüfen, beispielsweise `IS DISTINCT FROM`. EXECUTE für `PUBLIC` und `anon` gezielt entziehen und nur für benötigte Rollen gewähren. Alle SECURITY-DEFINER-RPCs systematisch mit anonymem, fremdem und berechtigtem Nutzer testen.

PostgreSQL vergibt neuen Funktionen standardmäßig EXECUTE für PUBLIC; eine zusätzliche Freigabe an `authenticated` entfernt diese Freigabe nicht. [PostgreSQL-Dokumentation](https://www.postgresql.org/docs/current/sql-createfunction.html).

Code: [complete_quiz_session](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260909003800_quiz_modes.sql), [decline_duel](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260918007100_decline_active_duel.sql).

**3. Hohe Priorität: Netzwerkfehler können zum Verlust von Antworten führen. Fehlerkette bestätigt.**

`submitAttempt` wandelt Fehler mit `toAppError` in einen `AppError` um. Bei einem Netzfehler trägt dieser korrekt `code = 'network'`, aber eine deutsche Meldung. `isNetworkError` erkennt nur bestimmte englische Texte bzw. einen Auth-Fehlernamen; den eigenen Fehlercode berücksichtigt es nicht.

Der lokale Test mit dem tatsächlichen Code ergab: ursprünglicher Netzwerkfehler erkannt = true; umgewandelter Code = network; umgewandelter Fehler erkannt = false. Im Quizcontroller wird die Antwort deshalb nur geloggt, statt in die Outbox aufgenommen zu werden. Beim erneuten Versand kann die Outbox denselben Fehler als dauerhaft behandeln und den Eintrag entfernen. Auch die Query-Retry-Entscheidung verwendet diese Erkennung.

Änderung: Fehler überall anhand des stabilen Codes klassifizieren. Antworten möglichst vor dem Versand dauerhaft speichern; erst nach bestätigtem Servererfolg entfernen. Vorübergehende und unbekannte Serverfehler nicht pauschal verwerfen. Die Oberfläche sollte noch nicht synchronisierte Antworten anzeigen können.

Code: [Netzwerkerkennung](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/services/errors/network.ts), [Fehlermapping](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/services/errors/appError.ts), [Quizcontroller](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/features/quiz/useQuizController.ts), [Outbox](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/services/outbox/attemptOutbox.ts).

**4. Hohe Priorität: Rundenabschluss wartet nicht auf laufende Antwort-Requests. Aus dem Ablauf belegtes Race-Risiko.**

`answer()` startet `submitAttempt()` ohne dessen Promise für den Abschluss aufzubewahren. `finish()` wartet nur auf die bereits gefüllte Outbox. Ein noch laufender Request liegt dort nicht. Besonders bei der letzten Antwort, langsamer Verbindung oder ablaufendem Blitz-Timer kann die Abschluss-RPC zuerst ankommen.

Der Server darf eine Runde mit mindestens einer gespeicherten Antwort bereits abschließen und kürzt die Fragenanzahl entsprechend. Eine anschließend eintreffende Antwort wird wegen der abgeschlossenen Runde zurückgewiesen. Lokale Ergebnisanzeige und tatsächlich gespeicherter Fortschritt können dann auseinanderliegen. Dieses konkrete Timing wurde nicht auf einem Gerät nachgestellt; die fehlende Synchronisierung ist im Code sichtbar.

Änderung: Alle Antworten einer Runde dauerhaft registrieren, ausstehende Schreibvorgänge abwarten und erst dann serverseitig abschließen. Der Server braucht eine eindeutige Zustandsübergangsregel samt Transaktion/Locking. Das endgültige Ergebnis sollte aus dem bestätigten Serverstand entstehen.

Code: [answer und finish](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/features/quiz/useQuizController.ts), [Abschlusslogik](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260909003800_quiz_modes.sql).

**5. Hohe Priorität: Die Daily-XP-Sperre greift erst bei abgeschlossenen Runden. Lokal reproduziert.**

`is_repeated_daily` sucht eine andere bereits abgeschlossene Daily-Runde. Gleichzeitig zahlt der Scoring-Trigger im Daily auch für früher richtig beantwortete Fragen. Werden mehrere Daily-Runden angefangen, ohne eine abzuschließen, können dieselben Antworten mehrfach XP erhalten.

Im lokalen Test gab dieselbe mittelschwere Frage in zwei offenen Daily-Sessions jeweils 24 XP. Dafür waren keine gefälschten XP-Werte nötig; der Server berechnete beide Gutschriften selbst. Auch Abbrechen und erneutes Starten ist deshalb ein relevanter Testfall.

Änderung: Die Vergabe unabhängig vom späteren Abschluss absichern, beispielsweise über einen eindeutigen Eintrag pro Nutzer, Quiztag und Daily-Frage. Die Prüfung und Gutschrift müssen atomar sein. Erst festlegen, ob ein Abbruch einen zweiten Versuch erlauben soll; Wiederaufnahme darf keine zweite Auszahlung erzeugen.

Code: [Wiederholungsprüfung](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260909003500_daily_counts_finished_rounds.sql), [XP-Trigger](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260909003600_daily_always_pays.sql).

**6. Hohe Priorität: Session- und Duellregeln sind serverseitig nicht ausreichend verbindlich. Mehrere Teilfälle lokal reproduziert.**

`join_duel` prüft den Duellteilnehmer, aber nicht ausreichend die übergebene Session. Im Test konnte A eine bereits abgeschlossene normale Kategorie-Session von B als eigene Duell-Session verknüpfen. Eigentümer, Sessiontyp, Modus, Fragenmenge, Status und Wiederverwendung müssen geprüft werden.

Der allgemeine Antwort-Trigger prüft Nutzerzuordnung, Veröffentlichungsstatus und offenen Sessionstatus, aber nicht, ob die Frage tatsächlich für diese Runde ausgewählt wurde. Kategorie, festes Daily-/Duell-Fragenset, Zeitlimit und Lebenslimit werden nicht umfassend verbindlich durchgesetzt. Die Lösungen werden außerdem bereits vor der Antwort an den Client geliefert. Das schwächt die Aussagekraft kompetitiver Ergebnisse.

Ein weiterer Test: Eine als Daily mit fünf Fragen angelegte Runde wurde nach nur einer richtigen Antwort abgeschlossen. `daily_quiz_was_perfect()` lieferte bereits true, also die Voraussetzung für das Glücksrad.

Änderung: Ein serverseitiger Rundenstart sollte Regeln, Teilnehmer und das konkrete Fragenset festhalten. Antwortabgabe und Abschluss werden dagegen validiert. Für gewertete Duelle sollte die richtige Lösung erst nach der Antwort zurückkommen. Solo-Lernmodus und kompetitive Wertung dürfen unterschiedliche Anforderungen an Offlinebetrieb haben. Modusregeln bleiben fachlich an einer Stelle beschrieben und werden durch Vertragstests zwischen TypeScript und SQL abgesichert.

Code: [join_duel](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260915005800_duel_settle_when_finished.sql), [score_quiz_attempt](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260909003600_daily_always_pays.sql), [Daily-Perfektion und Aufgaben](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260909004900_daily_tasks_and_wheel.sql), [Rundenstart](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/features/quiz/useStartQuiz.ts).

**7. Hohe Priorität: Eine spätere Policy hat Schutzbedingungen für Session-INSERTs entfernt. Lokal reproduziert.**

Die ursprüngliche Session-Policy verlangte unter anderem einen noch nicht abgeschlossenen Zustand und neutrale Ergebniswerte. Migration 055 ersetzt sie beim Einbau der Nutzersperre durch eine Prüfung von Eigentümer und Sperrstatus. Die bisherigen Bedingungen gehen dabei verloren.

Dadurch konnte ein regulärer Nutzer direkt eine vermeintlich abgeschlossene Daily-Session samt Ergebnisfeldern anlegen. Im lokalen Test zählte eine solche Runde ohne echte Antworten für `play_daily` und `finish_sessions`. Das bedeutet nicht, dass ein frei eingesetztes `xp_earned` automatisch direkt zu `user_progress.total_xp` addiert wird; diese Behauptung wäre zu weitgehend. Aufgaben- und Rundenstatistiken sind jedoch betroffen.

Änderung: Die verlorenen Invarianten wiederherstellen und wichtige Ergebnisfelder nur durch Serverfunktionen setzen lassen. Bei Policy-Änderungen müssen alte Sicherheitsfälle als Regressionstests bestehen bleiben.

Code: [Ursprüngliche Regeln](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260909000500_progress_sessions_attempts.sql), [Ersetzung der Policies](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260915005500_admin_moderation.sql).

**8. Hohe Priorität: Sperren greifen nicht einheitlich in sozialen Schreibfunktionen. Lokal reproduziert.**

Die Moderation sperrt bestimmte Tabellenzugriffe und Freundschaftsanfragen. `send_question_to_friend` prüft aber keine Kontosperre; `create_duel` ebenfalls nicht. Eine SECURITY-DEFINER-Funktion darf sich hier nicht auf die Sperranzeige in der App verlassen.

Im Test konnte ein Nutzer mit gesetztem `suspended_at` einem bestehenden Freund weiterhin eine Frage senden. Die Datenbanksperre muss bei allen Aktionen wirken, die nach deiner Sperrregel verboten sein sollen.

Änderung: Gemeinsame serverseitige Prüfung für „angemeldet, aktiv, berechtigt, nicht gegenseitig blockiert“ verwenden. Explizit festlegen, welche rein lesenden Funktionen gesperrte Nutzer behalten dürfen.

Code: [Fragenversand](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260909003000_friends_functions.sql), [Duellerstellung](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260917006500_one_open_duel.sql), [Kontosperren](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260915005500_admin_moderation.sql).

**9. Hohe Priorität: Mobile lässt sich aus einem sauberen Installationsstand nicht erfolgreich prüfen. Durch Befehle bestätigt.**

`AccuracyTrend.tsx` und `ProgressRing.tsx` importieren `react-native-svg`, das nicht in den Mobile-Abhängigkeiten steht. Der Typecheck meldet TS2307 und der Linter zweimal `import/no-unresolved`.

Änderung: Die zur eingesetzten Expo-Version passende Abhängigkeit ausdrücklich deklarieren, Lockfile aktualisieren und anschließend einen echten Mobile-Build prüfen. Dass eine bestehende Entwicklungsinstallation eventuell noch funktioniert, ersetzt diese Prüfung nicht.

Code: [Mobile-Abhängigkeiten](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/package.json), [AccuracyTrend](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/components/progress/AccuracyTrend.tsx), [ProgressRing](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/components/ui/ProgressRing.tsx).

**10. Mittlere Priorität: Normale Nutzer können Einträge im Admin-Aktionsprotokoll erzeugen. Lokal unter den Repository-Standardrechten reproduziert.**

`log_admin_action` läuft als SECURITY DEFINER und hat keine eigene Adminprüfung. Es entzieht Rechte von PUBLIC, aber nicht die direkten Freigaben an `authenticated`, die der Repository-Supabase-Shim als Standard vergibt.

Im Test konnte ein gewöhnlicher Nutzer einen frei formulierten Eintrag vom Typ `suspend_user` erzeugen. Das sperrt keinen Nutzer und verleiht keine Adminrolle, beschädigt aber die Verlässlichkeit des Audit-Logs.

Änderung: Interne Hilfsfunktionen nicht als Client-RPC freigeben; Rollenrechte ausdrücklich prüfen/entziehen. Zusätzlich eine passende Autorisierungsprüfung oder ein ausschließlich intern nutzbares Design vorsehen. Live-ACLs nach der Migration prüfen.

Code: [log_admin_action](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260918006700_admin_control_center.sql), [Standardrechte im Testaufbau](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/scripts/local/supabase_shim.sql).

**11. Mittlere Priorität: Konto-Wechsel räumt lokalen Zustand nicht vollständig auf. Statisch belegt.**

`useAuthBootstrap` leert bei Logout und Nutzerwechsel den Query-Cache. Die aktive Runde und `lastCompleted` im Zustand-Store bleiben jedoch bestehen. Die Outbox verwendet einen gemeinsamen Persistenzschlüssel und versendet Einträge ohne Filter auf das aktuell angemeldete Konto.

Mögliche Folgen sind alte Ergebnisdaten in einer neuen Anmeldung und eine Warteschlange, die an einer Antwort des vorherigen Kontos wegen fehlender Berechtigung hängen bleibt. Auch die Kontolöschung leert diese Stores nicht vollständig.

Änderung: Einen gemeinsamen Ablauf für Nutzerwechsel, Logout und Kontolöschung definieren. Quiz-Zustand zurücksetzen; ausstehende Antworten eindeutig nach Nutzer trennen und nur für den passenden Nutzer versenden. Bei Logout mit offenen Antworten bewusst entscheiden, ob sie erhalten oder nach Hinweis verworfen werden.

Code: [Auth-Bootstrap](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/features/auth/useAuthBootstrap.ts), [Quiz-State](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/state/quizSessionStore.ts), [Persistente Outbox](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/services/outbox/attemptOutbox.ts), [Kontolöschung](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/features/auth/useDeleteAccount.ts).

**12. Mittlere Priorität: Passwort-Reset ist im Repository nicht bis zum neuen Passwort umgesetzt. Statisch belegt.**

Es gibt einen Aufruf von `resetPasswordForEmail`, aber keinen vollständigen Rückweg in die App mit Recovery-Session und Eingabe eines neuen Passworts. Auth-Events werden auf die Session reduziert; `PASSWORD_RECOVERY` wird nicht gesondert verarbeitet. `detectSessionInUrl` ist deaktiviert, und eine entsprechende Recovery-Route fehlt.

Eine außerhalb des Repositorys eingerichtete Web-Lösung konnte ich nicht prüfen. Innerhalb des Projekts ist das versprochene Verfahren nicht vollständig.

Änderung: Recovery-Redirect, Deep-Link-Verarbeitung, Sessionübernahme und Formular für ein neues Passwort implementieren. Den Ablauf anschließend mit echter E-Mail vom gesperrten Bildschirm bis zur erneuten Anmeldung auf beiden Plattformen testen.

Code: [Reset-Anfrage und Auth-Events](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/services/auth/authService.ts), [Auth-Konfiguration](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/services/supabase/client.ts).

**13. Mittlere Priorität: Der Chat lädt nach 100 Nachrichten weiterhin die ältesten Nachrichten. Lokal reproduziert.**

`get_conversation` sortiert aufsteigend nach Erstellungszeit und begrenzt das Resultat standardmäßig auf 100. Der Client lädt keine Folgeseiten. Bei 101 Einträgen fehlte im lokalen Test der neueste Eintrag; wiederholtes Aktualisieren löst das Problem nicht. Damit können auch neue Fragen oder Duelle scheinbar verschwinden.

Änderung: Zuerst die neuesten Nachrichten laden, für die Anzeige wieder chronologisch anordnen und ältere per Cursor nachladen. Bei Zeitgleichheit mit einer stabilen zweiten Sortierspalte arbeiten.

Außerdem markiert `useMarkConversationRead` nur beim Öffnen des Chats als gelesen. Neue Nachrichten während des geöffneten Chats verändern den Zeitstempel nicht. Der Lesestatus sollte bis zur neuesten tatsächlich sichtbaren Nachricht fortgeschrieben werden.

Code: [get_conversation](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260915005800_duel_settle_when_finished.sql), [Polling und Lesestatus](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/features/friends/useFriends.ts), [Chat-Aufruf](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/services/api/friendsApi.ts).

**14. Mittlere Priorität: Die Admin-Feature-Schalter steuern die App nur teilweise. Statisch belegt.**

Die App lädt Überschreibungen und hält sie in einem Store. Tatsächlich konsumiert nur der Freunde-Tab `useFeature('friends')`. Andere Schalter wie Duelle, Daily oder Teilen werden an den betreffenden Abläufen nicht verwendet. Die Kategorieabfrage liest für Pro den unveränderlichen Code-Standard. `dailyQuiz` steht im Standard auf false, obwohl das Daily angeboten wird.

Änderung: Nur wirksame Schalter im Admin anbieten oder jeden Schalter in Einstieg, Route und Aktion konsistent berücksichtigen. Ein Abschalten des Tabs allein deaktiviert keine direkt erreichbare Route. Für harte Betriebssperren ist zusätzlich eine serverseitige Regel nötig. Festlegen, wann Änderungen geladen werden; momentan nur beim Start.

Code: [Feature-Store](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/state/featureStore.ts), [Synchronisierung](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/features/flags/useFeatureSync.ts), [Schalterdefinitionen](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/shared/src/config/features.ts), [Kategorieprüfung](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/services/api/categoriesApi.ts).

**15. Mittlere Priorität: Admin-Uploads versprechen größere Dateien, als der Request-Weg zulässt. Statisch und durch Framework-Dokumentation belegt.**

Für Fragen erlaubt die Validierung Bilder bis 5 MiB und Audio bis 10 MiB. Beide gelangen aber über Server Actions in den Admin-Server. `next.config.ts` setzt keine höhere Body-Grenze. Next.js begrenzt solche Requests standardmäßig auf 1 MB, einschließlich Formulardaten. Dateien können also vor der eigenen freundlichen Validierung scheitern. [Next.js-Dokumentation zu bodySizeLimit](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions).

Änderung: Wie beim vorhandenen Lernzettel-Ansatz direkt mit passenden Storage-Rechten hochladen und nur Metadaten an die Action senden; alternativ eine bewusst gewählte, begrenzte Request-Grenze setzen. Uploadfehler, Wiederholung und Dateibereinigung mit berücksichtigen. Die tatsächliche Hosting-Grenze muss zusätzlich zur Framework-Grenze passen.

Code: [Dateigrenzen](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/admin/src/lib/media/questionMedia.ts), [Upload-Action](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/admin/src/lib/actions/media.ts), [Dateien beim Speichern](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/admin/src/lib/actions/questions.ts), [Next-Konfiguration](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/admin/next.config.ts).

**16. Mittlere Priorität: Unvollständige Fragenentwürfe lassen sich trotz vorgesehener Funktion nicht speichern. Mit tatsächlichem Schema reproduziert.**

`questionInputSchema.partial()` macht Eigenschaften optional, erlaubt aber keine leeren Werte in vorhandenen Eigenschaften. Das Formular liefert leere Felder als leere Strings. Ein Entwurf ohne Erklärung wird daher abgewiesen, obwohl erst die Veröffentlichung vollständige Inhalte verlangen soll.

Der lokale Schematest für einen sonst gültigen Entwurf mit leerer Erklärung lieferte „Erklärung darf nicht leer sein.“

Änderung: Getrennte Schemata für Entwurf und Veröffentlichung verwenden. Entwürfe dürfen unvollständig sein, müssen aber weiterhin Typen und Größenlimits einhalten. Das erleichtert deinen späteren redaktionellen Arbeitsablauf unabhängig von der Anzahl der Fragen.

Code: [Entwurf speichern](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/admin/src/lib/actions/questions.ts), [Validierungsschema](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/shared/src/validation/question.ts).

**17. Mittlere Priorität: Die Prüfpipeline schützt den aktuellen Arbeitsablauf nicht ausreichend. Durch Konfiguration und Läufe belegt.**

Die CI läuft bei Push nur auf `main`, während der aktuell vorhandene Arbeitsbranch `claude/quizbyte-mobile-architecture-qmnmge` ist. Pull Requests sind ebenfalls ein Trigger; bloße Pushes auf diesen Branch lösen diesen Workflow jedoch nicht aus.

Der Datenbanktest ist gegenüber dem heutigen Code zurückgeblieben: feste Seed-Anzahl, alte XP pro richtiger/falscher Antwort und ein inzwischen abgeschaffter Abschlussbonus. Die 316 erfolgreichen Unit-Tests decken wichtige reine Funktionen ab, aber nicht die hier gefundenen Fehler in Berechtigungen, Netzfehlern und mehrstufigen Abläufen.

Änderung: CI an den tatsächlichen Branch-/PR-Prozess koppeln. Smoke-Tests mit eigenen kleinen Fixtures statt einer globalen redaktionellen Fragenanzahl betreiben. Neue Regressionstests genau für die gefundenen Sicherheits- und Speicherfälle schreiben. Ein Test für jeden Setter oder jede triviale Komponente bringt hier weniger als wenige gute Integrationstests.

Code: [Workflow](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/.github/workflows/ci.yml), [Datenbank-Smoke-Tests](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/scripts/local/smoke.sql).

**Weitere technische Verbesserungen, nach den obigen Fehlern:**

- **Fragenauswahl serverseitig filtern.** Aktuell wird ein zufälliger Pool mit maximal 100 Fragen geladen und danach nach Schwierigkeit bzw. Bearbeitungsstand gefiltert. Bei einem größeren Bestand kann das „keine passenden Fragen“ ergeben, obwohl außerhalb des Pools passende Fragen existieren. Schwierigkeit und gewünschte Auswahlregel sollten bereits in die serverseitige Auswahl eingehen. Code: [useStartQuiz](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/features/quiz/useStartQuiz.ts), [questionsApi](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/services/api/questionsApi.ts).
- **Antwort-Historie aggregieren.** `fetchAnswerHistory` lädt einzelne Versuche ohne Pagination. Die Repository-API begrenzt Resultate auf 1.000 Zeilen. Häufige Wiederholungen können die Rückgabe abschneiden und „Neu“/„schon gemeistert“ unzuverlässig machen. Besser pro Frage `seen` und `mastered` aggregiert vom Server zurückgeben. Code: [fetchAnswerHistory](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/services/api/questionsApi.ts), [API-Zeilengrenze](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/config.toml).
- **Laufende Runden wiederherstellen.** Der aktive Quiz-State liegt nur im Arbeitsspeicher. Wird die App vom Betriebssystem beendet, fehlt die Fortsetzung, obwohl serverseitig bereits Antworten existieren. Eine Wiederaufnahme sollte aus derselben verbindlichen Session entstehen, die auch die Wertung absichert. Code: [Quiz-State](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/state/quizSessionStore.ts).
- **Frageversionen für laufende Runden festhalten.** Wenn ein Admin während einer Runde die Lösung ändert oder eine Frage archiviert, bewertet der Server den aktuellen Datensatz, während die App die ältere Frage zeigt. Eine Version/Snapshot-Bindung verhindert widersprüchliche Bewertungen. Code: [Bewertung anhand aktueller Fragen](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/packages/database/supabase/migrations/20260909003600_daily_always_pays.sql).
- **Polling begrenzen.** Chat und Duelle pollen periodisch. Beim Duell endet das Intervall nur bei `finished`, nicht bei `declined`. Sichtbarkeit/Fokus und alle terminalen Zustände berücksichtigen. Bei wachsender Nutzung kann gezielte Ereigniszustellung sinnvoll werden; für eine kleine Beta reicht zunächst korrekt begrenztes Polling. Code: [Freundes-Hooks](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/features/friends/useFriends.ts).
- **Antworten vollständig lesbar halten.** Antworttexte werden auf drei Zeilen begrenzt, obwohl das Schema bis zu 300 Zeichen erlaubt. Besonders bei großer Systemschrift drohen abgeschnittene, für die Auswahl entscheidende Informationen. Variable Höhe oder eine Möglichkeit zur vollständigen Anzeige vorsehen. Code: [Antwortdarstellung](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/components/quiz/AnswerOption.tsx).
- **Produktionsfehler sichtbar machen.** Die Analytics-Abstraktion ist brauchbar, der Produktionsanbieter ist aber ein No-op; das Logging schreibt auf die Konsole. Ein kleiner, datensparsamer Fehlerkanal für Start-, Speicher- und Abschlussfehler würde echte Probleme der Tester sichtbar machen. Nutzungsanalyse und Fehlerberichte bewusst getrennt planen. Code: [Analytics](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/services/analytics/analytics.ts), [Logging](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/services/errors/logger.ts).
- **UI-Härtung auf echten Geräten.** Gute Grundlagen sind vorhanden: beschriftete Buttons, Accessibility-Rollen, ausreichend große Touchflächen und Text für richtig/falsch. Ergänzend VoiceOver/TalkBack, größte Schrift, kleine Displays, Tastatur, Android-Zurück-Taste, reduzierte Bewegung und App-Wechsel während des Timers prüfen. Das ist ein noch offener Gerätetest, kein behaupteter visueller Mangel.
- **Dokumentation an den Stand anpassen.** Kommentare und Architekturtexte beschreiben teilweise frühere Gast- oder Featurezustände. Sicherheitsversprechen in Kommentaren sollten durch Tests gedeckt sein. Besonders bei mehrfach ersetzten SQL-Funktionen hilft eine dokumentierte Übersicht des aktuellen Zustands zusätzlich zur Migrationshistorie.
- **Infoseiten vervollständigen.** Datenschutz, Impressum und Nutzungsbedingungen enthalten ausdrücklich Platzhalter; der Datenschutztext beschreibt teilweise noch den alten Gastbetrieb. Vor der Veröffentlichung die tatsächlichen Datenflüsse und Kontaktmöglichkeiten abbilden. Dies ist ein Befund zum vorhandenen Inhalt, keine rechtliche Vollständigkeitsprüfung. Code: [Infotexte](https://github.com/rnld07/QUIZBYTE/blob/7e7321e61dcfa946cc9b7cce860421549806a60d/apps/mobile/src/content/legal.ts).

**Was ich an der vorhandenen Umsetzung beibehalten würde:**

Die fachliche Logik im Shared-Paket ist von React Native und Next.js getrennt und bereits breit getestet. Fragenimport und Veröffentlichung haben eigene Validierungsschritte. Der Admin prüft die Rolle serverseitig, und die Audio-Generierung hält den ElevenLabs-Schlüssel auf dem Server; die App spielt gespeicherte Dateien ab. XP und Richtigkeit werden grundsätzlich im Backend berechnet. Das ist die richtige Richtung, auch wenn die Spielregeln noch strengere Grenzen brauchen.

TanStack Query für Serverdaten und Zustand für lokale UI-/Rundenzustände sind nachvollziehbar eingesetzt. Das zentrale Theme und wiederverwendbare UI-Elemente erleichtern konsistente Anpassungen. Schwächentraining, Fehlerwiederholung, Lesezeichen und Erklärungen geben der App einen Lernnutzen über Punkte und Ranglisten hinaus. Auch Melden, Blockieren, Privatsphäre und Kontolöschung sind als Produktabläufe bereits vorhanden; nun müssen deren Backend-Regeln lückenlos tragen.

**Produktideen, die zum vorhandenen Umfang passen:**

1. Eine Runde zuverlässig fortsetzen können, inklusive klarer Anzeige „Antworten werden noch gespeichert“. Das würde ich vor zusätzlichen Spielmodi umsetzen.
2. Nach einer Runde genau eine passende nächste Lernaktion anbieten, etwa „Diese zwei Fehler wiederholen“ oder „Passenden Lernzettel öffnen“. Vorhandene Funktionen dadurch besser verbinden.
3. Fachlichen Lernfortschritt zusätzlich zur XP-Menge zeigen: Erstversuch, später richtig beantwortet und nach Abstand erneut sicher beantwortet sind unterschiedliche Lernzustände. Die bestehenden Statistiken sind dafür eine gute Grundlage.
4. Wiederholungen nach Zeitabstand anbieten. Bereits gemeisterte Fragen dürfen weiterhin nützlich sein, ohne beliebig neue XP zu erzeugen. Eine kleine tägliche Wiederholungsrunde lässt sich mit dem vorhandenen Bestand testen.
5. Den Einstieg kurz halten: ein Lernziel wählen, eine kurze erste Runde, danach Erklärungen für XP, Schwächen und Daily im jeweiligen Kontext. Vor einer Ausweitung zuerst beobachten, wo echte Tester abbrechen.
6. Im Admin Veröffentlichungsqualität unterstützen: klare Vorschau, unvollständige Entwürfe, Dublettenhinweise und eine sichtbare Liste offener Fragenmeldungen. Das unterstützt deine spätere Contentpflege, ohne den Fragenbestand hier zu bewerten.

**Empfohlene Bearbeitungsreihenfolge:**

| Schritt | Konkretes Ziel | Fertig, wenn … |
|---|---|---|
| 1 | Reproduzierbaren grünen Ausgangspunkt herstellen | SVG-Abhängigkeit korrekt, Typecheck/Lint/Tests grün, DB-Smoke-Test aktualisiert |
| 2 | Datenzugriffe absichern | Erzwungene Freundschaft, Block-Bypass, anonyme RPCs, gefälschte Logs und soziale Aktionen gesperrter Konten scheitern in Tests |
| 3 | Rundenzustand und Belohnungen verbindlich machen | Session-Erstellung, Fragenset, Duellbindung, Daily-Vergabe und Abschluss serverseitig geprüft |
| 4 | Antworten zuverlässig speichern | Offline, langsamer letzter Request, App-Neustart und Kontowechsel verlieren keine Antworten und vermischen keine Konten |
| 5 | Bestehende Nutzer-/Adminabläufe abschließen | Recovery, Chat-Pagination, Feature-Schalter, Uploads und Entwürfe funktionieren durchgehend |
| 6 | Echte Geräte und kleine Beta | Reale iOS-/Android-Builds, große Schrift, App-Wechsel und schlechte Verbindung geprüft; Fehler nachvollziehbar erfasst |

Die Architektur würde ich dafür beibehalten und gezielt härten. „Perfekt“ lässt sich nicht garantieren; ein sinnvoller nächster Meilenstein ist eine Version, deren Rechte, Wertung und Speicherung mit klaren Regressionstests abgesichert sind. Danach lassen sich Oberfläche und Lernführung mit echtem Nutzerfeedback gezielt verbessern.
