-- Admin controls for client access and exceptional courier penalty waivers.

CREATE OR REPLACE FUNCTION public.admin_set_client_status(
  target_user_id uuid,
  target_status text,
  target_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_profile jsonb;
BEGIN
  IF NOT public.current_user_has_role('admin') THEN
    RAISE EXCEPTION 'Admin required';
  END IF;
  IF target_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Invalid client status';
  END IF;
  IF target_status = 'suspended'
     AND nullif(trim(coalesce(target_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A suspension reason is required';
  END IF;

  SELECT to_jsonb(profile)
  INTO previous_profile
  FROM public.profiles profile
  WHERE id = target_user_id AND role = 'client'
  FOR UPDATE;
  IF previous_profile IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  UPDATE public.profiles
  SET status = target_status, updated_at = now()
  WHERE id = target_user_id AND role = 'client';

  INSERT INTO public.admin_audit_log (
    admin_id, action, entity_type, entity_id, reason, previous_data, new_data
  )
  SELECT
    auth.uid(), 'client_status_changed', 'profile', target_user_id,
    nullif(trim(coalesce(target_reason, '')), ''), previous_profile, to_jsonb(profile)
  FROM public.profiles profile
  WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_waive_courier_delay_penalty(
  target_order_id uuid,
  target_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  penalty_row public.courier_delay_penalties%ROWTYPE;
BEGIN
  IF NOT public.current_user_has_role('admin') THEN
    RAISE EXCEPTION 'Admin required';
  END IF;
  IF nullif(trim(coalesce(target_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'A waiver reason is required';
  END IF;

  SELECT * INTO penalty_row
  FROM public.courier_delay_penalties
  WHERE order_id = target_order_id
  FOR UPDATE;
  IF NOT FOUND OR penalty_row.status <> 'applied' OR penalty_row.penalty_cents <= 0 THEN
    RAISE EXCEPTION 'No applied penalty to waive';
  END IF;

  UPDATE public.courier_delay_penalties
  SET status = 'waived',
      decision_reason = trim(target_reason),
      updated_at = now()
  WHERE id = penalty_row.id;

  UPDATE public.orders
  SET courier_delay_penalty_cents = 0,
      updated_at = now()
  WHERE id = target_order_id;

  IF penalty_row.dispatch_priority_delta < 0 THEN
    UPDATE public.courier_applications
    SET dispatch_priority_score = least(
          100,
          dispatch_priority_score - penalty_row.dispatch_priority_delta
        ),
        updated_at = now()
    WHERE user_id = penalty_row.courier_id;
  END IF;

  INSERT INTO public.notifications (
    user_id, title, message, type, related_order_id
  ) VALUES (
    penalty_row.courier_id,
    'Pénalité annulée',
    'La pénalité de retard de la commande #' || left(target_order_id::text, 8)
      || ' a été annulée après examen par Weello.',
    'payment',
    target_order_id
  );

  INSERT INTO public.admin_audit_log (
    admin_id, action, entity_type, entity_id, reason, previous_data, new_data
  ) VALUES (
    auth.uid(), 'courier_penalty_waived', 'order', target_order_id,
    trim(target_reason), to_jsonb(penalty_row),
    jsonb_build_object('penalty_cents', 0, 'status', 'waived')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_client_status(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_waive_courier_delay_penalty(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_client_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_waive_courier_delay_penalty(uuid, text) TO authenticated;
