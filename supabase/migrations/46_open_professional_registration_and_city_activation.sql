-- Open nationwide professional registration:
-- - new partner/courier registrations no longer depend on prelaunch tables;
-- - short-lived document upload capabilities live on operational applications;
-- - validating the first partner prepares a city automatically;
-- - a city enters pilot mode once it has both an approved partner and courier;
-- - legacy prelaunch rows remain untouched for historical compatibility.

ALTER TABLE public.partner_applications
  ADD COLUMN IF NOT EXISTS document_upload_token_hash text,
  ADD COLUMN IF NOT EXISTS document_upload_token_expires_at timestamptz;

ALTER TABLE public.courier_applications
  ADD COLUMN IF NOT EXISTS document_upload_token_hash text,
  ADD COLUMN IF NOT EXISTS document_upload_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS documents_submitted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS partner_applications_document_token_unique
  ON public.partner_applications(document_upload_token_hash)
  WHERE document_upload_token_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS courier_applications_document_token_unique
  ON public.courier_applications(document_upload_token_hash)
  WHERE document_upload_token_hash IS NOT NULL;

ALTER TABLE public.foodiz_email_events
  DROP CONSTRAINT IF EXISTS foodiz_email_events_type_check;
ALTER TABLE public.foodiz_email_events
  ADD CONSTRAINT foodiz_email_events_type_check
  CHECK (email_type IN (
    'prelaunch_confirmation',
    'launch_access',
    'professional_signup_confirmation',
    'professional_documents_received',
    'professional_approved',
    'professional_replacement_requested',
    'professional_rejected',
    'support_ticket_received',
    'support_ticket_resolved',
    'financial_document',
    'security'
  ));

-- The former global prelaunch policy remains attached to existing RLS tables.
-- Returning true retires only that global gate; every table keeps its own
-- ownership/admin policies.
CREATE OR REPLACE FUNCTION public.foodiz_application_access_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true;
$$;

CREATE OR REPLACE FUNCTION public.synchronize_service_area_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_area_id uuid;
  has_partner boolean;
  has_courier boolean;
  current_area_status text;
BEGIN
  target_area_id := coalesce(NEW.service_area_id, OLD.service_area_id);
  IF target_area_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status
  INTO current_area_status
  FROM public.service_areas
  WHERE id = target_area_id
  FOR UPDATE;

  IF current_area_status IS NULL OR current_area_status IN ('paused', 'closed', 'open') THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.partner_applications application
    WHERE application.service_area_id = target_area_id
      AND application.status = 'validated'
      AND application.compliance_status = 'approved'
  )
  INTO has_partner;

  SELECT EXISTS (
    SELECT 1
    FROM public.courier_applications application
    WHERE application.service_area_id = target_area_id
      AND application.status = 'validated'
      AND application.document_review_status = 'approved'
  )
  INTO has_courier;

  UPDATE public.service_areas
  SET status = CASE
        WHEN has_partner AND has_courier THEN 'pilot'
        WHEN has_partner THEN 'preparing'
        ELSE 'recruiting'
      END,
      opened_at = CASE
        WHEN has_partner AND has_courier THEN coalesce(opened_at, now())
        ELSE opened_at
      END,
      updated_at = now()
  WHERE id = target_area_id;

  UPDATE public.restaurants restaurant
  SET status = CASE
        WHEN has_partner AND has_courier
             AND EXISTS (
               SELECT 1
               FROM public.partner_applications application
               WHERE application.user_id = restaurant.owner_id
                 AND application.status = 'validated'
                 AND application.compliance_status = 'approved'
             )
          THEN 'active'
        ELSE 'pending'
      END,
      is_active = (
        has_partner
        AND has_courier
        AND EXISTS (
          SELECT 1
          FROM public.partner_applications application
          WHERE application.user_id = restaurant.owner_id
            AND application.status = 'validated'
            AND application.compliance_status = 'approved'
        )
      ),
      updated_at = now()
  WHERE restaurant.service_area_id = target_area_id
    AND restaurant.status NOT IN ('suspended', 'rejected');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS synchronize_area_after_partner_review
  ON public.partner_applications;
CREATE TRIGGER synchronize_area_after_partner_review
AFTER INSERT OR UPDATE
ON public.partner_applications
FOR EACH ROW
EXECUTE FUNCTION public.synchronize_service_area_activation();

DROP TRIGGER IF EXISTS synchronize_area_after_courier_review
  ON public.courier_applications;
CREATE TRIGGER synchronize_area_after_courier_review
AFTER INSERT OR UPDATE
ON public.courier_applications
FOR EACH ROW
EXECUTE FUNCTION public.synchronize_service_area_activation();

REVOKE ALL ON FUNCTION public.synchronize_service_area_activation() FROM PUBLIC;

COMMENT ON FUNCTION public.synchronize_service_area_activation() IS
  'Keeps Weello city readiness synchronized with approved partner and courier dossiers.';
