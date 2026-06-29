#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POSTGRES_BIN="${POSTGRES_BIN:-/opt/homebrew/opt/postgresql@17/bin}"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/foodiz-migration45.XXXXXX")"
TEST_PORT="${FOODIZ_TEST_PG_PORT:-55432}"
DATABASE_NAME="foodiz_migration_test"

cleanup() {
  "$POSTGRES_BIN/pg_ctl" -D "$TEST_ROOT/data" -m fast stop >/dev/null 2>&1 || true
  rm -rf "$TEST_ROOT"
}
trap cleanup EXIT

"$POSTGRES_BIN/initdb" \
  --pgdata="$TEST_ROOT/data" \
  --auth=trust \
  --no-locale \
  --encoding=UTF8 \
  >/dev/null

"$POSTGRES_BIN/pg_ctl" \
  -D "$TEST_ROOT/data" \
  -o "-p $TEST_PORT -h 127.0.0.1" \
  -w start \
  >/dev/null

"$POSTGRES_BIN/createdb" \
  -h 127.0.0.1 \
  -p "$TEST_PORT" \
  "$DATABASE_NAME"

"$POSTGRES_BIN/psql" \
  -v ON_ERROR_STOP=1 \
  -h 127.0.0.1 \
  -p "$TEST_PORT" \
  -d "$DATABASE_NAME" <<'SQL'
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  latitude numeric,
  longitude numeric
);

-- Reproduce the reduced production table that is missing GPS columns.
CREATE TABLE public.client_addresses (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  is_default boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.profiles (id, latitude, longitude)
VALUES ('11111111-1111-1111-1111-111111111111', 43.8901, -0.4971);

INSERT INTO public.client_addresses (id, user_id, is_default)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  true
);
SQL

"$POSTGRES_BIN/psql" \
  -v ON_ERROR_STOP=1 \
  -h 127.0.0.1 \
  -p "$TEST_PORT" \
  -d "$DATABASE_NAME" \
  -f "$ROOT_DIR/supabase/migrations/45_repair_client_address_coordinates.sql" \
  >/dev/null

"$POSTGRES_BIN/psql" \
  -v ON_ERROR_STOP=1 \
  -h 127.0.0.1 \
  -p "$TEST_PORT" \
  -d "$DATABASE_NAME" <<'SQL'
DO $$
DECLARE
  repaired record;
  coordinate_column_count integer;
BEGIN
  SELECT count(*)
  INTO coordinate_column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'client_addresses'
    AND column_name IN ('latitude', 'longitude');

  IF coordinate_column_count <> 2 THEN
    RAISE EXCEPTION 'GPS coordinate columns were not created';
  END IF;

  SELECT latitude, longitude
  INTO repaired
  FROM public.client_addresses
  WHERE id = '22222222-2222-2222-2222-222222222222';

  IF repaired.latitude <> 43.8901 OR repaired.longitude <> -0.4971 THEN
    RAISE EXCEPTION 'Verified profile coordinates were not preserved';
  END IF;

  BEGIN
    UPDATE public.client_addresses
    SET latitude = 91
    WHERE id = '22222222-2222-2222-2222-222222222222';
    RAISE EXCEPTION 'Invalid latitude unexpectedly accepted';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;
END;
$$;
SQL

echo "Migration 45 local test: PASS"
