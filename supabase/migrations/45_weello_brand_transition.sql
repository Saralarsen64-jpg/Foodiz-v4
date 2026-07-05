-- Weello brand transition.
-- This migration keeps historical table/function identifiers stable while
-- replacing customer-visible Foodiz wording in stored content and routines.

UPDATE public.restaurants
SET name = replace(name, 'Foodiz', 'Weello')
WHERE name LIKE '%Foodiz%';

UPDATE public.notifications
SET
  title = replace(title, 'Foodiz', 'Weello'),
  message = replace(message, 'Foodiz', 'Weello')
WHERE title LIKE '%Foodiz%'
   OR message LIKE '%Foodiz%';

UPDATE public.advantage_catalog
SET
  title = replace(title, 'Foodiz', 'Weello'),
  description = replace(description, 'Foodiz', 'Weello')
WHERE title LIKE '%Foodiz%'
   OR description LIKE '%Foodiz%';

UPDATE public.client_locked_advantages
SET
  title = replace(title, 'Foodiz', 'Weello'),
  description = replace(description, 'Foodiz', 'Weello')
WHERE title LIKE '%Foodiz%'
   OR description LIKE '%Foodiz%';

UPDATE public.client_rewards
SET
  title = replace(title, 'Foodiz', 'Weello'),
  description = replace(description, 'Foodiz', 'Weello')
WHERE title LIKE '%Foodiz%'
   OR description LIKE '%Foodiz%';

-- Recreate only public functions containing customer-visible legacy wording.
-- Function names remain unchanged to preserve API and trigger compatibility.
DO $$
DECLARE
  routine record;
BEGIN
  FOR routine IN
    SELECT
      procedure.oid,
      pg_get_functiondef(procedure.oid) AS definition
    FROM pg_proc procedure
    JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prokind = 'f'
      AND pg_get_functiondef(procedure.oid) LIKE '%Foodiz%'
  LOOP
    EXECUTE replace(routine.definition, 'Foodiz', 'Weello');
  END LOOP;
END
$$;

COMMENT ON TABLE public.foodiz_email_events IS
  'Weello transactional email audit trail. Legacy identifier retained for migration compatibility.';

COMMENT ON TABLE public.foodiz_plus_plans IS
  'Weello partner marketing plans. Legacy identifier retained for migration compatibility.';
