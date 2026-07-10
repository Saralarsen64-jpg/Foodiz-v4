-- Emergency access rollback for migration 31.
-- This preserves every pre-registration row while immediately reopening the
-- existing Weello application and removing the restrictive global gate.

BEGIN;

INSERT INTO public.app_settings (key, value)
VALUES ('launch_status', '{"launched": true}'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

DO $$
DECLARE
  target record;
BEGIN
  FOR target IN
    SELECT namespace.nspname AS schemaname, relation.relname AS tablename
    FROM pg_class relation
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind = 'r'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      'foodiz_prelaunch_global_gate',
      target.schemaname,
      target.tablename
    );
  END LOOP;
END;
$$;

COMMIT;
