-- Operational hardening:
-- - addresses and restaurant coordinates are written only by trusted server code;
-- - partner activation requires valid delivery coordinates;
-- - direct order workflow mutation is removed from authenticated clients;
-- - privileged restaurant/application fields cannot be self-promoted.

ALTER TABLE public.client_addresses
  ADD COLUMN IF NOT EXISTS address_line text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Earlier production versions could contain a reduced partner application
-- table created before the complete schema migration.
ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

UPDATE public.client_addresses
SET address_line = coalesce(address_line, full_address)
WHERE address_line IS NULL;

WITH ranked_defaults AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY is_default DESC, updated_at DESC NULLS LAST, created_at DESC
    ) AS position
  FROM public.client_addresses
)
UPDATE public.client_addresses address
SET is_default = ranked.position = 1
FROM ranked_defaults ranked
WHERE address.id = ranked.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_addresses_one_default
  ON public.client_addresses(user_id)
  WHERE is_default = true;

CREATE OR REPLACE FUNCTION public.trusted_server_operation()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT current_user IN ('postgres', 'service_role', 'supabase_admin');
$$;

REVOKE ALL ON FUNCTION public.trusted_server_operation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trusted_server_operation() TO service_role;

CREATE OR REPLACE FUNCTION public.save_client_delivery_address_server(
  target_user_id uuid,
  target_address_id uuid,
  target_label text,
  target_address text,
  target_postal_code text,
  target_city text,
  target_latitude numeric,
  target_longitude numeric,
  make_default boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved_address_id uuid;
BEGIN
  IF NOT public.trusted_server_operation() THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF target_latitude NOT BETWEEN -90 AND 90
     OR target_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  IF make_default THEN
    UPDATE public.client_addresses
    SET is_default = false, updated_at = now()
    WHERE user_id = target_user_id AND is_default = true;
  END IF;

  IF target_address_id IS NULL THEN
    INSERT INTO public.client_addresses (
      user_id, label, full_address, address_line, postal_code, city,
      latitude, longitude, is_default
    ) VALUES (
      target_user_id, target_label, target_address, target_address,
      target_postal_code, target_city, target_latitude, target_longitude,
      make_default
    )
    RETURNING id INTO saved_address_id;
  ELSE
    UPDATE public.client_addresses
    SET label = target_label,
        full_address = target_address,
        address_line = target_address,
        postal_code = target_postal_code,
        city = target_city,
        latitude = target_latitude,
        longitude = target_longitude,
        is_default = make_default OR is_default,
        updated_at = now()
    WHERE id = target_address_id AND user_id = target_user_id
    RETURNING id INTO saved_address_id;
    IF saved_address_id IS NULL THEN
      RAISE EXCEPTION 'Address not found';
    END IF;
  END IF;

  IF make_default THEN
    UPDATE public.profiles
    SET address = target_address,
        postal_code = target_postal_code,
        city = target_city,
        latitude = target_latitude,
        longitude = target_longitude,
        updated_at = now()
    WHERE id = target_user_id AND role = 'client';
  END IF;

  RETURN saved_address_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_client_default_address_server(
  target_user_id uuid,
  target_address_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_address public.client_addresses%ROWTYPE;
BEGIN
  IF NOT public.trusted_server_operation() THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  SELECT * INTO selected_address
  FROM public.client_addresses
  WHERE id = target_address_id AND user_id = target_user_id;
  IF selected_address.id IS NULL THEN
    RAISE EXCEPTION 'Address not found';
  END IF;
  IF selected_address.latitude IS NULL OR selected_address.longitude IS NULL THEN
    RAISE EXCEPTION 'Address has no verified coordinates';
  END IF;

  UPDATE public.client_addresses
  SET is_default = id = target_address_id, updated_at = now()
  WHERE user_id = target_user_id;

  UPDATE public.profiles
  SET address = coalesce(selected_address.address_line, selected_address.full_address),
      postal_code = selected_address.postal_code,
      city = selected_address.city,
      latitude = selected_address.latitude,
      longitude = selected_address.longitude,
      updated_at = now()
  WHERE id = target_user_id AND role = 'client';
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_client_address_server(
  target_user_id uuid,
  target_address_id uuid
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
  IF EXISTS (
    SELECT 1 FROM public.client_addresses
    WHERE id = target_address_id AND user_id = target_user_id AND is_default
  ) THEN
    RAISE EXCEPTION 'Cannot delete default address';
  END IF;
  DELETE FROM public.client_addresses
  WHERE id = target_address_id AND user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_partner_establishment_server(
  target_user_id uuid,
  target_name text,
  target_siret text,
  target_phone text,
  target_address text,
  target_postal_code text,
  target_city text,
  target_description text,
  target_latitude numeric,
  target_longitude numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saved_restaurant_id uuid;
BEGIN
  IF NOT public.trusted_server_operation() THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF target_latitude NOT BETWEEN -90 AND 90
     OR target_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  SELECT id INTO saved_restaurant_id
  FROM public.restaurants
  WHERE owner_id = target_user_id
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF saved_restaurant_id IS NOT NULL THEN
    UPDATE public.restaurants
    SET name = target_name,
        siret = target_siret,
        phone = target_phone,
        address = target_address,
        postal_code = target_postal_code,
        city = target_city,
        description = target_description,
        latitude = target_latitude,
        longitude = target_longitude,
        updated_at = now()
    WHERE id = saved_restaurant_id;
  ELSE
    INSERT INTO public.restaurants (
      owner_id, name, siret, phone, address, postal_code, city, description,
      latitude, longitude, status, is_active
    ) VALUES (
      target_user_id, target_name, target_siret, target_phone, target_address,
      target_postal_code, target_city, target_description, target_latitude,
      target_longitude, 'pending', false
    )
    RETURNING id INTO saved_restaurant_id;
  END IF;
  IF saved_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Unable to save restaurant';
  END IF;

  UPDATE public.partner_applications
  SET business_name = target_name,
      siret = target_siret,
      phone = target_phone,
      address = target_address,
      postal_code = target_postal_code,
      city = target_city,
      description = target_description,
      latitude = target_latitude,
      longitude = target_longitude,
      updated_at = now()
  WHERE user_id = target_user_id;

  RETURN saved_restaurant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_client_delivery_address_server(uuid, uuid, text, text, text, text, numeric, numeric, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_client_default_address_server(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_client_address_server(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_partner_establishment_server(uuid, text, text, text, text, text, text, text, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_client_delivery_address_server(uuid, uuid, text, text, text, text, numeric, numeric, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_client_default_address_server(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_client_address_server(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_partner_establishment_server(uuid, text, text, text, text, text, text, text, numeric, numeric) TO service_role;

DROP POLICY IF EXISTS "client_addresses_own_mvp" ON public.client_addresses;
CREATE POLICY "client_addresses_select_own_phase3"
ON public.client_addresses FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "orders_update_involved_mvp" ON public.orders;

DROP POLICY IF EXISTS "restaurants_insert_owner_mvp" ON public.restaurants;

CREATE OR REPLACE FUNCTION public.protect_restaurant_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.current_user_has_role('admin') THEN
    NEW.owner_id := OLD.owner_id;
    NEW.status := OLD.status;
    NEW.is_active := OLD.is_active;
    NEW.siret := OLD.siret;
    NEW.address := OLD.address;
    NEW.postal_code := OLD.postal_code;
    NEW.city := OLD.city;
    NEW.latitude := OLD.latitude;
    NEW.longitude := OLD.longitude;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_restaurant_privileged_fields ON public.restaurants;
CREATE TRIGGER protect_restaurant_privileged_fields
BEFORE UPDATE ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.protect_restaurant_privileged_fields();

CREATE OR REPLACE FUNCTION public.protect_partner_application_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.current_user_has_role('admin') THEN
    NEW.status := OLD.status;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.latitude := OLD.latitude;
    NEW.longitude := OLD.longitude;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_partner_application_review_fields ON public.partner_applications;
CREATE TRIGGER protect_partner_application_review_fields
BEFORE UPDATE ON public.partner_applications
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_application_review_fields();

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
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_partner_status(
  target_restaurant_id uuid,
  target_status text,
  target_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_owner_id uuid;
  previous_restaurant jsonb;
  application_status text;
  target_latitude numeric;
  target_longitude numeric;
BEGIN
  IF NOT public.current_user_has_role('admin') THEN
    RAISE EXCEPTION 'Admin required';
  END IF;
  IF target_status NOT IN ('pending', 'active', 'missing_documents', 'suspended', 'rejected') THEN
    RAISE EXCEPTION 'Invalid partner status';
  END IF;
  IF target_status IN ('missing_documents', 'suspended', 'rejected')
     AND nullif(trim(coalesce(target_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A reason is required for this status';
  END IF;

  SELECT r.owner_id, to_jsonb(r), r.latitude, r.longitude
  INTO target_owner_id, previous_restaurant, target_latitude, target_longitude
  FROM public.restaurants r
  WHERE r.id = target_restaurant_id
  FOR UPDATE;
  IF target_owner_id IS NULL THEN
    RAISE EXCEPTION 'Restaurant not found';
  END IF;
  IF target_status = 'active' AND (
    target_latitude IS NULL OR target_latitude NOT BETWEEN -90 AND 90
    OR target_longitude IS NULL OR target_longitude NOT BETWEEN -180 AND 180
  ) THEN
    RAISE EXCEPTION 'Verified restaurant coordinates are required before activation';
  END IF;

  application_status := CASE target_status
    WHEN 'active' THEN 'validated'
    WHEN 'pending' THEN 'pending'
    ELSE target_status
  END;

  UPDATE public.restaurants
  SET status = CASE WHEN target_status = 'missing_documents' THEN 'pending' ELSE target_status END,
      is_active = target_status = 'active',
      updated_at = now()
  WHERE id = target_restaurant_id;

  UPDATE public.partner_applications
  SET status = application_status,
      rejection_reason = CASE
        WHEN application_status IN ('missing_documents', 'suspended', 'rejected')
          THEN trim(target_reason)
        ELSE NULL
      END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE user_id = target_owner_id;

  UPDATE public.profiles
  SET status = CASE WHEN target_status = 'active' THEN 'validated' ELSE target_status END,
      updated_at = now()
  WHERE id = target_owner_id;

  INSERT INTO public.admin_audit_log (
    admin_id, action, entity_type, entity_id, reason, previous_data, new_data
  )
  SELECT
    auth.uid(), 'partner_status_changed', 'restaurant', target_restaurant_id,
    nullif(trim(coalesce(target_reason, '')), ''), previous_restaurant, to_jsonb(r)
  FROM public.restaurants r
  WHERE r.id = target_restaurant_id;
END;
$$;
