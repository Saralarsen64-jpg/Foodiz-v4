#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POSTGRES_BIN="${POSTGRES_BIN:-/opt/homebrew/opt/postgresql@17/bin}"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/foodiz-prelaunch-migrations.XXXXXX")"
TEST_PORT="${FOODIZ_TEST_PG_PORT:-55433}"
DATABASE_NAME="foodiz_prelaunch_migrations"

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

psql_test() {
  "$POSTGRES_BIN/psql" \
    -v ON_ERROR_STOP=1 \
    -h 127.0.0.1 \
    -p "$TEST_PORT" \
    -d "$DATABASE_NAME" \
    "$@"
}

psql_test <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END;
$$;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$ SELECT NULL::uuid $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  role text NOT NULL,
  status text,
  updated_at timestamptz DEFAULT now(),
  courier_online boolean DEFAULT false,
  courier_latitude numeric,
  courier_longitude numeric,
  courier_location_accuracy_meters numeric,
  courier_location_updated_at timestamptz
);

CREATE TABLE public.prelaunch_driver_details (
  id uuid PRIMARY KEY,
  availability text
);

CREATE TABLE public.service_areas (
  id uuid PRIMARY KEY,
  status text NOT NULL
);

CREATE TABLE public.courier_applications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  vehicle_type text,
  status text,
  document_review_status text,
  service_area_id uuid REFERENCES public.service_areas(id)
);

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.prelaunch_profiles (
  id uuid PRIMARY KEY,
  status text NOT NULL,
  activated_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE FUNCTION public.set_prelaunch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.current_user_has_role(target_role text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$ SELECT false $$;

CREATE FUNCTION public.trusted_server_operation()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$ SELECT true $$;

INSERT INTO public.profiles (id, role, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'client', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'courier', 'validated');

INSERT INTO public.prelaunch_driver_details (id, availability)
VALUES ('33333333-3333-3333-3333-333333333333', 'week_end');

INSERT INTO public.prelaunch_profiles (id, status)
VALUES ('44444444-4444-4444-4444-444444444444', 'prelaunch_pending');

INSERT INTO public.service_areas (id, status)
VALUES ('55555555-5555-5555-5555-555555555555', 'pilot');

INSERT INTO public.courier_applications (
  id, user_id, vehicle_type, status, document_review_status, service_area_id
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  '22222222-2222-2222-2222-222222222222',
  'bike',
  'validated',
  'approved',
  '55555555-5555-5555-5555-555555555555'
);
SQL

for migration in \
  42_courier_availability_preferences.sql \
  43_foodiz_email_events.sql \
  44_public_france_launch_and_city_interest.sql
do
  psql_test -f "$ROOT_DIR/supabase/migrations/$migration" >/dev/null
done

# Applying the same migrations twice verifies their retry safety.
for migration in \
  42_courier_availability_preferences.sql \
  43_foodiz_email_events.sql \
  44_public_france_launch_and_city_interest.sql
do
  psql_test -f "$ROOT_DIR/supabase/migrations/$migration" >/dev/null
done

psql_test <<'SQL'
DO $$
DECLARE
  driver record;
  launch_setting jsonb;
  prelaunch_status text;
  email_rls boolean;
BEGIN
  SELECT availability_slots, availability_days
  INTO driver
  FROM public.prelaunch_driver_details
  WHERE id = '33333333-3333-3333-3333-333333333333';

  IF driver.availability_slots <> ARRAY['week_end']::text[]
     OR driver.availability_days <> ARRAY['samedi', 'dimanche']::text[] THEN
    RAISE EXCEPTION 'Migration 42 did not preserve legacy availability';
  END IF;

  SELECT relrowsecurity
  INTO email_rls
  FROM pg_class
  WHERE oid = 'public.foodiz_email_events'::regclass;

  IF email_rls IS NOT true THEN
    RAISE EXCEPTION 'Migration 43 did not enable RLS';
  END IF;

  SELECT value
  INTO launch_setting
  FROM public.app_settings
  WHERE key = 'launch_status';

  IF launch_setting ->> 'mode' <> 'public_france'
     OR (launch_setting ->> 'launched')::boolean IS NOT true THEN
    RAISE EXCEPTION 'Migration 44 did not configure public France mode';
  END IF;

  SELECT status
  INTO prelaunch_status
  FROM public.prelaunch_profiles
  WHERE id = '44444444-4444-4444-4444-444444444444';

  IF prelaunch_status <> 'activated' THEN
    RAISE EXCEPTION 'Migration 44 did not preserve and activate legacy account';
  END IF;

  IF to_regclass('public.city_expansion_requests') IS NULL THEN
    RAISE EXCEPTION 'Migration 44 did not create city expansion requests';
  END IF;
END;
$$;
SQL

echo "Migrations 42-44 local test: PASS"
