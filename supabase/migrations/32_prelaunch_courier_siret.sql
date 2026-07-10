-- Couriers operate as independent professionals in the Weello marketplace.
-- Their SIRET is collected during pre-registration and kept in their
-- role-specific prelaunch details.

ALTER TABLE public.prelaunch_driver_details
  ADD COLUMN IF NOT EXISTS siret text;

ALTER TABLE public.prelaunch_driver_details
  DROP CONSTRAINT IF EXISTS prelaunch_driver_details_siret_format;

ALTER TABLE public.prelaunch_driver_details
  ADD CONSTRAINT prelaunch_driver_details_siret_format
  CHECK (siret IS NULL OR siret ~ '^[0-9]{14}$');

CREATE UNIQUE INDEX IF NOT EXISTS prelaunch_driver_details_siret_unique
  ON public.prelaunch_driver_details (siret)
  WHERE siret IS NOT NULL;
