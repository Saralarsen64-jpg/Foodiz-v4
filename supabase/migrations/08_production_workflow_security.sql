-- Lock validation decisions and order workflow transitions to trusted actors.

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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_partner_application_review_fields ON public.partner_applications;
CREATE TRIGGER protect_partner_application_review_fields
BEFORE UPDATE ON public.partner_applications
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_application_review_fields();

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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_courier_application_review_fields ON public.courier_applications;
CREATE TRIGGER protect_courier_application_review_fields
BEFORE UPDATE ON public.courier_applications
FOR EACH ROW EXECUTE FUNCTION public.protect_courier_application_review_fields();

DROP POLICY IF EXISTS "partner_apps_update_admin_or_own_mvp" ON public.partner_applications;
DROP POLICY IF EXISTS "partner_apps_update_own_production" ON public.partner_applications;
CREATE POLICY "partner_apps_update_own_production" ON public.partner_applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "partner_apps_update_admin_production" ON public.partner_applications;
CREATE POLICY "partner_apps_update_admin_production" ON public.partner_applications FOR UPDATE
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "courier_apps_update_admin_or_own_mvp" ON public.courier_applications;
DROP POLICY IF EXISTS "courier_apps_update_own_production" ON public.courier_applications;
CREATE POLICY "courier_apps_update_own_production" ON public.courier_applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "courier_apps_update_admin_production" ON public.courier_applications;
CREATE POLICY "courier_apps_update_admin_production" ON public.courier_applications FOR UPDATE
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE OR REPLACE FUNCTION public.enforce_order_worker_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid := auth.uid();
  is_partner boolean := false;
  is_validated_courier boolean := false;
BEGIN
  -- Server-side service-role operations and admins own the complete workflow.
  IF actor_id IS NULL OR public.current_user_has_role('admin') THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - ARRAY['status', 'courier_id', 'updated_at'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status', 'courier_id', 'updated_at']) THEN
    RAISE EXCEPTION 'Only workflow fields may be changed by a restaurant or courier';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.restaurants r
    WHERE r.id = OLD.restaurant_id
      AND r.owner_id = actor_id
      AND r.status = 'active'
      AND r.is_active = true
  ) INTO is_partner;

  SELECT EXISTS (
    SELECT 1
    FROM public.courier_applications ca
    WHERE ca.user_id = actor_id AND ca.status = 'validated'
  ) INTO is_validated_courier;

  IF OLD.courier_id IS NULL
     AND NEW.courier_id = actor_id
     AND is_validated_courier
     AND OLD.status = 'ready'
     AND NEW.status = 'pickup' THEN
    RETURN NEW;
  END IF;

  IF is_partner THEN
    IF NEW.courier_id IS DISTINCT FROM OLD.courier_id THEN
      RAISE EXCEPTION 'Restaurant cannot assign or replace a courier';
    END IF;
    IF NEW.status = OLD.status
       OR (OLD.status = 'pending' AND NEW.status IN ('preparing', 'cancelled'))
       OR (OLD.status = 'preparing' AND NEW.status = 'ready') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Invalid restaurant order transition: % -> %', OLD.status, NEW.status;
  END IF;

  IF is_validated_courier AND OLD.courier_id = actor_id THEN
    IF NEW.courier_id IS DISTINCT FROM OLD.courier_id THEN
      RAISE EXCEPTION 'Courier assignment cannot be changed';
    END IF;
    IF NEW.status = OLD.status
       OR (OLD.status = 'pickup' AND NEW.status = 'picked_up')
       OR (OLD.status = 'picked_up' AND NEW.status = 'delivering') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Invalid courier order transition: % -> %', OLD.status, NEW.status;
  END IF;

  RAISE EXCEPTION 'User is not allowed to update this order';
END;
$$;

DROP TRIGGER IF EXISTS enforce_order_worker_transition ON public.orders;
CREATE TRIGGER enforce_order_worker_transition
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_worker_transition();

DROP POLICY IF EXISTS "orders_update_workers_production" ON public.orders;

DROP POLICY IF EXISTS "orders_update_partner_production" ON public.orders;
CREATE POLICY "orders_update_partner_production" ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
        AND r.status = 'active'
        AND r.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND r.owner_id = auth.uid()
        AND r.status = 'active'
        AND r.is_active = true
    )
  );

DROP POLICY IF EXISTS "orders_update_assigned_courier_production" ON public.orders;
CREATE POLICY "orders_update_assigned_courier_production" ON public.orders FOR UPDATE
  USING (
    courier_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.courier_applications ca
      WHERE ca.user_id = auth.uid() AND ca.status = 'validated'
    )
  )
  WITH CHECK (
    courier_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.courier_applications ca
      WHERE ca.user_id = auth.uid() AND ca.status = 'validated'
    )
  );

DROP POLICY IF EXISTS "orders_update_admin_production" ON public.orders;
CREATE POLICY "orders_update_admin_production" ON public.orders FOR UPDATE
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));
