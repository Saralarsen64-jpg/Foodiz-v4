-- Repair production schema drift on client_addresses.
-- Some databases created this table before migrations 04 and 37 and therefore
-- never received the coordinate columns expected by the trusted server RPCs.

ALTER TABLE public.client_addresses
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

ALTER TABLE public.client_addresses
  DROP CONSTRAINT IF EXISTS client_addresses_latitude_check,
  DROP CONSTRAINT IF EXISTS client_addresses_longitude_check;

ALTER TABLE public.client_addresses
  ADD CONSTRAINT client_addresses_latitude_check
    CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT client_addresses_longitude_check
    CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);

-- Preserve already verified profile coordinates when an existing default
-- address predates the dedicated client address coordinate columns.
UPDATE public.client_addresses address
SET latitude = coalesce(address.latitude, profile.latitude),
    longitude = coalesce(address.longitude, profile.longitude),
    updated_at = now()
FROM public.profiles profile
WHERE profile.id = address.user_id
  AND address.is_default = true
  AND (
    address.latitude IS NULL
    OR address.longitude IS NULL
  )
  AND profile.latitude BETWEEN -90 AND 90
  AND profile.longitude BETWEEN -180 AND 180;
