# QuizByte – notes for AI assistants

Read `README.md` (setup, scripts, folder structure) and `docs/ARCHITECTURE.md`
(decisions, data flow, security model) before changing code.

Ground rules that must not be broken:

- Questions come from the database only. No AI/LLM calls in the quiz flow.
- ElevenLabs is only called from the admin server route, never from clients.
- Clients never write `user_progress`; XP/streak are computed by database triggers.
  XP values live in `packages/shared/src/config/xp.ts` AND `…_xp_by_difficulty.sql` (function `xp_for_answer`) – keep both in sync.
- Feature flags live in `packages/shared/src/config/features.ts`. Pro and Community stay off in V1;
  Friends and Duels shipped and are on.
- Quiz modes live in `packages/shared/src/domain/quiz/modes.ts`. The duel question count there
  (`duelQuestionCount`) AND `duel_question_count()` in SQL must stay in sync.
- Profile pictures are never uploaded. The avatar is drawn from `profiles.avatar_config`;
  the catalogue lives in `packages/shared/src/domain/profile/avatar.ts`. Read it back through
  `normalizeAvatarConfig()` – the database does not validate the ids.
- Business logic goes into `packages/shared` with Vitest tests; UI components stay small.
- Run `pnpm check` (typecheck + lint + tests) and `pnpm db:verify` after changes to migrations.
