# QuizByte – notes for AI assistants

Read `README.md` (setup, scripts, folder structure) and `docs/ARCHITECTURE.md`
(decisions, data flow, security model) before changing code.

Ground rules that must not be broken:

- Questions come from the database only. No AI/LLM calls in the quiz flow.
- ElevenLabs is only called from the admin server route, never from clients.
- Clients never write `user_progress`; XP/streak are computed by database triggers.
  XP values live in `packages/shared/src/config/xp.ts` AND `…_progress_sessions_attempts.sql` – keep both in sync.
- Feature flags live in `packages/shared/src/config/features.ts`. Pro/Friends/Duels/Community stay off in V1.
- Business logic goes into `packages/shared` with Vitest tests; UI components stay small.
- Run `pnpm check` (typecheck + lint + tests) and `pnpm db:verify` after changes to migrations.
