#!/usr/bin/env bash
# Verifies migrations + seed + RLS smoke tests against a throw-away local
# PostgreSQL 16 cluster (no Docker required). Linux/macOS/WSL.
#
#   pnpm db:verify
#
# Requires PostgreSQL server binaries (initdb, pg_ctl, psql) on the machine.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$HERE/.local-pg"
PORT="${QUIZBYTE_PG_PORT:-54329}"
DB="quizbyte_verify"

PG_BIN="${PG_BIN:-}"
if [[ -z "$PG_BIN" ]]; then
  # The last match wins, so a newer installation overrides an older one.
  # The Windows paths are for Git Bash (/c/...) and WSL (/mnt/c/...).
  for candidate in \
    /usr/lib/postgresql/*/bin \
    /opt/homebrew/opt/postgresql@*/bin \
    /usr/local/pgsql/bin \
    /c/Program\ Files/PostgreSQL/*/bin \
    /mnt/c/Program\ Files/PostgreSQL/*/bin; do
    if [[ -x "$candidate/initdb" ]]; then PG_BIN="$candidate"; fi
  done
fi
if [[ -z "$PG_BIN" || ! -x "$PG_BIN/initdb" ]]; then
  cat >&2 <<'MSG'
initdb not found. This script needs the PostgreSQL *server* binaries, not just psql.

  Linux    sudo apt install postgresql-16
  macOS    brew install postgresql@16
  Windows  install PostgreSQL, then run this from Git Bash or WSL, e.g.
             PG_BIN="/c/Program Files/PostgreSQL/16/bin" pnpm db:verify

Set PG_BIN to the directory that contains initdb, pg_ctl and psql.
MSG
  exit 1
fi

# initdb refuses to run as root – fall back to the postgres OS user.
RUN=()
if [[ "$(id -u)" == "0" ]]; then
  if id postgres >/dev/null 2>&1; then RUN=(runuser -u postgres --); else echo "run as non-root user" >&2; exit 1; fi
fi

cleanup() {
  "${RUN[@]}" "$PG_BIN/pg_ctl" -D "$DATA_DIR/data" -s stop -m immediate >/dev/null 2>&1 || true
  rm -rf "$DATA_DIR"
}
trap cleanup EXIT

rm -rf "$DATA_DIR"
mkdir -p "$DATA_DIR"
if [[ ${#RUN[@]} -gt 0 ]]; then chown postgres "$DATA_DIR"; fi

"${RUN[@]}" "$PG_BIN/initdb" -D "$DATA_DIR/data" -U postgres -A trust --no-locale -E UTF8 >/dev/null
"${RUN[@]}" "$PG_BIN/pg_ctl" -D "$DATA_DIR/data" -s -o "-p $PORT -k $DATA_DIR -c listen_addresses=''" -w start >/dev/null

PSQL=("${RUN[@]}" "$PG_BIN/psql" -v ON_ERROR_STOP=1 -q -h "$DATA_DIR" -p "$PORT" -U postgres)

"${PSQL[@]}" -d postgres -c "create database $DB" >/dev/null
"${PSQL[@]}" -d "$DB" -f "$HERE/scripts/local/supabase_shim.sql"

echo "Applying migrations…"
for file in "$HERE"/supabase/migrations/*.sql; do
  echo "  $(basename "$file")"
  "${PSQL[@]}" -d "$DB" -f "$file"
done

echo "Applying seed…"
"${PSQL[@]}" -d "$DB" -f "$HERE/supabase/seed.sql"

echo "Running smoke tests…"
"${PSQL[@]}" -d "$DB" -f "$HERE/scripts/local/smoke.sql" | tail -n 3

echo "OK – migrations, seed and RLS smoke tests passed."
