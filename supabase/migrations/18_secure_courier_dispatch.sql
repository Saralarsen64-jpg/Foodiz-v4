-- Available deliveries are now exposed through a sanitized server endpoint.

DROP POLICY IF EXISTS "couriers_claim_ready_orders_production" ON public.orders;
DROP POLICY IF EXISTS "couriers_select_available_orders_production" ON public.orders;

DROP POLICY IF EXISTS "order_items_select_production" ON public.order_items;
CREATE POLICY "order_items_select_production" ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      LEFT JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id
        AND (
          auth.uid() IN (o.client_id, o.courier_id, r.owner_id)
          OR public.current_user_has_role('admin')
        )
    )
  );

CREATE OR REPLACE FUNCTION public.claim_courier_delivery(target_order_id uuid, target_courier_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_id uuid;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(target_courier_id::text));

  IF NOT EXISTS (
    SELECT 1 FROM public.courier_applications
    WHERE user_id = target_courier_id AND status = 'validated'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = target_courier_id AND courier_online = true
  ) THEN RETURN NULL; END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE courier_id = target_courier_id AND status IN ('pickup', 'picked_up', 'delivering')
  ) THEN RETURN NULL; END IF;

  UPDATE public.orders
  SET status = 'pickup', courier_id = target_courier_id, updated_at = now()
  WHERE id = target_order_id
    AND status = 'ready'
    AND payment_status = 'completed'
    AND courier_id IS NULL
  RETURNING id INTO claimed_id;

  RETURN claimed_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_courier_delivery(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_courier_delivery(uuid, uuid) TO service_role;
