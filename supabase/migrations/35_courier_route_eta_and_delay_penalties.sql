-- Server-owned route ETA snapshots and idempotent courier delay penalties.
-- Rules:
--   10:00 to 15:00 late -> 50 cents / 50 points
--   over 15:00 to 20:00 late -> 100 cents / 100 points
--   over 20:00 late -> 200 cents / 200 points and lower dispatch priority

ALTER TABLE public.delivery_tracking
  ADD COLUMN IF NOT EXISTS pickup_route_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS pickup_route_distance_meters integer,
  ADD COLUMN IF NOT EXISTS pickup_expected_arrival_at timestamptz,
  ADD COLUMN IF NOT EXISTS eta_provider text,
  ADD COLUMN IF NOT EXISTS eta_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_gps_accuracy_meters numeric;

ALTER TABLE public.delivery_tracking
  DROP CONSTRAINT IF EXISTS delivery_tracking_route_duration_check,
  DROP CONSTRAINT IF EXISTS delivery_tracking_route_distance_check,
  DROP CONSTRAINT IF EXISTS delivery_tracking_gps_accuracy_check;

ALTER TABLE public.delivery_tracking
  ADD CONSTRAINT delivery_tracking_route_duration_check
    CHECK (pickup_route_duration_seconds IS NULL OR pickup_route_duration_seconds > 0),
  ADD CONSTRAINT delivery_tracking_route_distance_check
    CHECK (pickup_route_distance_meters IS NULL OR pickup_route_distance_meters >= 0),
  ADD CONSTRAINT delivery_tracking_gps_accuracy_check
    CHECK (pickup_gps_accuracy_meters IS NULL OR pickup_gps_accuracy_meters >= 0);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier_delay_penalty_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_delay_reward_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_delay_seconds integer,
  ADD COLUMN IF NOT EXISTS delay_penalty_applied_at timestamptz;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_courier_delay_penalty_check,
  DROP CONSTRAINT IF EXISTS orders_client_delay_reward_check,
  DROP CONSTRAINT IF EXISTS orders_delivery_delay_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_courier_delay_penalty_check
    CHECK (courier_delay_penalty_cents >= 0),
  ADD CONSTRAINT orders_client_delay_reward_check
    CHECK (client_delay_reward_points >= 0),
  ADD CONSTRAINT orders_delivery_delay_check
    CHECK (delivery_delay_seconds IS NULL OR delivery_delay_seconds >= 0);

CREATE TABLE IF NOT EXISTS public.courier_delay_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES public.profiles(id),
  client_id uuid NOT NULL REFERENCES public.profiles(id),
  pickup_at timestamptz,
  expected_arrival_at timestamptz,
  delivered_at timestamptz NOT NULL,
  delay_seconds integer NOT NULL DEFAULT 0 CHECK (delay_seconds >= 0),
  penalty_tier text NOT NULL
    CHECK (penalty_tier IN ('on_time', 'late_10', 'late_15', 'late_20', 'not_applicable')),
  penalty_cents integer NOT NULL DEFAULT 0 CHECK (penalty_cents >= 0),
  reward_points integer NOT NULL DEFAULT 0 CHECK (reward_points >= 0),
  dispatch_priority_delta integer NOT NULL DEFAULT 0,
  eta_provider text,
  rule_version text NOT NULL DEFAULT '2026-06-21',
  status text NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'not_applicable', 'waived', 'reversed')),
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_delay_compensations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points integer NOT NULL CHECK (points > 0),
  status text NOT NULL DEFAULT 'credited' CHECK (status IN ('credited', 'reversed')),
  credited_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz
);

ALTER TABLE public.courier_delay_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_delay_compensations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courier_delay_penalties_select_involved" ON public.courier_delay_penalties;
CREATE POLICY "courier_delay_penalties_select_involved"
ON public.courier_delay_penalties
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (courier_id, client_id)
  OR public.current_user_has_role('admin')
);

DROP POLICY IF EXISTS "client_delay_compensations_select_own" ON public.client_delay_compensations;
CREATE POLICY "client_delay_compensations_select_own"
ON public.client_delay_compensations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.current_user_has_role('admin')
);

DROP TRIGGER IF EXISTS set_courier_delay_penalties_updated_at ON public.courier_delay_penalties;
CREATE TRIGGER set_courier_delay_penalties_updated_at
BEFORE UPDATE ON public.courier_delay_penalties
FOR EACH ROW EXECUTE FUNCTION public.set_prelaunch_updated_at();

-- Courier tracking writes now go through the server route which validates the
-- assigned courier, workflow transition, GPS position and server timestamps.
DROP POLICY IF EXISTS "delivery_tracking_insert_courier_production" ON public.delivery_tracking;
DROP POLICY IF EXISTS "delivery_tracking_update_courier_production" ON public.delivery_tracking;
DROP POLICY IF EXISTS "orders_update_assigned_courier_production" ON public.orders;
DROP POLICY IF EXISTS "delivery_tracking_update_admin_delay_phase" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_update_admin_delay_phase"
ON public.delivery_tracking
FOR UPDATE
TO authenticated
USING (public.current_user_has_role('admin'))
WITH CHECK (public.current_user_has_role('admin'));

CREATE OR REPLACE FUNCTION public.record_courier_pickup(
  target_order_id uuid,
  target_courier_id uuid,
  target_pickup_latitude numeric,
  target_pickup_longitude numeric,
  target_gps_accuracy_meters numeric,
  target_route_duration_seconds integer,
  target_route_distance_meters integer,
  target_expected_arrival_at timestamptz,
  target_eta_provider text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pickup_time timestamptz := now();
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  PERFORM 1
  FROM public.orders
  WHERE id = target_order_id
    AND courier_id = target_courier_id
    AND status = 'pickup'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pickup transition is no longer available';
  END IF;

  UPDATE public.orders
  SET status = 'picked_up', updated_at = pickup_time
  WHERE id = target_order_id;

  UPDATE public.delivery_tracking
  SET status = 'picked_up',
      pickup_at = pickup_time,
      pickup_latitude = target_pickup_latitude,
      pickup_longitude = target_pickup_longitude,
      current_latitude = target_pickup_latitude,
      current_longitude = target_pickup_longitude,
      pickup_gps_accuracy_meters = target_gps_accuracy_meters,
      pickup_route_duration_seconds = target_route_duration_seconds,
      pickup_route_distance_meters = target_route_distance_meters,
      pickup_expected_arrival_at = target_expected_arrival_at,
      estimated_arrival_at = target_expected_arrival_at,
      eta_provider = target_eta_provider,
      eta_verified_at = CASE WHEN target_expected_arrival_at IS NOT NULL THEN pickup_time ELSE NULL END,
      updated_at = pickup_time
  WHERE order_id = target_order_id
    AND courier_id = target_courier_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery tracking row not found';
  END IF;

  RETURN jsonb_build_object(
    'pickupAt', pickup_time,
    'expectedArrivalAt', target_expected_arrival_at,
    'etaAvailable', target_expected_arrival_at IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_courier_pickup(uuid, uuid, numeric, numeric, numeric, integer, integer, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_courier_pickup(uuid, uuid, numeric, numeric, numeric, integer, integer, timestamptz, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_courier_pickup(uuid, uuid, numeric, numeric, numeric, integer, integer, timestamptz, text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_courier_delivery_step(
  target_order_id uuid,
  target_courier_id uuid,
  target_step text,
  target_latitude numeric,
  target_longitude numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_status text;
  step_time timestamptz := now();
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF target_step NOT IN ('at_restaurant', 'in_transit', 'at_customer') THEN
    RAISE EXCEPTION 'Invalid delivery step';
  END IF;

  SELECT status
  INTO order_status
  FROM public.orders
  WHERE id = target_order_id
    AND courier_id = target_courier_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery not found';
  END IF;

  IF target_step = 'at_restaurant' AND order_status = 'pickup' THEN
    UPDATE public.delivery_tracking
    SET status = 'at_restaurant', updated_at = step_time
    WHERE order_id = target_order_id AND courier_id = target_courier_id;
  ELSIF target_step = 'in_transit' AND order_status = 'picked_up' THEN
    UPDATE public.orders
    SET status = 'delivering', updated_at = step_time
    WHERE id = target_order_id;

    UPDATE public.delivery_tracking
    SET status = 'in_transit', updated_at = step_time
    WHERE order_id = target_order_id AND courier_id = target_courier_id;
  ELSIF target_step = 'at_customer' AND order_status = 'delivering' THEN
    UPDATE public.delivery_tracking
    SET status = 'at_customer',
        current_latitude = coalesce(target_latitude, current_latitude),
        current_longitude = coalesce(target_longitude, current_longitude),
        updated_at = step_time
    WHERE order_id = target_order_id AND courier_id = target_courier_id;
  ELSE
    RAISE EXCEPTION 'Invalid delivery transition';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery tracking row not found';
  END IF;

  RETURN jsonb_build_object('step', target_step, 'recordedAt', step_time);
END;
$$;

REVOKE ALL ON FUNCTION public.record_courier_delivery_step(uuid, uuid, text, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_courier_delivery_step(uuid, uuid, text, numeric, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_courier_delivery_step(uuid, uuid, text, numeric, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_courier_delay_penalty(target_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row public.orders%ROWTYPE;
  tracking_row public.delivery_tracking%ROWTYPE;
  existing_row public.courier_delay_penalties%ROWTYPE;
  delay_seconds_value integer := 0;
  penalty_cents_value integer := 0;
  reward_points_value integer := 0;
  priority_delta integer := 0;
  tier text := 'on_time';
  gross_courier_cents integer := 0;
  compensation_inserted integer;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  SELECT *
  INTO existing_row
  FROM public.courier_delay_penalties
  WHERE order_id = target_order_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'applied', existing_row.status = 'applied',
      'tier', existing_row.penalty_tier,
      'delaySeconds', existing_row.delay_seconds,
      'penaltyCents', existing_row.penalty_cents,
      'rewardPoints', existing_row.reward_points,
      'idempotent', true
    );
  END IF;

  SELECT *
  INTO order_row
  FROM public.orders
  WHERE id = target_order_id
  FOR UPDATE;

  IF NOT FOUND
     OR order_row.status <> 'delivered'
     OR order_row.delivered_at IS NULL
     OR order_row.courier_id IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'ORDER_NOT_DELIVERED');
  END IF;

  SELECT *
  INTO tracking_row
  FROM public.delivery_tracking
  WHERE order_id = target_order_id
  FOR UPDATE;

  IF NOT FOUND
     OR tracking_row.pickup_at IS NULL
     OR tracking_row.pickup_expected_arrival_at IS NULL
     OR tracking_row.eta_verified_at IS NULL
     OR tracking_row.eta_provider IS NULL THEN
    INSERT INTO public.courier_delay_penalties (
      order_id, courier_id, client_id, pickup_at, expected_arrival_at,
      delivered_at, penalty_tier, eta_provider, status, decision_reason
    ) VALUES (
      order_row.id, order_row.courier_id, order_row.client_id,
      tracking_row.pickup_at, tracking_row.pickup_expected_arrival_at,
      order_row.delivered_at, 'not_applicable', tracking_row.eta_provider,
      'not_applicable', 'No verified route ETA was available at pickup'
    );

    RETURN jsonb_build_object('applied', false, 'reason', 'NO_VERIFIED_ETA');
  END IF;

  delay_seconds_value := greatest(
    0,
    floor(extract(epoch FROM order_row.delivered_at - tracking_row.pickup_expected_arrival_at))::integer
  );

  IF delay_seconds_value >= 600 AND delay_seconds_value <= 900 THEN
    tier := 'late_10';
    penalty_cents_value := 50;
    reward_points_value := 50;
  ELSIF delay_seconds_value > 900 AND delay_seconds_value <= 1200 THEN
    tier := 'late_15';
    penalty_cents_value := 100;
    reward_points_value := 100;
  ELSIF delay_seconds_value > 1200 THEN
    tier := 'late_20';
    penalty_cents_value := 200;
    reward_points_value := 200;
    priority_delta := -10;
  END IF;

  gross_courier_cents :=
    coalesce(order_row.delivery_fee_cents, 0)
    + coalesce(order_row.courier_earnings_cents, 0)
    + coalesce(order_row.courier_prime_fund_cents, 0);

  -- A settlement must never become negative. The client still receives the
  -- full contractual points if an unusually small courier allocation exists.
  penalty_cents_value := least(penalty_cents_value, greatest(0, gross_courier_cents));

  INSERT INTO public.courier_delay_penalties (
    order_id, courier_id, client_id, pickup_at, expected_arrival_at,
    delivered_at, delay_seconds, penalty_tier, penalty_cents, reward_points,
    dispatch_priority_delta, eta_provider, status
  ) VALUES (
    order_row.id, order_row.courier_id, order_row.client_id,
    tracking_row.pickup_at, tracking_row.pickup_expected_arrival_at,
    order_row.delivered_at, delay_seconds_value, tier, penalty_cents_value,
    reward_points_value, priority_delta, tracking_row.eta_provider, 'applied'
  );

  UPDATE public.orders
  SET courier_delay_penalty_cents = penalty_cents_value,
      client_delay_reward_points = reward_points_value,
      delivery_delay_seconds = delay_seconds_value,
      delay_penalty_applied_at = now(),
      updated_at = now()
  WHERE id = order_row.id;

  IF reward_points_value > 0 THEN
    INSERT INTO public.client_delay_compensations (order_id, user_id, points)
    VALUES (order_row.id, order_row.client_id, reward_points_value)
    ON CONFLICT (order_id) DO NOTHING
    RETURNING points INTO compensation_inserted;

    IF compensation_inserted IS NOT NULL THEN
      INSERT INTO public.client_wallets (user_id, points_balance)
      VALUES (order_row.client_id, compensation_inserted)
      ON CONFLICT (user_id) DO UPDATE
      SET points_balance = public.client_wallets.points_balance + EXCLUDED.points_balance,
          updated_at = now();

      INSERT INTO public.notifications (
        user_id, title, message, type, related_order_id
      ) VALUES (
        order_row.client_id,
        'Compensation de livraison',
        compensation_inserted::text || ' points Foodiz ont été ajoutés à votre fidélité suite au retard constaté.',
        'order',
        order_row.id
      );
    END IF;
  END IF;

  IF priority_delta < 0 THEN
    UPDATE public.courier_applications
    SET dispatch_priority_score = greatest(0, dispatch_priority_score + priority_delta),
        updated_at = now()
    WHERE user_id = order_row.courier_id;
  END IF;

  RETURN jsonb_build_object(
    'applied', penalty_cents_value > 0,
    'tier', tier,
    'delaySeconds', delay_seconds_value,
    'penaltyCents', penalty_cents_value,
    'rewardPoints', reward_points_value,
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_courier_delay_penalty(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_courier_delay_penalty(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_courier_delay_penalty(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_courier_delivery(
  target_order_id uuid,
  target_courier_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delivered_time timestamptz := now();
  delay_result jsonb;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  PERFORM 1
  FROM public.orders
  WHERE id = target_order_id
    AND courier_id = target_courier_id
    AND status = 'delivering'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery transition is no longer available';
  END IF;

  UPDATE public.orders
  SET status = 'delivered',
      delivered_at = delivered_time,
      updated_at = delivered_time
  WHERE id = target_order_id;

  UPDATE public.delivery_tracking
  SET status = 'delivered',
      dropoff_at = delivered_time,
      actual_delivery_at = delivered_time,
      updated_at = delivered_time
  WHERE order_id = target_order_id
    AND courier_id = target_courier_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery tracking row not found';
  END IF;

  delay_result := public.apply_courier_delay_penalty(target_order_id);
  RETURN jsonb_build_object(
    'delivered', true,
    'deliveredAt', delivered_time,
    'delayAdjustment', delay_result
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_courier_delivery(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_courier_delivery(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_courier_delivery(uuid, uuid) TO service_role;

ALTER TABLE public.order_financial_ledger
  ADD COLUMN IF NOT EXISTS courier_penalty_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.order_financial_ledger
  DROP CONSTRAINT IF EXISTS order_financial_ledger_courier_penalty_check;

ALTER TABLE public.order_financial_ledger
  ADD CONSTRAINT order_financial_ledger_courier_penalty_check
    CHECK (courier_penalty_cents >= 0);

CREATE OR REPLACE FUNCTION public.sync_order_delay_penalty_to_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.order_financial_ledger
  SET courier_penalty_cents = coalesce(NEW.courier_delay_penalty_cents, 0),
      updated_at = now()
  WHERE order_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_order_delay_penalty_to_ledger ON public.orders;
CREATE TRIGGER sync_order_delay_penalty_to_ledger
AFTER UPDATE OF courier_delay_penalty_cents ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_order_delay_penalty_to_ledger();

UPDATE public.order_financial_ledger ledger
SET courier_penalty_cents = coalesce(orders.courier_delay_penalty_cents, 0)
FROM public.orders orders
WHERE orders.id = ledger.order_id;

CREATE OR REPLACE VIEW public.admin_financial_account_balances
WITH (security_invoker = true)
AS
SELECT
  coalesce(sum(client_collected_cents), 0)::bigint AS client_collected_cents,
  coalesce(sum(advantage_funded_cents), 0)::bigint AS advantage_funded_cents,
  coalesce(sum(partner_cents), 0)::bigint AS partner_cents,
  coalesce(sum(delivery_fee_cents), 0)::bigint AS delivery_fee_cents,
  coalesce(sum(service_fee_cents), 0)::bigint AS service_fee_cents,
  coalesce(sum(courier_earnings_cents), 0)::bigint AS courier_earnings_cents,
  coalesce(sum(courier_prime_cents), 0)::bigint AS courier_prime_cents,
  coalesce(sum(foodiz_revenue_cents), 0)::bigint AS foodiz_revenue_cents,
  coalesce(sum(internal_fees_cents), 0)::bigint AS internal_fees_cents,
  coalesce(sum(loyalty_fund_cents), 0)::bigint AS loyalty_funded_cents,
  coalesce(sum(loyalty_redeemed_cents), 0)::bigint AS loyalty_consumed_cents,
  coalesce(sum(loyalty_fund_cents - loyalty_redeemed_cents), 0)::bigint AS loyalty_balance_cents,
  coalesce(sum(referral_fund_cents), 0)::bigint AS referral_fund_cents,
  coalesce(sum(system_reserve_cents), 0)::bigint AS system_reserve_cents,
  coalesce(sum(courier_penalty_cents), 0)::bigint AS courier_penalty_cents
FROM public.order_financial_ledger
WHERE payment_status = 'completed';

CREATE OR REPLACE VIEW public.admin_weekly_payables
WITH (security_invoker = true)
AS
SELECT
  ledger.partner_user_id AS beneficiary_id,
  'partner'::text AS beneficiary_type,
  restaurant.name AS beneficiary_name,
  restaurant.siret AS legal_identifier,
  count(*)::integer AS order_count,
  sum(ledger.partner_cents)::bigint AS amount_cents,
  min(ledger.delivered_at)::date AS first_delivery_date,
  max(ledger.delivered_at)::date AS last_delivery_date
FROM public.order_financial_ledger ledger
JOIN public.restaurants restaurant ON restaurant.id = ledger.restaurant_id
WHERE ledger.order_status = 'delivered'
  AND ledger.payment_status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.settlement_statement_items item
    JOIN public.settlement_statements statement ON statement.id = item.statement_id
    WHERE item.order_id = ledger.order_id AND item.allocation_type = 'partner' AND statement.status <> 'cancelled'
  )
GROUP BY ledger.partner_user_id, restaurant.name, restaurant.siret
UNION ALL
SELECT
  ledger.courier_id AS beneficiary_id,
  'courier'::text AS beneficiary_type,
  coalesce(profile.full_name, profile.email, 'Livreur Foodiz') AS beneficiary_name,
  application.siret AS legal_identifier,
  count(*)::integer AS order_count,
  sum(
    ledger.delivery_fee_cents
    + ledger.courier_earnings_cents
    + ledger.courier_prime_cents
    - ledger.courier_penalty_cents
  )::bigint AS amount_cents,
  min(ledger.delivered_at)::date AS first_delivery_date,
  max(ledger.delivered_at)::date AS last_delivery_date
FROM public.order_financial_ledger ledger
JOIN public.profiles profile ON profile.id = ledger.courier_id
LEFT JOIN public.courier_applications application ON application.user_id = ledger.courier_id
WHERE ledger.order_status = 'delivered'
  AND ledger.payment_status = 'completed'
  AND ledger.courier_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.settlement_statement_items item
    JOIN public.settlement_statements statement ON statement.id = item.statement_id
    WHERE item.order_id = ledger.order_id AND item.allocation_type = 'courier' AND statement.status <> 'cancelled'
  )
GROUP BY ledger.courier_id, profile.full_name, profile.email, application.siret;

CREATE OR REPLACE FUNCTION public.create_weekly_settlement(
  target_beneficiary_id uuid,
  target_beneficiary_type text,
  target_period_start date,
  target_period_end date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  statement_id uuid;
  beneficiary_name text;
  legal_id text;
  total_amount integer;
  document_no text;
BEGIN
  IF NOT public.current_user_has_role('admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  IF target_beneficiary_type NOT IN ('partner', 'courier') OR target_period_end < target_period_start THEN RAISE EXCEPTION 'Invalid settlement request'; END IF;

  IF target_beneficiary_type = 'partner' THEN
    SELECT r.name, r.siret INTO beneficiary_name, legal_id FROM public.restaurants r WHERE r.owner_id = target_beneficiary_id;
    SELECT coalesce(sum(ledger.partner_cents), 0)::integer INTO total_amount
    FROM public.order_financial_ledger ledger
    WHERE ledger.partner_user_id = target_beneficiary_id AND ledger.order_status = 'delivered' AND ledger.payment_status = 'completed'
      AND ledger.delivered_at::date BETWEEN target_period_start AND target_period_end
      AND NOT EXISTS (SELECT 1 FROM public.settlement_statement_items i JOIN public.settlement_statements s ON s.id = i.statement_id WHERE i.order_id = ledger.order_id AND i.allocation_type = 'partner' AND s.status <> 'cancelled');
  ELSE
    SELECT coalesce(p.full_name, p.email, 'Livreur Foodiz'), application.siret
    INTO beneficiary_name, legal_id
    FROM public.profiles p
    LEFT JOIN public.courier_applications application ON application.user_id = p.id
    WHERE p.id = target_beneficiary_id;

    SELECT coalesce(sum(
      ledger.delivery_fee_cents + ledger.courier_earnings_cents
      + ledger.courier_prime_cents - ledger.courier_penalty_cents
    ), 0)::integer INTO total_amount
    FROM public.order_financial_ledger ledger
    WHERE ledger.courier_id = target_beneficiary_id AND ledger.order_status = 'delivered' AND ledger.payment_status = 'completed'
      AND ledger.delivered_at::date BETWEEN target_period_start AND target_period_end
      AND NOT EXISTS (SELECT 1 FROM public.settlement_statement_items i JOIN public.settlement_statements s ON s.id = i.statement_id WHERE i.order_id = ledger.order_id AND i.allocation_type = 'courier' AND s.status <> 'cancelled');
  END IF;

  IF total_amount <= 0 THEN RAISE EXCEPTION 'No payable orders for this period'; END IF;
  document_no := 'FDZ-REV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.settlement_document_number_seq')::text, 7, '0');

  INSERT INTO public.settlement_statements (document_number, beneficiary_id, beneficiary_type, beneficiary_name, legal_identifier, period_start, period_end, amount_cents, generated_by)
  VALUES (document_no, target_beneficiary_id, target_beneficiary_type, beneficiary_name, legal_id, target_period_start, target_period_end, total_amount, auth.uid())
  RETURNING id INTO statement_id;

  IF target_beneficiary_type = 'partner' THEN
    INSERT INTO public.settlement_statement_items (statement_id, order_id, allocation_type, amount_cents)
    SELECT statement_id, ledger.order_id, 'partner', ledger.partner_cents
    FROM public.order_financial_ledger ledger
    WHERE ledger.partner_user_id = target_beneficiary_id AND ledger.order_status = 'delivered' AND ledger.payment_status = 'completed'
      AND ledger.delivered_at::date BETWEEN target_period_start AND target_period_end
      AND NOT EXISTS (SELECT 1 FROM public.settlement_statement_items i JOIN public.settlement_statements s ON s.id = i.statement_id WHERE i.order_id = ledger.order_id AND i.allocation_type = 'partner' AND s.status <> 'cancelled');
  ELSE
    INSERT INTO public.settlement_statement_items (statement_id, order_id, allocation_type, amount_cents)
    SELECT statement_id, ledger.order_id, 'courier',
      ledger.delivery_fee_cents + ledger.courier_earnings_cents
      + ledger.courier_prime_cents - ledger.courier_penalty_cents
    FROM public.order_financial_ledger ledger
    WHERE ledger.courier_id = target_beneficiary_id AND ledger.order_status = 'delivered' AND ledger.payment_status = 'completed'
      AND ledger.delivered_at::date BETWEEN target_period_start AND target_period_end
      AND ledger.delivery_fee_cents + ledger.courier_earnings_cents + ledger.courier_prime_cents - ledger.courier_penalty_cents > 0
      AND NOT EXISTS (SELECT 1 FROM public.settlement_statement_items i JOIN public.settlement_statements s ON s.id = i.statement_id WHERE i.order_id = ledger.order_id AND i.allocation_type = 'courier' AND s.status <> 'cancelled');
  END IF;
  RETURN statement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_weekly_settlement(uuid, text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_weekly_settlement(uuid, text, date, date) TO authenticated;
