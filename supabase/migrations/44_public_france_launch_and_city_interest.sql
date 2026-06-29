-- Public France launch:
-- - authentication is open nationwide;
-- - historical prelaunch accounts remain preserved and become usable;
-- - professional access still depends on dossier validation;
-- - clients outside an active delivery area can request Foodiz in their city.

INSERT INTO public.app_settings (key, value)
VALUES (
  'launch_status',
  '{"launched": true, "mode": "public_france"}'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = coalesce(public.app_settings.value, '{}'::jsonb)
  || '{"launched": true, "mode": "public_france"}'::jsonb,
    updated_at = now();

UPDATE public.prelaunch_profiles
SET status = 'activated',
    activated_at = coalesce(activated_at, now()),
    updated_at = now()
WHERE status IN ('prelaunch_pending', 'launch_email_sent');

CREATE TABLE IF NOT EXISTS public.city_expansion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_area_id uuid NOT NULL REFERENCES public.service_areas(id) ON DELETE CASCADE,
  city text NOT NULL,
  postal_code text NOT NULL CHECK (postal_code ~ '^[0-9]{5}$'),
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'reviewing', 'planned', 'opened', 'closed')),
  source text NOT NULL DEFAULT 'client_app'
    CHECK (source IN ('client_app', 'client_web', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, service_area_id)
);

CREATE INDEX IF NOT EXISTS city_expansion_requests_area_status_idx
  ON public.city_expansion_requests(service_area_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS city_expansion_requests_user_idx
  ON public.city_expansion_requests(user_id, created_at DESC);

DROP TRIGGER IF EXISTS set_city_expansion_requests_updated_at
  ON public.city_expansion_requests;
CREATE TRIGGER set_city_expansion_requests_updated_at
BEFORE UPDATE ON public.city_expansion_requests
FOR EACH ROW EXECUTE FUNCTION public.set_prelaunch_updated_at();

ALTER TABLE public.city_expansion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "city_expansion_requests_select_own_or_admin"
  ON public.city_expansion_requests;
CREATE POLICY "city_expansion_requests_select_own_or_admin"
ON public.city_expansion_requests
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.current_user_has_role('admin')
);

DROP POLICY IF EXISTS "city_expansion_requests_admin_update"
  ON public.city_expansion_requests;
CREATE POLICY "city_expansion_requests_admin_update"
ON public.city_expansion_requests
FOR UPDATE
TO authenticated
USING (public.current_user_has_role('admin'))
WITH CHECK (public.current_user_has_role('admin'));

-- The service-role API owns creation so a client cannot submit a city or a
-- user_id different from the verified address attached to their account.
REVOKE INSERT, DELETE ON public.city_expansion_requests FROM authenticated;
GRANT SELECT ON public.city_expansion_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.city_expansion_requests
  TO service_role;

CREATE OR REPLACE FUNCTION public.foodiz_application_access_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND profile.role IN ('admin', 'client', 'partner', 'courier')
      AND coalesce(profile.status, 'active') NOT IN ('suspended', 'rejected')
  );
$$;

REVOKE ALL ON FUNCTION public.foodiz_application_access_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.foodiz_application_access_allowed()
  TO anon, authenticated, service_role;

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
    FROM public.courier_applications application
    JOIN public.service_areas area ON area.id = application.service_area_id
    WHERE application.user_id = target_user_id
      AND application.status = 'validated'
      AND application.document_review_status = 'approved'
      AND area.status IN ('pilot', 'open')
  ) THEN
    RAISE EXCEPTION 'Courier application is not approved or its area is not open';
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

REVOKE ALL ON FUNCTION public.update_courier_presence_server(
  uuid, boolean, numeric, numeric, numeric
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_courier_presence_server(
  uuid, boolean, numeric, numeric, numeric
) TO service_role;
