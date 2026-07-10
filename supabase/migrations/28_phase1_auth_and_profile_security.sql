-- Phase 1 security consolidation:
-- - one authoritative auth bootstrap trigger;
-- - public signup roles limited to client/partner/courier;
-- - no client-side profile creation or privilege assignment;
-- - no referral reward before a later paid-order validation flow;
-- - profile rows readable only by their owner or an administrator;
-- - cross-role operational contact data exposed through narrow RPCs.

-- ---------------------------------------------------------------------------
-- Authoritative user bootstrap
-- ---------------------------------------------------------------------------

-- Repair schema drift caused by earlier CREATE TABLE IF NOT EXISTS migrations
-- when a minimal partner_applications table already existed.
ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS documents_url text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone;

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_applications_siret_phase1
  ON public.partner_applications(siret)
  WHERE siret IS NOT NULL;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_foodiz ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_foodiz_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requested_role text;
  sponsor_id uuid;
  supplied_ref_code text;
  generated_code text;
BEGIN
  requested_role := CASE
    WHEN NEW.raw_user_meta_data ->> 'role' IN ('client', 'partner', 'courier')
      THEN NEW.raw_user_meta_data ->> 'role'
    ELSE 'client'
  END;
  generated_code := public.generate_foodiz_ref_code(NEW.id);

  INSERT INTO public.profiles (
    id, role, email, first_name, last_name, full_name, phone, address,
    postal_code, city, cgu_accepted, status, ref_code
  ) VALUES (
    NEW.id,
    requested_role,
    NEW.email,
    nullif(NEW.raw_user_meta_data ->> 'first_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'last_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'full_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'phone', ''),
    nullif(NEW.raw_user_meta_data ->> 'address', ''),
    nullif(NEW.raw_user_meta_data ->> 'postal_code', ''),
    nullif(NEW.raw_user_meta_data ->> 'city', ''),
    coalesce((NEW.raw_user_meta_data ->> 'cgu_accepted')::boolean, false),
    CASE WHEN requested_role = 'client' THEN 'active' ELSE 'pending' END,
    generated_code
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    ref_code = coalesce(public.profiles.ref_code, EXCLUDED.ref_code);

  IF requested_role = 'client' THEN
    INSERT INTO public.client_wallets (user_id, points_balance, loyalty_tier)
    VALUES (NEW.id, 0, 'bronze')
    ON CONFLICT (user_id) DO NOTHING;

    supplied_ref_code := upper(nullif(trim(NEW.raw_user_meta_data ->> 'ref_code'), ''));
    IF supplied_ref_code IS NOT NULL THEN
      SELECT id
      INTO sponsor_id
      FROM public.profiles
      WHERE upper(ref_code) = supplied_ref_code
        AND id <> NEW.id
        AND role = 'client';

      IF sponsor_id IS NOT NULL THEN
        INSERT INTO public.referrals (
          parrain_id, filleul_id, code, status, reward_points, completed_at
        ) VALUES (
          sponsor_id, NEW.id, supplied_ref_code, 'pending', 500, NULL
        )
        ON CONFLICT (filleul_id) DO NOTHING;
      END IF;
    END IF;
  ELSIF requested_role = 'partner' THEN
    INSERT INTO public.restaurants (
      owner_id, name, siret, phone, address, postal_code, city, status, is_active
    ) VALUES (
      NEW.id,
      coalesce(
        nullif(NEW.raw_user_meta_data ->> 'business_name', ''),
        nullif(NEW.raw_user_meta_data ->> 'full_name', ''),
        'Établissement Weello'
      ),
      nullif(NEW.raw_user_meta_data ->> 'siret', ''),
      nullif(NEW.raw_user_meta_data ->> 'phone', ''),
      nullif(NEW.raw_user_meta_data ->> 'address', ''),
      nullif(NEW.raw_user_meta_data ->> 'postal_code', ''),
      nullif(NEW.raw_user_meta_data ->> 'city', ''),
      'pending',
      false
    )
    ON CONFLICT (siret) DO NOTHING;

    INSERT INTO public.partner_applications (
      user_id, business_name, siret, phone, email, address, postal_code, city, status
    ) VALUES (
      NEW.id,
      coalesce(
        nullif(NEW.raw_user_meta_data ->> 'business_name', ''),
        nullif(NEW.raw_user_meta_data ->> 'full_name', ''),
        'Établissement Weello'
      ),
      nullif(NEW.raw_user_meta_data ->> 'siret', ''),
      nullif(NEW.raw_user_meta_data ->> 'phone', ''),
      NEW.email,
      nullif(NEW.raw_user_meta_data ->> 'address', ''),
      nullif(NEW.raw_user_meta_data ->> 'postal_code', ''),
      nullif(NEW.raw_user_meta_data ->> 'city', ''),
      'pending'
    )
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF requested_role = 'courier' THEN
    INSERT INTO public.courier_applications (user_id, city, status)
    VALUES (NEW.id, nullif(NEW.raw_user_meta_data ->> 'city', ''), 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_foodiz_user() FROM PUBLIC;

CREATE TRIGGER on_auth_user_created_foodiz
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_foodiz_user();

CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  UPDATE public.profiles
  SET role = 'admin',
      status = 'active',
      updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.promote_user_to_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.promote_user_to_admin(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.promote_user_to_admin(uuid) TO service_role;

-- Repair the deployed delivery-code function: Supabase installs pgcrypto in
-- the extensions schema, which is not part of this function's search_path.
CREATE OR REPLACE FUNCTION public.create_order_delivery_code(
  target_order_id uuid,
  target_client_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  candidate text;
  existing_code text;
  allocation_attempt integer;
  entropy bytea;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE id = target_order_id AND client_id = target_client_id
  ) THEN
    RAISE EXCEPTION 'Order does not belong to client';
  END IF;

  SELECT code
  INTO existing_code
  FROM public.client_delivery_codes
  WHERE order_id = target_order_id;
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;

  FOR allocation_attempt IN 1..25 LOOP
    entropy := extensions.gen_random_bytes(4);
    candidate := (100000 + mod(
      get_byte(entropy, 0)::bigint * 16777216
      + get_byte(entropy, 1)::bigint * 65536
      + get_byte(entropy, 2)::bigint * 256
      + get_byte(entropy, 3)::bigint,
      900000
    ))::text;

    BEGIN
      INSERT INTO public.client_delivery_codes (order_id, client_id, code)
      VALUES (target_order_id, target_client_id, candidate);

      INSERT INTO public.delivery_code_verifications (order_id, code_hash)
      VALUES (
        target_order_id,
        encode(extensions.digest(candidate, 'sha256'), 'hex')
      );

      RETURN candidate;
    EXCEPTION WHEN unique_violation THEN
      SELECT code
      INTO existing_code
      FROM public.client_delivery_codes
      WHERE order_id = target_order_id;
      IF existing_code IS NOT NULL THEN
        RETURN existing_code;
      END IF;
    END;
  END LOOP;

  RAISE EXCEPTION 'Unable to allocate a unique delivery code';
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_delivery_code(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_delivery_code(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Profiles: self/admin only, no direct authenticated INSERT or DELETE
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Profiles are viewable by user" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own_mvp" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all_mvp" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_production" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_production" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_self_or_admin_phase1" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self_or_admin_phase1" ON public.profiles;

DROP FUNCTION IF EXISTS public.can_view_profile(uuid);

CREATE POLICY "profiles_select_self_or_admin_phase1"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR public.current_user_has_role('admin')
);

CREATE POLICY "profiles_update_self_or_admin_phase1"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id
  OR public.current_user_has_role('admin')
)
WITH CHECK (
  auth.uid() = id
  OR public.current_user_has_role('admin')
);

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- SQL editor, migrations and service-role operations are trusted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.current_user_has_role('admin') THEN
    NEW.role := OLD.role;
    NEW.status := OLD.status;
    NEW.referral_count := OLD.referral_count;
    NEW.ref_code := OLD.ref_code;
    NEW.email := OLD.email;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_privileged_fields();

DROP POLICY IF EXISTS "partner_apps_insert_own_mvp" ON public.partner_applications;
CREATE POLICY "partner_apps_insert_role_phase1"
ON public.partner_applications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.current_user_has_role('partner')
);

DROP POLICY IF EXISTS "courier_apps_insert_own_mvp" ON public.courier_applications;
CREATE POLICY "courier_apps_insert_role_phase1"
ON public.courier_applications
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.current_user_has_role('courier')
);

-- ---------------------------------------------------------------------------
-- Narrow cross-role data APIs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_partner_order_customers()
RETURNS TABLE (
  order_id uuid,
  client_id uuid,
  display_name text,
  phone text,
  address text,
  postal_code text,
  city text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    orders.id,
    client.id,
    coalesce(
      nullif(client.full_name, ''),
      nullif(concat_ws(' ', client.first_name, client.last_name), ''),
      'Client Weello'
    ),
    CASE
      WHEN orders.status IN ('pending', 'preparing', 'ready', 'pickup', 'picked_up', 'delivering')
        THEN client.phone
      ELSE NULL
    END,
    CASE
      WHEN orders.status IN ('pending', 'preparing', 'ready', 'pickup', 'picked_up', 'delivering')
        THEN client.address
      ELSE NULL
    END,
    CASE
      WHEN orders.status IN ('pending', 'preparing', 'ready', 'pickup', 'picked_up', 'delivering')
        THEN client.postal_code
      ELSE NULL
    END,
    CASE
      WHEN orders.status IN ('pending', 'preparing', 'ready', 'pickup', 'picked_up', 'delivering')
        THEN client.city
      ELSE NULL
    END
  FROM public.orders orders
  JOIN public.restaurants restaurant ON restaurant.id = orders.restaurant_id
  JOIN public.profiles client ON client.id = orders.client_id
  WHERE restaurant.owner_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_courier_order_client_contact(target_order_id uuid)
RETURNS TABLE (
  profile_id uuid,
  display_name text,
  first_name text,
  phone text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    client.id,
    coalesce(
      nullif(client.full_name, ''),
      nullif(concat_ws(' ', client.first_name, client.last_name), ''),
      'Client Weello'
    ),
    client.first_name,
    client.phone
  FROM public.orders orders
  JOIN public.profiles client ON client.id = orders.client_id
  WHERE orders.id = target_order_id
    AND orders.courier_id = auth.uid()
    AND orders.status IN ('pickup', 'picked_up', 'delivering');
$$;

CREATE OR REPLACE FUNCTION public.get_client_order_courier_contact(target_order_id uuid)
RETURNS TABLE (
  profile_id uuid,
  display_name text,
  first_name text,
  last_name text,
  phone text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    courier.id,
    coalesce(
      nullif(courier.full_name, ''),
      nullif(concat_ws(' ', courier.first_name, courier.last_name), ''),
      'Livreur Weello'
    ),
    courier.first_name,
    courier.last_name,
    courier.phone,
    courier.avatar_url
  FROM public.orders orders
  JOIN public.profiles courier ON courier.id = orders.courier_id
  WHERE orders.id = target_order_id
    AND orders.client_id = auth.uid()
    AND orders.status IN ('pickup', 'picked_up', 'delivering', 'delivered');
$$;

REVOKE ALL ON FUNCTION public.get_partner_order_customers() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_courier_order_client_contact(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_client_order_courier_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_order_customers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_courier_order_client_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_order_courier_contact(uuid) TO authenticated;
