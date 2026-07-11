-- Courier availability preferences:
-- - keep the legacy single availability column for backward compatibility;
-- - add multi-slot preferences, preferred days and a flexible flag;
-- - allow admins and future dispatch logic to classify couriers more precisely.

ALTER TABLE public.prelaunch_driver_details
  ADD COLUMN IF NOT EXISTS availability_slots text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_flexible boolean NOT NULL DEFAULT false;

ALTER TABLE public.courier_applications
  ADD COLUMN IF NOT EXISTS availability_slots text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_days text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_flexible boolean NOT NULL DEFAULT false;

ALTER TABLE public.courier_applications
  DROP CONSTRAINT IF EXISTS courier_applications_vehicle_type_check;

ALTER TABLE public.courier_applications
  ADD CONSTRAINT courier_applications_vehicle_type_check
    CHECK (
      vehicle_type IS NULL
      OR vehicle_type IN ('bike', 'velo', 'scooter', 'motorcycle', 'moto', 'car', 'voiture', 'autre')
    );

UPDATE public.prelaunch_driver_details
SET availability_slots = CASE
    WHEN availability_slots && ARRAY['matin', 'midi', 'apres_midi', 'soiree', 'nuit', 'week_end']::text[]
      THEN ARRAY(
        SELECT DISTINCT slot
        FROM unnest(availability_slots) AS slot
        WHERE slot = ANY (ARRAY['matin', 'midi', 'apres_midi', 'soiree', 'nuit', 'week_end']::text[])
      )
    WHEN availability = 'journee' THEN ARRAY['matin', 'midi', 'apres_midi']
    WHEN availability IN ('soiree', 'nuit', 'week_end') THEN ARRAY[availability]
    ELSE '{}'
  END,
  availability_days = CASE
    WHEN availability_days && ARRAY['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']::text[]
      THEN ARRAY(
        SELECT DISTINCT day
        FROM unnest(availability_days) AS day
        WHERE day = ANY (ARRAY['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']::text[])
      )
    WHEN availability = 'week_end' THEN ARRAY['samedi', 'dimanche']
    ELSE ARRAY['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']
  END
WHERE availability_slots IS NOT NULL
   OR availability_days IS NOT NULL;

UPDATE public.courier_applications
SET availability_slots = ARRAY(
    SELECT DISTINCT slot
    FROM unnest(availability_slots) AS slot
    WHERE slot = ANY (ARRAY['matin', 'midi', 'apres_midi', 'soiree', 'nuit', 'week_end']::text[])
  ),
  availability_days = ARRAY(
    SELECT DISTINCT day
    FROM unnest(availability_days) AS day
    WHERE day = ANY (ARRAY['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']::text[])
  );

ALTER TABLE public.prelaunch_driver_details
  DROP CONSTRAINT IF EXISTS prelaunch_driver_details_availability_slots_check,
  DROP CONSTRAINT IF EXISTS prelaunch_driver_details_availability_days_check,
  DROP CONSTRAINT IF EXISTS prelaunch_driver_details_availability_required_check;

ALTER TABLE public.prelaunch_driver_details
  ADD CONSTRAINT prelaunch_driver_details_availability_slots_check
    CHECK (availability_slots <@ ARRAY['matin', 'midi', 'apres_midi', 'soiree', 'nuit', 'week_end']::text[]),
  ADD CONSTRAINT prelaunch_driver_details_availability_days_check
    CHECK (availability_days <@ ARRAY['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']::text[]),
  ADD CONSTRAINT prelaunch_driver_details_availability_required_check
    CHECK (
      availability_flexible
      OR coalesce(array_length(availability_slots, 1), 0) > 0
      OR coalesce(array_length(availability_days, 1), 0) > 0
    );

ALTER TABLE public.courier_applications
  DROP CONSTRAINT IF EXISTS courier_applications_availability_slots_check,
  DROP CONSTRAINT IF EXISTS courier_applications_availability_days_check;

ALTER TABLE public.courier_applications
  ADD CONSTRAINT courier_applications_availability_slots_check
    CHECK (availability_slots <@ ARRAY['matin', 'midi', 'apres_midi', 'soiree', 'nuit', 'week_end']::text[]),
  ADD CONSTRAINT courier_applications_availability_days_check
    CHECK (availability_days <@ ARRAY['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']::text[]);
