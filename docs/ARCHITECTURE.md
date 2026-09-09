# QuizByte – Architektur

## 1. Überblick

```text
┌──────────────────────┐        ┌──────────────────────┐
│   apps/mobile        │        │   apps/admin          │
│   Expo / RN          │        │   Next.js             │
│   anon key + RLS     │        │   admin session + RLS │
└─────────┬────────────┘        └──────────┬────────────┘
          │  supabase-js (PostgREST, Auth, Storage)    │
          ▼                                            ▼
┌──────────────────────────────────────────────────────────┐
│ Supabase                                                 │
│  auth.users ─trigger─▶ profiles + user_progress          │
│  categories · questions · quiz_sessions · quiz_attempts  │
│  RLS-Policies · SECURITY DEFINER-RPCs · Storage-Buckets  │
└──────────────────────────────────────────────────────────┘
          ▲
          │  packages/shared (Domänenlogik, Config, Typen) wird von beiden Apps genutzt
```

Monorepo mit pnpm-Workspaces (`node-linker=hoisted` – die von Expo empfohlene Einstellung, damit Metro alle Pakete findet). Workspace-Pakete werden als TypeScript-Quelle konsumiert (kein Build-Schritt): Metro transpiliert direkt, Next über `transpilePackages`.

## 2. Wichtige Entscheidungen

| Entscheidung | Begründung |
| --- | --- |
| **Anonyme Auth beim Start** (`supabase.auth.signInAnonymously`) | Kein Registrierungszwang; Fortschritt ist trotzdem an eine echte `auth.users`-ID gebunden. Upgrade zu E-Mail/Apple/Google später über `updateUser`/`linkIdentity` ohne Datenverlust. `profiles.is_anonymous` wird per Trigger synchron gehalten. |
| **Server-seitige Bewertung von Attempts** | `quiz_attempts` werden vom Client eingefügt, aber `is_correct` und `xp_earned` setzt ein `BEFORE INSERT`-Trigger anhand der Frage. `user_progress` wird nur von Triggern/RPCs (SECURITY DEFINER) geschrieben. Clients haben ausschließlich Leserechte → XP/Streak sind manipulationssicher, ohne dass die App-Logik komplizierter wird. |
| **Level wird nie gespeichert** | `computeLevelProgress(totalXp)` in `packages/shared` ist die einzige Quelle; keine Inkonsistenz möglich. |
| **XP-Konstanten doppelt (TS + SQL)** | Bewusster Kompromiss: TS für Anzeige/optimistische Updates und Tests, SQL als autoritative Quelle. Beide Stellen sind kommentiert und minimal (2 Funktionen). |
| **Streak über lokales Kalenderdatum** | Der Client sendet `answered_on` (YYYY-MM-DD in Gerätezeitzone). Der Server akzeptiert ±1 Tag Abweichung zu UTC und wendet dieselben Regeln an wie `applyStreakActivity()` (TS, getestet). |
| **Fragen einer Session werden zu Beginn geladen** | RPC `get_session_questions` liefert einen zufälligen Pool (bis 60), die Auswahl (ohne Duplikate) passiert in `selectSessionQuestions()`. Danach keine weiteren Requests bis zum Ergebnis. Kurze Netzausfälle brechen die Session nicht ab. |
| **Outbox für Attempts** | Schlägt das Speichern einer Antwort wegen Netzfehler fehl, landet sie in einer persistierten Queue (`attemptOutbox`) und wird beim nächsten Foreground/Abschluss erneut gesendet. Idempotent dank `unique (quiz_session_id, question_id)`. |
| **TanStack Query + Zustand** | Serverdaten (Kategorien, Progress, Stats, Profil) über Query mit Caching/Invalidierung; UI-/Session-State (laufendes Quiz, Settings) in kleinen Zustand-Stores. Kein Redux-Boilerplate. |
| **Rollen über `profiles.role`** | RLS-Policies nutzen `is_admin()` (SECURITY DEFINER, ohne Rekursion). Die Spalte ist für `authenticated` nicht updatebar (Spaltenrechte) und zusätzlich per Trigger geschützt. Admin-UI-Routen prüfen serverseitig (`requireAdmin()`), aber die Datenbank ist die letzte Instanz. |
| **Kein Service-Role-Key im Admin** | Alle Admin-Operationen laufen unter der Session des Admins durch RLS. Der Service-Role-Key wird nirgends benötigt. |
| **ElevenLabs nur serverseitig** | `POST /api/audio/generate` prüft Auth + Admin, ruft ElevenLabs, speichert das MP3 im Bucket `question-audio` und setzt `audio_url`. Die App lädt nur die fertige Datei. Ohne Key antwortet die Route mit 501. |
| **Analytics-Abstraktion** | `analytics.track(name, props)` mit typisiertem Event-Katalog (`packages/shared/analytics`). Provider austauschbar (Console in Dev, No-op in Prod, später PostHog/Firebase). |
| **Feature Flags zentral** | `features` in `packages/shared/config/features.ts`. Der Friends-Tab existiert als Route, ist aber über `href: null` versteckt. Pro-Menüpunkte hängen an `features.pro`. |
| **Design-System als Tokens** | `apps/mobile/src/theme/tokens.ts` (colors, spacing, radius, typography). Komponenten (`components/ui`) nutzen ausschließlich Tokens. Dark Mode ist Standard, Light Mode kann später über eine zweite Palette ergänzt werden. |
| **Logo-Platzhalter** | `components/brand/Logo.tsx` ist die einzige Verwendung; `assets/brand/logo.png` austauschen genügt. |

## 3. Datenmodell (public)

| Tabelle | Zweck | Schreibrechte |
| --- | --- | --- |
| `profiles` | Username (case-insensitiv eindeutig), Anzeigename, Avatar, Rolle | eigener Nutzer: `username`, `display_name`, `avatar_url`; Admin: alles |
| `categories` | Kategorien inkl. `requires_pro`, `is_active`, `sort_order`, `icon`, `accent_color` | Admin |
| `questions` | Fragen inkl. `subcategory`, `tags[]`, `difficulty`, `image_url`, `audio_url`, `status`, `requires_pro` | Admin (Publish-Validierung per Trigger) |
| `quiz_sessions` | Runde: Typ, Kategorie, Zähler, `completed_at` | Nutzer: insert; Abschluss über RPC |
| `quiz_attempts` | Jede Antwort: Auswahl, Korrektheit, XP, Antwortzeit, lokales Datum | Nutzer: insert (Werte werden serverseitig berechnet) |
| `user_progress` | XP, Streaks, Zähler | nur Trigger/RPC |
| View `categories_overview` | Kategorien + Anzahl veröffentlichter Fragen (security_invoker) | – |

Enums: `answer_key`, `difficulty_level`, `question_status` (draft/review/published/archived), `session_type` (category/random/weakness/daily/duel/exam), `user_role`.

### RPCs

| Funktion | Sicherheit | Zweck |
| --- | --- | --- |
| `get_session_questions(category_id, limit)` | invoker | zufällige veröffentlichte Fragen (RLS greift) |
| `get_training_questions(subcategories[], tags[], category_ids[], limit)` | invoker | Fragen aus schwachen Themen |
| `get_my_category_stats()` / `get_my_topic_stats()` | definer, nutzerbezogen | Aggregation für Fortschritt/Schwächen (zählt auch archivierte Fragen) |
| `complete_quiz_session(session_id)` | definer | schließt Session ab, vergibt Bonus-XP, idempotent |
| `reset_my_progress()` | definer | löscht eigene Attempts/Sessions, setzt Progress zurück |
| `is_username_available(name)` | definer | Verfügbarkeit ohne Datenleck |
| `get_admin_dashboard_stats()` | definer, admin-only | Zähler für das Dashboard |
| `user_has_pro()` | – | Erweiterungspunkt für Abos (aktuell `false`) |

## 4. Datenfluss einer Quiz-Session

1. Nutzer tippt Kategorie → `useStartQuiz` lädt Kategorien (Cache), ruft `get_session_questions` (Pool), wählt 10 Fragen (`selectSessionQuestions`), legt `quiz_sessions` an, speichert alles im `quizSessionStore`, navigiert zu `/quiz/session`.
2. Antwort → sofortiges UI-Feedback aus lokalen Daten (Korrektheit, XP über `xpForAnswer`), Haptik, Analytics; parallel `insert quiz_attempts` (Server berechnet Werte, aktualisiert Progress/Streak). Bei Netzfehler → Outbox.
3. Erklärung + Weiter → nächste Frage (laufendes Audio wird gestoppt).
4. Letzte Frage → Outbox leeren → `complete_quiz_session` → Ergebnis-Screen mit Server-Progress (Level-Up-Erkennung), Query-Invalidierung für Progress/Stats.

## 5. Schwächenerkennung

`get_my_topic_stats()` liefert Versuche/Treffer pro Kategorie, Unterkategorie und Tag. `detectWeaknesses()` (austauschbares `WeaknessDetector`-Interface) bewertet nur Themen mit ≥ 3 Versuchen (`weaknessConfig.MIN_ATTEMPTS`), sortiert nach Accuracy (Tie-Break: mehr Evidenz). `buildTrainingFocus()` erzeugt die Filter für `get_training_questions`; die Session wird zu ~70 % aus schwachen Themen und zu ~30 % zufällig gefüllt (`WEAKNESS_PREFERRED_SHARE`).

## 6. Fehlerbehandlung

`toAppError()` mappt beliebige Fehler (PostgREST-Codes, Netzwerk) auf stabile Codes mit deutschen Nutzertexten; Entwicklerdetails gehen an `logger`. UI zeigt nur `getUserMessage()`. Skeletons/Empty States/Error States sind zentrale Komponenten (`components/ui/StateViews.tsx`, `Skeleton.tsx`).

## 7. Vorbereitet für später

- **Freunde/Duelle:** Usernames sind eindeutig und normalisiert; `session_type = duel` existiert; ein späteres `duels`-Modell (challenger, opponent, question_ids, scores, status) kollidiert mit nichts.
- **Pro:** `requires_pro` auf Kategorien/Fragen, `user_has_pro()` als Hook, `features.pro`.
- **Daily/Exam:** Session-Typen vorhanden; `difficulty` wird gespeichert (adaptive Quizze, XP-Staffelung).
- **Favoriten/Wiederholen falscher Fragen:** `quiz_attempts` enthält alles Nötige; eine `question_bookmarks`-Tabelle wäre additiv.
- **Deep Links:** `scheme: quizbyte`, stabile Frage-IDs, `buildQuestionDeepLink()`; Route `question/[id]` fehlt bewusst noch.
- **Account-Upgrade:** anonyme Session ist ein echter Auth-User → `updateUser({ email, password })` bzw. OAuth-Linking.
