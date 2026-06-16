-- Audited, transactional partner administration.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  reason text,
  previous_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_entity
  ON public.admin_audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin
  ON public.admin_audit_log(admin_id, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_read" ON public.admin_audit_log;
CREATE POLICY "admin_audit_read" ON public.admin_audit_log FOR SELECT
  USING (public.current_user_has_role('admin'));

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

  SELECT r.owner_id, to_jsonb(r)
  INTO target_owner_id, previous_restaurant
  FROM public.restaurants r
  WHERE r.id = target_restaurant_id
  FOR UPDATE;

  IF target_owner_id IS NULL THEN
    RAISE EXCEPTION 'Restaurant not found';
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
        WHEN application_status IN ('missing_documents', 'suspended', 'rejected') THEN trim(target_reason)
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

REVOKE ALL ON FUNCTION public.admin_set_partner_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_partner_status(uuid, text, text) TO authenticated;
