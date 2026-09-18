# QuizByte

Gamifizierte Informatik-Quiz- und Lern-App für iOS und Android, mit Web-Admin-Panel zur Verwaltung der Inhalte.

Kernidee der V1: **Frage beantworten → sofort etwas lernen → Fortschritt sehen → motiviert weitermachen.**

- Mobile App: Expo (React Native), Expo Router, TypeScript
- Backend: Supabase (PostgreSQL, Auth, Storage, Row Level Security)
- Admin: Next.js (App Router), TypeScript, Supabase SSR
- Shared: reine Domänenlogik (XP/Level, Streak, Schwächen, Fragenauswahl, Validierung) mit Tests

Architekturentscheidungen und Datenfluss: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Inhalt

1. [Projektüberblick](#projektüberblick)
2. [Ordnerstruktur](#ordnerstruktur)
3. [Voraussetzungen](#voraussetzungen)
4. [Installation](#installation)
5. [Environment Variables](#environment-variables)
6. [Supabase Setup](#supabase-setup)
7. [Datenbankmigrationen & Seed](#datenbankmigrationen--seed)
8. [Mobile App starten](#mobile-app-starten)
9. [Admin App starten](#admin-app-starten)
10. [Tests, Typecheck, Lint](#tests-typecheck-lint)
11. [Production Build](#production-build)
12. [Feature Flags & Konfiguration](#feature-flags--konfiguration)
13. [Was in V1 bewusst nicht enthalten ist](#was-in-v1-bewusst-nicht-enthalten-ist)

---

## Projektüberblick

| Bereich | Technologie | Ort |
| --- | --- | --- |
| Mobile App (iOS/Android) | Expo SDK 57, React Native 0.86, Expo Router, TanStack Query, Zustand | `apps/mobile` |
| Admin-Panel (Web) | Next.js 16 (App Router), `@supabase/ssr` | `apps/admin` |
| Domänenlogik + Config | TypeScript, Zod, Vitest | `packages/shared` |
| Datenbank | Supabase-Migrationen (SQL), Seed, DB-Typen, Verifikations-Harness | `packages/database` |
| Gemeinsame Tool-Config | `tsconfig`-Basis | `packages/config` |

Was der erste Milestone enthält:

- Anonyme Anmeldung beim ersten Start (kein Login-Zwang), Profil + Progress werden automatisch angelegt
- Quiz-Home mit Kategorien aus der Datenbank + virtueller Kategorie „Random“
- Quiz-Session: 5 Fragen (je nach Modus mehr), Antwort → richtig/falsch → Erklärung → Weiter → Ergebnis
- Optionales 1:1-Bild und vorproduziertes Audio pro Frage (Tippen auf die Frage spielt das Audio)
- Share-Sheet für Fragen (ohne Lösung)
- XP, Level (steigende Kurve), Streak (lokaler Kalendertag), Accuracy, Kategorie-Performance
- „Schwächen trainieren“: erkennt schwache Unterkategorien/Tags ab 3 Versuchen und startet eine passende Session
- Profil (Username/Anzeigename), Einstellungen (Sound, Haptik, Fortschritt zurücksetzen), Mehr-Tab mit rechtlichen Seiten
- Admin: Login (nur Rolle `admin`), Dashboard, Fragenliste mit Suche/Filtern, Frage anlegen/bearbeiten/veröffentlichen/archivieren, Bild-/Audio-Upload, ElevenLabs-Generierung (serverseitig), Kategorien, Bulk-Import (JSON/CSV) mit Validierung und Vorschau

## Ordnerstruktur

```text
quizbyte/
├── apps/
│   ├── mobile/                 Expo-App
│   │   ├── app/                Expo-Router-Routen (Screens)
│   │   │   ├── (tabs)/         Quiz · Fortschritt · (Freunde, versteckt) · Mehr
│   │   │   ├── quiz/           session.tsx, result.tsx
│   │   │   ├── legal/[page]    Datenschutz, Impressum, …
│   │   │   ├── profile.tsx, settings.tsx, _layout.tsx
│   │   ├── src/
│   │   │   ├── components/     ui/ (Design-System-Komponenten), quiz/, progress/, layout/, brand/
│   │   │   ├── features/       Hooks je Feature (quiz, progress, profile, settings, auth)
│   │   │   ├── services/       supabase, api (Repositories), auth, audio, haptics, share, analytics, errors, outbox
│   │   │   ├── state/          Zustand-Stores (settings, auth, quizSession)
│   │   │   ├── theme/          Design-Tokens (colors, spacing, radius, typography)
│   │   │   ├── config/         env, appInfo
│   │   │   └── content/        statische Texte (rechtliche Seiten)
│   │   └── assets/brand/logo.png   ← PLATZHALTER, durch das finale Logo ersetzen
│   └── admin/                  Next.js-Admin
│       ├── app/                Routen: login, (admin)/{dashboard,questions,categories,import}, api/audio/generate
│       ├── src/lib/            supabase-Clients, auth (requireAdmin), queries, actions (Server Actions)
│       ├── src/components/     Formulare, Tabellen, Import-Wizard
│       └── proxy.ts            Session-Refresh + Login-Redirect (Next 16 „Proxy“, ehemals Middleware)
├── packages/
│   ├── shared/src/
│   │   ├── config/             features, quiz, xp, weakness, app
│   │   ├── domain/             xp/level, streak, stats/accuracy, weakness, quiz/selection, quiz/summary
│   │   ├── validation/         username, question (+ Import-Schema)
│   │   ├── analytics/          Event-Katalog + Provider-Interface
│   │   ├── share/              Share-Texte, Deep-Link-Helper
│   │   └── types/              Domänentypen
│   ├── database/
│   │   ├── supabase/migrations Versionierte SQL-Migrationen
│   │   ├── supabase/seed.sql   Entwicklungs-Seed (6 Kategorien, 47 Fragen)
│   │   ├── scripts/            verify-local.sh + Shim + RLS-Smoke-Tests
│   │   └── src/                database.types.ts, STORAGE_BUCKETS
│   └── config/                 tsconfig-Basis
├── docs/ARCHITECTURE.md
└── .github/workflows/ci.yml
```

## Voraussetzungen

- **Node.js 22** (LTS)
- **pnpm 10** – Installation unter Windows: `npm install -g pnpm`
- **Supabase CLI** – wird über `npx supabase` automatisch geladen; für die lokale Supabase-Instanz wird **Docker Desktop** benötigt (Windows: WSL2-Backend).
- Für die App auf dem iPhone: **Expo Go** aus dem App Store (Entwicklung) bzw. später ein Development Build/EAS.
- Optional für `pnpm db:verify` ohne Docker: PostgreSQL-16-Serverbinaries (Linux/macOS/WSL).

## Installation

```bash
git clone <repo-url> quizbyte
cd quizbyte
pnpm install
```

`.env.example`-Dateien kopieren und ausfüllen:

```bash
copy apps\mobile\.env.example apps\mobile\.env      # Windows
copy apps\admin\.env.example apps\admin\.env.local
```

## Environment Variables

### Mobile (`apps/mobile/.env`)

| Variable | Beschreibung |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase-Projekt-URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Öffentlicher anon key (durch RLS geschützt) |
| `EXPO_PUBLIC_APP_ENV` | `development` \| `staging` \| `production` |

Nur `EXPO_PUBLIC_*`-Variablen werden in die App gebündelt. **Niemals** den Service-Role-Key oder ElevenLabs-Keys hier eintragen.

### Admin (`apps/admin/.env.local`)

| Variable | Beschreibung |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Öffentlicher anon key |
| `ELEVENLABS_API_KEY` | Nur Server. Leer lassen → „Audio generieren“ antwortet mit 501 |
| `ELEVENLABS_VOICE_ID` | Nur Server. Voice-ID für die Sprachausgabe |

Das Admin-Panel arbeitet mit der Session des angemeldeten Admins; die Datenbank prüft die Rolle über RLS. Ein Service-Role-Key wird nicht benötigt.

## Supabase Setup

### Variante A – Lokale Instanz (empfohlen für Entwicklung)

```bash
pnpm db:start          # startet Supabase lokal (Docker), wendet Migrationen + Seed an
pnpm db:reset          # setzt die lokale DB zurück (Migrationen + Seed neu)
```

Nach `db:start` zeigt die CLI `API URL` und `anon key` an → in die `.env`-Dateien eintragen.
Anonyme Anmeldungen sind in `packages/database/supabase/config.toml` aktiviert.

### Variante B – Gehostetes Projekt

1. Projekt auf [supabase.com](https://supabase.com) anlegen.
2. **Authentication → Sign In / Providers → Anonymous sign-ins** aktivieren.
3. **Authentication → Providers → Email** aktivieren (für Admin-Login).
4. Migrationen einspielen:

```bash
cd packages/database
npx supabase login
npx supabase link --project-ref <project-ref>
pnpm push               # = supabase db push
```

5. Seed (nur Entwicklung/Staging): SQL-Editor öffnen und `packages/database/supabase/seed.sql` ausführen.

### Admin-Benutzer anlegen

1. Im Supabase-Dashboard unter **Authentication → Users** einen Nutzer mit E-Mail + Passwort anlegen (oder per Admin-Login-Formular scheitern lassen – Registrierung ist im Admin bewusst nicht vorgesehen).
2. Rolle setzen (SQL-Editor):

```sql
update public.profiles set role = 'admin' where id = '<user-uuid>';
```

Nur `postgres`/Service-Role dürfen die Rolle ändern; App-Nutzer können sie nicht manipulieren (Spaltenrechte + Trigger).

## Datenbankmigrationen & Seed

Das Schema wird ausschließlich über versionierte Migrationen in `packages/database/supabase/migrations/` gepflegt.

| Migration | Inhalt |
| --- | --- |
| `…000100_foundation` | Enums, `set_updated_at()` |
| `…000200_profiles` | `profiles`, Rollen, `is_admin()`, Username-Generierung, Schutz-Trigger |
| `…000300_categories` | `categories` + RLS |
| `…000400_questions` | `questions`, Publish-Validierung, `user_has_pro()`, View `categories_overview` |
| `…000500_progress_sessions_attempts` | `user_progress`, `quiz_sessions`, `quiz_attempts`, serverseitige Bewertung, Streak, `complete_quiz_session()`, `reset_my_progress()` |
| `…000600_quiz_functions` | RPCs: `get_session_questions`, `get_training_questions`, `get_my_category_stats`, `get_my_topic_stats`, `get_admin_dashboard_stats` |
| `…000700_storage` | Buckets `question-images`, `question-audio` + Policies |
| `…000800_avatars` | Bucket `avatars` – seit `…003900_avatar_config` stillgelegt (Avatare werden gezeichnet, nicht hochgeladen) |
| `…000900_wrong_questions` | `count_my_wrong_questions()`, `get_my_wrong_questions()` für „Schwächen trainieren“ |
| `…001000_difficulty_stats` | `get_my_difficulty_stats()` für die detaillierte Analyse |
| `…001100_category_questions` | `get_my_category_questions()` – Fragen hinter den Kategoriezahlen |
| `…001200_question_difficulty` | stuft die Seed-Fragen in leicht/mittel/schwer ein |
| `…001300_category_difficulty_stats` | `get_my_category_difficulty_stats()` je Kategorie |
| `…001400_xp_by_difficulty` | 0 XP für falsche Antworten, 8/12/18 XP je nach Schwierigkeit |
| `…001500_weaknesses` | `dismissed_weaknesses`, Schwächen = alles jemals Falsche |
| `…001600_daily_quiz` | XP für die erste richtige Antwort, Daily Quiz mit doppelter XP |
| `…001700_daily_session_lookup` | `get_my_daily_session_today()` – Ergebnisseite lädt alte Runden nach |
| `…001800_daily_questions` | feste Tagesfragen (Wechsel 0 Uhr Europe/Berlin) |
| `…001900_daily_xp_once` | XP im Daily Quiz nur für die erste Runde des Tages |
| `…002000_weaknesses_exclude_daily` | Daily-Fehler zählen nicht als Schwäche |

Neue Migration anlegen:

```bash
cd packages/database
npx supabase migration new <name>
```

Danach Typen regenerieren (`pnpm db:types` bei lokaler Instanz, `pnpm --filter @quizbyte/database types:remote` bei verlinktem Projekt) und `src/database.types.ts` einchecken.

**Verifikation ohne Docker** (Linux/macOS/WSL/CI): `pnpm db:verify` startet ein temporäres PostgreSQL 16, spielt Shim + Migrationen + Seed ein und führt RLS-/Trigger-Smoke-Tests aus (`packages/database/scripts/local/smoke.sql`).

## Mobile App starten

```bash
pnpm mobile             # = expo start
```

- iPhone: Expo Go öffnen und den QR-Code scannen (gleiches WLAN). Bei einer lokalen Supabase-Instanz muss `EXPO_PUBLIC_SUPABASE_URL` die LAN-IP des Rechners verwenden (z. B. `http://192.168.1.10:54321`), nicht `localhost`.
- Android-Emulator: `pnpm --filter @quizbyte/mobile android`
- Native Projekte erzeugen (für EAS/Xcode): `pnpm --filter @quizbyte/mobile prebuild`

Beim ersten `expo start` werden typisierte Routen unter `.expo/types` generiert.

## Admin App starten

```bash
pnpm admin              # = next dev → http://localhost:3000
```

Login nur mit einem Konto der Rolle `admin` (siehe oben).

## Tests, Typecheck, Lint

```bash
pnpm check              # typecheck + lint + tests in allen Paketen
pnpm test               # nur Tests (Vitest)
pnpm typecheck
pnpm lint
pnpm db:verify          # Migrationen + Seed + RLS-Smoke-Tests (lokales PostgreSQL)
```

Tests decken die kritische Geschäftslogik ab: Level-/XP-Berechnung, Streak, Accuracy, Schwächenerkennung, Fragenauswahl ohne Duplikate, Session-Zusammenfassung, Username-/Fragen-/Import-Validierung, Share-Text, Quiz-Session-Store.

## Production Build

- **Mobile:** EAS Build (`npx eas-cli build --platform ios|android`) oder lokal via `expo prebuild` + Xcode/Android Studio. Bundle-IDs: `app.quizbyte.mobile` (in `apps/mobile/app.json`). Vor dem Release: `assets/brand/logo.png`, App-Icons/Splash in `assets/images/` und die Texte in `src/content/legal.ts` ersetzen.
- **Admin:** `pnpm --filter @quizbyte/admin build` und z. B. auf Vercel deployen (Environment Variables setzen).
- **Datenbank:** `pnpm db:push` gegen das verlinkte Produktionsprojekt.

## Feature Flags & Konfiguration

Zentrale Konfiguration in `packages/shared/src/config/`:

| Datei | Inhalt |
| --- | --- |
| `features.ts` | `pro`, `friends`, `duels`, `community`, `dailyQuiz`, `examMode` (alle `false`), `weaknessTraining`, `questionSharing` (`true`) |
| `quiz.ts` | `DEFAULT_QUIZ_LENGTH = 10`, `MIN_QUESTIONS_TO_START`, `WEAKNESS_PREFERRED_SHARE`, `MAX_POOL_SIZE` |
| `xp.ts` | `CORRECT_ANSWER_XP = 10`, `WRONG_ANSWER_XP = 2`, `SESSION_COMPLETION_XP = 10`, Levelkurve (`LEVEL_BASE_XP = 100`, `LEVEL_STEP_XP = 20`) |
| `weakness.ts` | `MIN_ATTEMPTS = 3`, Schwellen für Schwäche/Stärke, `MAX_TOPICS` |

Wird `features.friends = true`, erscheint der vierte Tab. Wird `features.pro = true`, erscheinen Pro-Menüpunkte; Kategorien/Fragen mit `requires_pro` werden über `public.user_has_pro()` freigeschaltet (aktuell immer `false`).

**Wichtig:** Die XP-Werte pro Antwort/Session sind zusätzlich in der Datenbank hinterlegt (`xp_for_answer`, `xp_for_session_completion`) – bei Änderungen beide Stellen anpassen.

## Was in V1 bewusst nicht enthalten ist

Vorbereitet, aber nicht implementiert (siehe `docs/ARCHITECTURE.md`): Freunde, Quizduelle (`session_type = duel`), Daily Quiz, Prüfungsmodus, Pro/Abos/StoreKit, Community/Chat, Push-Notifications, Leaderboards, Achievements, Account-Upgrade-UI (Apple/Google-Login), Deep-Link-Routing für geteilte Fragen (stabile Frage-IDs und `buildQuestionDeepLink` existieren bereits).
