-- Anti-multi-account identity lock for Foodiz clients and couriers.
-- Equivalent French phone formats are normalized to the same value.
-- Partners remain outside this particular uniqueness rule because a business
-- contact number can legitimately be shared by several establishment users.

CREATE OR REPLACE FUNCTION public.normalize_foodiz_phone(raw_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = public
AS $$
  WITH cleaned AS (
    SELECT regexp_replace(trim(raw_phone), '[^0-9]', '', 'g') AS digits
  )
  SELECT CASE
    WHEN digits ~ '^0[1-9][0-9]{8}$'
      THEN '+33' || substring(digits FROM 2)
    WHEN digits ~ '^33[1-9][0-9]{8}$'
      THEN '+' || digits
    WHEN digits ~ '^0033[1-9][0-9]{8}$'
      THEN '+' || substring(digits FROM 3)
    WHEN digits ~ '^[1-9][0-9]{7,14}$'
      THEN '+' || digits
    ELSE NULL
  END
  FROM cleaned;
$$;

REVOKE ALL ON FUNCTION public.normalize_foodiz_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_foodiz_phone(text) TO anon, authenticated, service_role;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_normalized text
  GENERATED ALWAYS AS (public.normalize_foodiz_phone(phone)) STORED;

ALTER TABLE public.prelaunch_profiles
  ADD COLUMN IF NOT EXISTS phone_normalized text
  GENERATED ALWAYS AS (public.normalize_foodiz_phone(phone)) STORED;

-- Refuse to continue if historical client/courier accounts already share an
-- identity. This avoids choosing or deleting a legitimate account silently.
DO $$
DECLARE
  duplicate_count integer;
BEGIN
  SELECT count(*)
  INTO duplicate_count
  FROM (
    SELECT phone_normalized
    FROM public.profiles
    WHERE role IN ('client', 'courier')
      AND phone_normalized IS NOT NULL
    GROUP BY phone_normalized
    HAVING count(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION
      'Cannot enable unique phone identity: % duplicate client/courier phone group(s) already exist',
      duplicate_count;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_client_courier_phone_unique
  ON public.profiles (phone_normalized)
  WHERE role IN ('client', 'courier')
    AND phone_normalized IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS prelaunch_client_courier_phone_unique
  ON public.prelaunch_profiles (phone_normalized)
  WHERE role IN ('client', 'livreur')
    AND phone_normalized IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_client_courier_phone_valid;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_client_courier_phone_valid
  CHECK (
    role NOT IN ('client', 'courier')
    OR phone_normalized IS NOT NULL
  ) NOT VALID;

ALTER TABLE public.prelaunch_profiles
  DROP CONSTRAINT IF EXISTS prelaunch_client_courier_phone_valid;

ALTER TABLE public.prelaunch_profiles
  ADD CONSTRAINT prelaunch_client_courier_phone_valid
  CHECK (
    role NOT IN ('client', 'livreur')
    OR phone_normalized IS NOT NULL
  ) NOT VALID;

