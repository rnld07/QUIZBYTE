# @quizbyte/database

Supabase schema for QuizByte: versioned migrations, development seed data, generated
TypeScript types and a local verification harness.

```
supabase/
  config.toml          Supabase CLI configuration (anonymous sign-ins enabled)
  migrations/          Versioned SQL migrations – the single source of truth for the schema
  seed.sql             Development seed (6 categories, 47 verified questions)
scripts/
  verify-local.sh      Runs migrations + seed + RLS smoke tests on a throw-away PostgreSQL 16
  local/               Supabase platform shim + smoke tests used by verify-local.sh
src/
  database.types.ts    Supabase-style TypeScript types of the public schema
```

See the root README for setup instructions.
