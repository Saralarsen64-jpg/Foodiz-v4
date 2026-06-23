-- National rollout foundation:
-- - applications accepted throughout France and classified by service area;
-- - partner/courier pilot access granted explicitly by an administrator;
-- - partner legal documents stored privately and reviewed before activation;
-- - documentary approval and commercial activation remain separate decisions.

CREATE TABLE IF NOT EXISTS public.service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  city_normalized text NOT NULL,
  postal_codes text[] NOT NULL DEFAULT '{}',
  department_code text,
  region_name text,
  center_latitude numeric,
  center_longitude numeric,
  delivery_radius_km numeric NOT NULL DEFAULT 10
    CHECK (delivery_radius_km > 0 AND delivery_radius_km <= 100),
  status text NOT NULL DEFAULT 'recruiting'
    CHECK (status IN ('recruiting', 'preparing', 'pilot', 'open', 'paused', 'closed')),
  opened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_normalized, department_code)
);

DROP TRIGGER IF EXISTS set_service_areas_updated_at ON public.service_areas;
CREATE TRIGGER set_service_areas_updated_at
BEFORE UPDATE ON public.service_areas
FOR EACH ROW EXECUTE FUNCTION public.set_prelaunch_updated_at();

CREATE INDEX IF NOT EXISTS service_areas_status_city_idx
  ON public.service_areas(status, city_normalized);

ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_areas_public_read" ON public.service_areas;
CREATE POLICY "service_areas_public_read"
ON public.service_areas FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "service_areas_admin_write" ON public.service_areas;
CREATE POLICY "service_areas_admin_write"
ON public.service_areas FOR ALL
TO authenticated
USING (public.current_user_has_role('admin'))
WITH CHECK (public.current_user_has_role('admin'));

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS service_area_id uuid REFERENCES public.service_areas(id);

ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS service_area_id uuid REFERENCES public.service_areas(id),
  ADD COLUMN IF NOT EXISTS establishment_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS handles_animal_products boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sells_alcohol boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_hygiene_proof boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compliance_status text NOT NULL DEFAULT 'documents_required',
  ADD COLUMN IF NOT EXISTS compliance_comment text,
  ADD COLUMN IF NOT EXISTS documents_submitted_at timestamptz;

ALTER TABLE public.prelaunch_partner_details
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS handles_animal_products boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sells_alcohol boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_hygiene_proof boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS document_review_status text NOT NULL DEFAULT 'documents_required',
  ADD COLUMN IF NOT EXISTS document_review_comment text,
  ADD COLUMN IF NOT EXISTS documents_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS document_upload_token_hash text,
  ADD COLUMN IF NOT EXISTS document_upload_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.prelaunch_partner_details
  DROP CONSTRAINT IF EXISTS prelaunch_partner_details_establishment_type_check,
  DROP CONSTRAINT IF EXISTS prelaunch_partner_details_document_review_status_check;

UPDATE public.prelaunch_partner_details
SET establishment_type = CASE establishment_type
  WHEN 'market' THEN 'supermarket'
  WHEN 'epicerie' THEN 'grocery'
  WHEN 'autre' THEN 'other'
  ELSE establishment_type
END
WHERE establishment_type IN ('market', 'epicerie', 'autre');

ALTER TABLE public.prelaunch_partner_details
  ADD CONSTRAINT prelaunch_partner_details_establishment_type_check
    CHECK (establishment_type IN (
      'restaurant', 'fast_food', 'bakery', 'pastry', 'butcher', 'caterer',
      'grocery', 'greengrocer', 'supermarket', 'local_shop', 'franchise',
      'national_brand', 'other'
    )),
  ADD CONSTRAINT prelaunch_partner_details_document_review_status_check
    CHECK (document_review_status IN (
      'documents_required', 'pending_review', 'replacement_requested',
      'approved', 'rejected', 'expired'
    )),
  ADD CONSTRAINT prelaunch_partner_details_siret_format_check
    CHECK (siret IS NULL OR siret ~ '^[0-9]{14}$');

CREATE UNIQUE INDEX IF NOT EXISTS prelaunch_partner_details_siret_unique
  ON public.prelaunch_partner_details(siret)
  WHERE siret IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS prelaunch_partner_document_token_unique
  ON public.prelaunch_partner_details(document_upload_token_hash)
  WHERE document_upload_token_hash IS NOT NULL;

ALTER TABLE public.partner_applications
  DROP CONSTRAINT IF EXISTS partner_applications_establishment_type_check,
  DROP CONSTRAINT IF EXISTS partner_applications_compliance_status_check;

ALTER TABLE public.partner_applications
  ADD CONSTRAINT partner_applications_establishment_type_check
    CHECK (establishment_type IN (
      'restaurant', 'fast_food', 'bakery', 'pastry', 'butcher', 'caterer',
      'grocery', 'greengrocer', 'supermarket', 'local_shop', 'franchise',
      'national_brand', 'other'
    )),
  ADD CONSTRAINT partner_applications_compliance_status_check
    CHECK (compliance_status IN (
      'documents_required', 'pending_review', 'replacement_requested',
      'approved', 'rejected', 'expired'
    ));

ALTER TABLE public.courier_applications
  ADD COLUMN IF NOT EXISTS service_area_id uuid REFERENCES public.service_areas(id);

ALTER TABLE public.prelaunch_profiles
  ADD COLUMN IF NOT EXISTS access_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_enabled_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_enabled_by uuid REFERENCES public.profiles(id);

ALTER TABLE public.prelaunch_profiles
  DROP CONSTRAINT IF EXISTS prelaunch_profiles_pilot_access_role_check;

ALTER TABLE public.prelaunch_profiles
  ADD CONSTRAINT prelaunch_profiles_pilot_access_role_check
    CHECK (access_enabled = false OR role IN ('livreur', 'partenaire'));

INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'partner-documents',
  'partner-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.partner_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.partner_applications(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN (
    'registration_proof',
    'liability_insurance',
    'hygiene_training',
    'sanitary_declaration',
    'alcohol_license',
    'representative_mandate'
  )),
  storage_path text NOT NULL UNIQUE,
  original_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'application/pdf')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'replacement_requested', 'expired')),
  valid_until date,
  review_comment text,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_type)
);

DROP TRIGGER IF EXISTS set_partner_documents_updated_at ON public.partner_documents;
CREATE TRIGGER set_partner_documents_updated_at
BEFORE UPDATE ON public.partner_documents
FOR EACH ROW EXECUTE FUNCTION public.set_prelaunch_updated_at();

CREATE INDEX IF NOT EXISTS partner_documents_application_status_idx
  ON public.partner_documents(application_id, status);

ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_documents_select_own_or_admin" ON public.partner_documents;
CREATE POLICY "partner_documents_select_own_or_admin"
ON public.partner_documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.current_user_has_role('admin'));

-- No direct INSERT/UPDATE/DELETE policy: uploads and reviews use trusted APIs.

CREATE OR REPLACE FUNCTION public.protect_partner_application_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.current_user_has_role('admin') THEN
    NEW.user_id := OLD.user_id;
    NEW.status := OLD.status;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.latitude := OLD.latitude;
    NEW.longitude := OLD.longitude;
    NEW.service_area_id := OLD.service_area_id;
    NEW.establishment_type := OLD.establishment_type;
    NEW.handles_animal_products := OLD.handles_animal_products;
    NEW.sells_alcohol := OLD.sells_alcohol;
    NEW.requires_hygiene_proof := OLD.requires_hygiene_proof;
    NEW.compliance_status := OLD.compliance_status;
    NEW.compliance_comment := OLD.compliance_comment;
    NEW.documents_submitted_at := OLD.documents_submitted_at;
  END IF;
  RETURN NEW;
END;
$$;

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
    NEW.service_area_id := OLD.service_area_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_courier_application_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.current_user_has_role('admin') THEN
    NEW.user_id := OLD.user_id;
    NEW.status := OLD.status;
    NEW.document_review_status := OLD.document_review_status;
    NEW.document_review_comment := OLD.document_review_comment;
    NEW.identity_name_confirmed := OLD.identity_name_confirmed;
    NEW.business_identity_confirmed := OLD.business_identity_confirmed;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.dispatch_priority_score := OLD.dispatch_priority_score;
    NEW.service_area_id := OLD.service_area_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_foodiz_city(target_city text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(regexp_replace(trim(coalesce(target_city, '')), '\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.foodiz_department_from_postal_code(target_postal_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN target_postal_code ~ '^20[0-9]{3}$'
      THEN CASE WHEN substring(target_postal_code, 1, 3)::integer <= 201 THEN '2A' ELSE '2B' END
    WHEN target_postal_code ~ '^(97|98)[0-9]{3}$' THEN substring(target_postal_code, 1, 3)
    WHEN target_postal_code ~ '^[0-9]{5}$' THEN substring(target_postal_code, 1, 2)
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_service_area_server(
  target_city text,
  target_postal_code text,
  target_latitude numeric,
  target_longitude numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_city text;
  department text;
  area_id uuid;
BEGIN
  IF NOT public.trusted_server_operation() THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  normalized_city := public.normalize_foodiz_city(target_city);
  department := public.foodiz_department_from_postal_code(target_postal_code);
  IF normalized_city = '' OR department IS NULL THEN
    RAISE EXCEPTION 'A valid French city and postal code are required';
  END IF;
  IF target_latitude NOT BETWEEN -90 AND 90
     OR target_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'Verified coordinates are required';
  END IF;

  INSERT INTO public.service_areas (
    city, city_normalized, postal_codes, department_code,
    center_latitude, center_longitude, status
  ) VALUES (
    trim(target_city), normalized_city, ARRAY[target_postal_code], department,
    target_latitude, target_longitude, 'recruiting'
  )
  ON CONFLICT (city_normalized, department_code) DO UPDATE
  SET postal_codes = (
        SELECT array_agg(DISTINCT postal.value ORDER BY postal.value)
        FROM unnest(
          public.service_areas.postal_codes || EXCLUDED.postal_codes
        ) AS postal(value)
      ),
      center_latitude = coalesce(public.service_areas.center_latitude, EXCLUDED.center_latitude),
      center_longitude = coalesce(public.service_areas.center_longitude, EXCLUDED.center_longitude),
      updated_at = now()
  RETURNING id INTO area_id;

  RETURN area_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.foodiz_application_access_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_user_has_role('admin')
    OR EXISTS (
      SELECT 1
      FROM public.prelaunch_profiles prelaunch
      WHERE prelaunch.user_id = auth.uid()
        AND prelaunch.access_enabled = true
        AND (
          (
            prelaunch.role = 'livreur'
            AND EXISTS (
              SELECT 1
              FROM public.courier_applications application
              JOIN public.service_areas area ON area.id = application.service_area_id
              WHERE application.user_id = prelaunch.user_id
                AND application.status = 'validated'
                AND application.document_review_status = 'approved'
                AND area.status IN ('pilot', 'open')
            )
          )
          OR (
            prelaunch.role = 'partenaire'
            AND EXISTS (
              SELECT 1
              FROM public.partner_applications application
              JOIN public.service_areas area ON area.id = application.service_area_id
              WHERE application.user_id = prelaunch.user_id
                AND application.status = 'validated'
                AND application.compliance_status = 'approved'
                AND area.status IN ('preparing', 'pilot', 'open')
            )
          )
        )
    )
    OR (
      public.foodiz_app_is_launched()
      AND (
        NOT EXISTS (
          SELECT 1 FROM public.prelaunch_profiles WHERE user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.prelaunch_profiles
          WHERE user_id = auth.uid() AND status = 'activated'
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.set_prelaunch_professional_access(
  target_user_id uuid,
  target_reviewer_id uuid,
  target_enabled boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role text;
  previous_profile jsonb;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target_reviewer_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin reviewer required';
  END IF;

  SELECT role, to_jsonb(prelaunch)
  INTO target_role, previous_profile
  FROM public.prelaunch_profiles prelaunch
  WHERE user_id = target_user_id
  FOR UPDATE;

  IF target_role NOT IN ('livreur', 'partenaire') THEN
    RAISE EXCEPTION 'Only professional pilot access can be enabled';
  END IF;

  IF target_enabled AND target_role = 'livreur' AND NOT EXISTS (
    SELECT 1
    FROM public.courier_applications application
    JOIN public.service_areas area ON area.id = application.service_area_id
    WHERE application.user_id = target_user_id
      AND application.status = 'validated'
      AND application.document_review_status = 'approved'
      AND area.status IN ('pilot', 'open')
  ) THEN
    RAISE EXCEPTION 'Courier dossier must be approved and its city must be pilot or open';
  END IF;

  IF target_enabled AND target_role = 'partenaire' AND NOT EXISTS (
    SELECT 1
    FROM public.partner_applications application
    JOIN public.service_areas area ON area.id = application.service_area_id
    WHERE application.user_id = target_user_id
      AND application.status = 'validated'
      AND application.compliance_status = 'approved'
      AND area.status IN ('preparing', 'pilot', 'open')
  ) THEN
    RAISE EXCEPTION 'Partner dossier must be approved and its city must be preparing, pilot or open';
  END IF;

  UPDATE public.prelaunch_profiles
  SET access_enabled = target_enabled,
      access_enabled_at = CASE WHEN target_enabled THEN now() ELSE NULL END,
      access_enabled_by = CASE WHEN target_enabled THEN target_reviewer_id ELSE NULL END,
      updated_at = now()
  WHERE user_id = target_user_id;

  INSERT INTO public.admin_audit_log (
    admin_id, action, entity_type, entity_id, reason, previous_data, new_data
  )
  SELECT
    target_reviewer_id,
    CASE WHEN target_enabled
      THEN 'professional_prelaunch_access_enabled'
      ELSE 'professional_prelaunch_access_disabled'
    END,
    'profile',
    target_user_id,
    'Explicit professional pilot access decision',
    previous_profile,
    to_jsonb(prelaunch)
  FROM public.prelaunch_profiles prelaunch
  WHERE user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_service_area_status_server(
  target_area_id uuid,
  target_reviewer_id uuid,
  target_status text,
  target_delivery_radius_km numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_area jsonb;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target_reviewer_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin reviewer required';
  END IF;
  IF target_status NOT IN ('recruiting', 'preparing', 'pilot', 'open', 'paused', 'closed') THEN
    RAISE EXCEPTION 'Invalid service area status';
  END IF;
  IF target_delivery_radius_km <= 0 OR target_delivery_radius_km > 100 THEN
    RAISE EXCEPTION 'Invalid delivery radius';
  END IF;

  SELECT to_jsonb(area) INTO previous_area
  FROM public.service_areas area
  WHERE id = target_area_id
  FOR UPDATE;
  IF previous_area IS NULL THEN RAISE EXCEPTION 'Service area not found'; END IF;

  UPDATE public.service_areas
  SET status = target_status,
      delivery_radius_km = target_delivery_radius_km,
      opened_at = CASE
        WHEN target_status IN ('pilot', 'open') THEN coalesce(opened_at, now())
        ELSE opened_at
      END,
      updated_at = now()
  WHERE id = target_area_id;

  INSERT INTO public.admin_audit_log (
    admin_id, action, entity_type, entity_id, reason, previous_data, new_data
  )
  SELECT
    target_reviewer_id, 'service_area_status_changed', 'service_area',
    target_area_id, target_status, previous_area, to_jsonb(area)
  FROM public.service_areas area
  WHERE id = target_area_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_partner_application_server(
  target_application_id uuid,
  target_reviewer_id uuid,
  target_decision text,
  target_comment text,
  target_document_types text[] DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  application_row public.partner_applications%ROWTYPE;
  required_types text[];
  missing_count integer;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target_reviewer_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin reviewer required';
  END IF;
  IF target_decision NOT IN ('approve', 'request_replacement', 'reject') THEN
    RAISE EXCEPTION 'Invalid review decision';
  END IF;
  IF target_decision <> 'approve'
     AND length(trim(coalesce(target_comment, ''))) < 5 THEN
    RAISE EXCEPTION 'A review comment is required';
  END IF;

  SELECT * INTO application_row
  FROM public.partner_applications
  WHERE id = target_application_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partner application not found'; END IF;

  required_types := ARRAY['registration_proof', 'liability_insurance'];
  IF application_row.requires_hygiene_proof THEN
    required_types := required_types || ARRAY['hygiene_training'];
  END IF;
  IF application_row.handles_animal_products THEN
    required_types := required_types || ARRAY['sanitary_declaration'];
  END IF;
  IF application_row.sells_alcohol THEN
    required_types := required_types || ARRAY['alcohol_license'];
  END IF;

  IF target_decision = 'approve' THEN
    SELECT count(*) INTO missing_count
    FROM unnest(required_types) required(document_type)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.partner_documents document
      WHERE document.application_id = application_row.id
        AND document.document_type = required.document_type
        AND document.status IN ('pending', 'approved')
        AND (document.valid_until IS NULL OR document.valid_until >= current_date)
    );
    IF missing_count > 0 THEN
      RAISE EXCEPTION 'Required partner documents are missing or expired';
    END IF;

    UPDATE public.partner_documents
    SET status = 'approved',
        review_comment = nullif(trim(coalesce(target_comment, '')), ''),
        reviewed_by = target_reviewer_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE application_id = application_row.id
      AND document_type = ANY(required_types);

    UPDATE public.partner_applications
    SET status = 'validated',
        compliance_status = 'approved',
        compliance_comment = nullif(trim(coalesce(target_comment, '')), ''),
        rejection_reason = NULL,
        reviewed_by = target_reviewer_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = application_row.id;

    UPDATE public.profiles
    SET status = 'validated', updated_at = now()
    WHERE id = application_row.user_id;

    UPDATE public.prelaunch_partner_details details
    SET document_review_status = 'approved',
        document_review_comment = nullif(trim(coalesce(target_comment, '')), ''),
        reviewed_by = target_reviewer_id,
        reviewed_at = now(),
        updated_at = now()
    FROM public.prelaunch_profiles prelaunch
    WHERE prelaunch.user_id = application_row.user_id
      AND details.prelaunch_profile_id = prelaunch.id;
  ELSIF target_decision = 'request_replacement' THEN
    IF coalesce(array_length(target_document_types, 1), 0) = 0 THEN
      RAISE EXCEPTION 'Select at least one document to replace';
    END IF;
    IF EXISTS (
      SELECT 1 FROM unnest(target_document_types) requested(document_type)
      WHERE requested.document_type <> ALL(required_types)
    ) THEN
      RAISE EXCEPTION 'Invalid replacement document type';
    END IF;

    UPDATE public.partner_documents
    SET status = 'replacement_requested',
        review_comment = trim(target_comment),
        reviewed_by = target_reviewer_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE application_id = application_row.id
      AND document_type = ANY(target_document_types);

    UPDATE public.partner_applications
    SET status = 'missing_documents',
        compliance_status = 'replacement_requested',
        compliance_comment = trim(target_comment),
        rejection_reason = trim(target_comment),
        reviewed_by = target_reviewer_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = application_row.id;

    UPDATE public.prelaunch_partner_details details
    SET document_review_status = 'replacement_requested',
        document_review_comment = trim(target_comment),
        reviewed_by = target_reviewer_id,
        reviewed_at = now(),
        updated_at = now()
    FROM public.prelaunch_profiles prelaunch
    WHERE prelaunch.user_id = application_row.user_id
      AND details.prelaunch_profile_id = prelaunch.id;
  ELSE
    UPDATE public.partner_documents
    SET status = 'rejected',
        review_comment = trim(target_comment),
        reviewed_by = target_reviewer_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE application_id = application_row.id;

    UPDATE public.partner_applications
    SET status = 'rejected',
        compliance_status = 'rejected',
        compliance_comment = trim(target_comment),
        rejection_reason = trim(target_comment),
        reviewed_by = target_reviewer_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = application_row.id;

    UPDATE public.profiles
    SET status = 'rejected', updated_at = now()
    WHERE id = application_row.user_id;

    UPDATE public.prelaunch_profiles
    SET status = 'rejected', updated_at = now()
    WHERE user_id = application_row.user_id;

    UPDATE public.prelaunch_partner_details details
    SET document_review_status = 'rejected',
        document_review_comment = trim(target_comment),
        reviewed_by = target_reviewer_id,
        reviewed_at = now(),
        updated_at = now()
    FROM public.prelaunch_profiles prelaunch
    WHERE prelaunch.user_id = application_row.user_id
      AND details.prelaunch_profile_id = prelaunch.id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_partner_operational_status_server(
  target_restaurant_id uuid,
  target_reviewer_id uuid,
  target_status text,
  target_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  restaurant_row public.restaurants%ROWTYPE;
  application_row public.partner_applications%ROWTYPE;
  area_status text;
  previous_restaurant jsonb;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target_reviewer_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin reviewer required';
  END IF;
  IF target_status NOT IN ('pending', 'active', 'suspended', 'rejected') THEN
    RAISE EXCEPTION 'Invalid partner operational status';
  END IF;
  IF target_status IN ('suspended', 'rejected')
     AND length(trim(coalesce(target_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;

  SELECT *
  INTO restaurant_row
  FROM public.restaurants
  WHERE id = target_restaurant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Restaurant not found'; END IF;

  previous_restaurant := to_jsonb(restaurant_row);

  SELECT * INTO application_row
  FROM public.partner_applications
  WHERE user_id = restaurant_row.owner_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partner application not found'; END IF;

  IF target_status = 'active' THEN
    IF application_row.status <> 'validated'
       OR application_row.compliance_status <> 'approved' THEN
      RAISE EXCEPTION 'Partner compliance dossier must be approved first';
    END IF;
    IF restaurant_row.latitude IS NULL OR restaurant_row.latitude NOT BETWEEN -90 AND 90
       OR restaurant_row.longitude IS NULL OR restaurant_row.longitude NOT BETWEEN -180 AND 180 THEN
      RAISE EXCEPTION 'Verified restaurant coordinates are required';
    END IF;
    IF restaurant_row.service_area_id IS NULL THEN
      RAISE EXCEPTION 'A service area must be assigned first';
    END IF;
    SELECT status INTO area_status
    FROM public.service_areas
    WHERE id = restaurant_row.service_area_id;
    IF area_status NOT IN ('pilot', 'open') THEN
      RAISE EXCEPTION 'The service area must be in pilot or open status';
    END IF;
  END IF;

  UPDATE public.restaurants
  SET status = target_status,
      is_active = target_status = 'active',
      updated_at = now()
  WHERE id = target_restaurant_id;

  IF target_status IN ('suspended', 'rejected') THEN
    UPDATE public.profiles
    SET status = target_status, updated_at = now()
    WHERE id = restaurant_row.owner_id;
  ELSIF target_status = 'active' THEN
    UPDATE public.profiles
    SET status = 'validated', updated_at = now()
    WHERE id = restaurant_row.owner_id;
  END IF;

  INSERT INTO public.admin_audit_log (
    admin_id, action, entity_type, entity_id, reason, previous_data, new_data
  )
  SELECT
    target_reviewer_id, 'partner_operational_status_changed', 'restaurant',
    target_restaurant_id, nullif(trim(coalesce(target_reason, '')), ''),
    previous_restaurant, to_jsonb(restaurant)
  FROM public.restaurants restaurant
  WHERE id = target_restaurant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_service_area_server(text, text, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_prelaunch_professional_access(uuid, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_service_area_status_server(uuid, uuid, text, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_partner_application_server(uuid, uuid, text, text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_partner_operational_status_server(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_service_area_server(text, text, numeric, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_prelaunch_professional_access(uuid, uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_service_area_status_server(uuid, uuid, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_partner_application_server(uuid, uuid, text, text, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_partner_operational_status_server(uuid, uuid, text, text) TO service_role;

-- Reapply the global restrictive access gate to every RLS table created after
-- the original pre-launch migration.
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
      AND relation.relrowsecurity = true
      AND relation.relname NOT IN (
        'app_settings',
        'prelaunch_profiles',
        'prelaunch_partner_details',
        'prelaunch_driver_details',
        'prelaunch_registration_attempts',
        'service_areas'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      'foodiz_prelaunch_global_gate',
      target.schemaname,
      target.tablename
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (public.foodiz_application_access_allowed()) WITH CHECK (public.foodiz_application_access_allowed())',
      'foodiz_prelaunch_global_gate',
      target.schemaname,
      target.tablename
    );
  END LOOP;
END;
$$;
