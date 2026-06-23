-- Trusted courier presence used by proximity dispatch.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS courier_latitude numeric,
  ADD COLUMN IF NOT EXISTS courier_longitude numeric,
  ADD COLUMN IF NOT EXISTS courier_location_accuracy_meters numeric,
  ADD COLUMN IF NOT EXISTS courier_location_updated_at timestamp with time zone;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_courier_location_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_courier_location_check CHECK (
    (
      courier_latitude IS NULL
      AND courier_longitude IS NULL
      AND courier_location_accuracy_meters IS NULL
    )
    OR (
      courier_latitude BETWEEN -90 AND 90
      AND courier_longitude BETWEEN -180 AND 180
      AND courier_location_accuracy_meters BETWEEN 0 AND 5000
    )
  );

CREATE OR REPLACE FUNCTION public.update_courier_presence_server(
  target_user_id uuid,
  target_online boolean,
  target_latitude numeric,
  target_longitude numeric,
  target_accuracy_meters numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.trusted_server_operation() THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF target_online AND (
    target_latitude IS NULL OR target_latitude NOT BETWEEN -90 AND 90
    OR target_longitude IS NULL OR target_longitude NOT BETWEEN -180 AND 180
    OR target_accuracy_meters IS NULL OR target_accuracy_meters < 0
    OR target_accuracy_meters > 200
  ) THEN
    RAISE EXCEPTION 'A precise location is required to go online';
  END IF;
  IF target_online AND NOT EXISTS (
    SELECT 1
    FROM public.courier_applications
    WHERE user_id = target_user_id
      AND status = 'validated'
      AND document_review_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Courier application is not approved';
  END IF;

  UPDATE public.profiles
  SET courier_online = target_online,
      courier_latitude = CASE WHEN target_online THEN target_latitude ELSE courier_latitude END,
      courier_longitude = CASE WHEN target_online THEN target_longitude ELSE courier_longitude END,
      courier_location_accuracy_meters = CASE WHEN target_online THEN target_accuracy_meters ELSE courier_location_accuracy_meters END,
      courier_location_updated_at = CASE WHEN target_online THEN now() ELSE courier_location_updated_at END,
      updated_at = now()
  WHERE id = target_user_id AND role = 'courier';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Courier profile not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_courier_presence_server(uuid, boolean, numeric, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_courier_presence_server(uuid, boolean, numeric, numeric, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT public.current_user_has_role('admin') THEN
    NEW.role := OLD.role;
    NEW.status := OLD.status;
    NEW.referral_count := OLD.referral_count;
    NEW.ref_code := OLD.ref_code;
    NEW.email := OLD.email;
    IF OLD.role = 'client' THEN
      NEW.address := OLD.address;
      NEW.postal_code := OLD.postal_code;
      NEW.city := OLD.city;
      NEW.latitude := OLD.latitude;
      NEW.longitude := OLD.longitude;
    END IF;
    IF OLD.role = 'courier' THEN
      NEW.courier_online := OLD.courier_online;
      NEW.courier_latitude := OLD.courier_latitude;
      NEW.courier_longitude := OLD.courier_longitude;
      NEW.courier_location_accuracy_meters := OLD.courier_location_accuracy_meters;
      NEW.courier_location_updated_at := OLD.courier_location_updated_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
