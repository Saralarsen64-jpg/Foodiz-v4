


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."fraud_status" AS ENUM (
    'approved',
    'pending_review',
    'blocked',
    'rejected'
);


ALTER TYPE "public"."fraud_status" OWNER TO "postgres";


CREATE TYPE "public"."loyalty_type" AS ENUM (
    'order_reward',
    'referral_reward',
    'advantage_used',
    'survey_bonus',
    'admin_adjustment',
    'refund_correction'
);


ALTER TYPE "public"."loyalty_type" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending_payment',
    'paid',
    'accepted_by_partner',
    'preparing',
    'ready_for_pickup',
    'driver_assigned',
    'picked_up',
    'delivering',
    'delivered',
    'cancelled',
    'refunded',
    'disputed'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."payout_status" AS ENUM (
    'pending',
    'approved',
    'paid',
    'blocked',
    'disputed'
);


ALTER TYPE "public"."payout_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_resolve_support_ticket"("target_ticket_id" "uuid", "target_response" "text", "target_summary" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ticket public.support_tickets%ROWTYPE;
BEGIN
  IF NOT public.current_user_has_role('admin') THEN
    RAISE EXCEPTION 'Admin required';
  END IF;
  IF length(trim(coalesce(target_response, ''))) < 2 THEN
    RAISE EXCEPTION 'Response required';
  END IF;

  SELECT * INTO ticket
  FROM public.support_tickets
  WHERE id = target_ticket_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  UPDATE public.support_tickets
  SET admin_response = trim(target_response),
      resolution_summary = coalesce(nullif(trim(coalesce(target_summary, '')), ''), trim(target_response)),
      status = 'closed',
      resolved_at = now(),
      resolved_by = auth.uid(),
      updated_at = now()
  WHERE id = target_ticket_id;

  INSERT INTO public.support_ticket_events (
    ticket_id, actor_id, event_type, message, previous_status, new_status
  ) VALUES (
    target_ticket_id, auth.uid(), 'resolved', trim(target_response), ticket.status, 'closed'
  );

  INSERT INTO public.notifications (
    user_id, title, message, type, link, is_read
  ) VALUES (
    ticket.user_id,
    'Réponse du support Foodiz',
    'Votre demande "' || ticket.subject || '" a été traitée.',
    'support',
    CASE ticket.user_role WHEN 'partner' THEN '/partner/support' WHEN 'courier' THEN '/courier/support' ELSE '/client/help-center' END,
    false
  );
END;
$$;


ALTER FUNCTION "public"."admin_resolve_support_ticket"("target_ticket_id" "uuid", "target_response" "text", "target_summary" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_client_status"("target_user_id" "uuid", "target_status" "text", "target_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_set_client_status"("target_user_id" "uuid", "target_status" "text", "target_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_set_partner_status"("target_restaurant_id" "uuid", "target_status" "text", "target_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."admin_set_partner_status"("target_restaurant_id" "uuid", "target_status" "text", "target_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_waive_courier_delay_penalty"("target_order_id" "uuid", "target_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
      || ' a été annulée après examen par Foodiz.',
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


ALTER FUNCTION "public"."admin_waive_courier_delay_penalty"("target_order_id" "uuid", "target_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_courier_delay_penalty"("target_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."apply_courier_delay_penalty"("target_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_order_advantage"("target_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  redemption public.order_advantage_redemptions;
  catalog_row public.advantage_catalog;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;
  SELECT * INTO redemption FROM public.order_advantage_redemptions
  WHERE order_id = target_order_id AND status = 'reserved' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO catalog_row FROM public.advantage_catalog WHERE id = redemption.advantage_id;

  UPDATE public.client_wallets
  SET points_balance = points_balance - redemption.points_cost, updated_at = now()
  WHERE user_id = redemption.user_id AND points_balance >= redemption.points_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient points at payment confirmation'; END IF;

  UPDATE public.order_advantage_redemptions SET status = 'applied', applied_at = now()
  WHERE id = redemption.id;

  INSERT INTO public.client_rewards (
    user_id, advantage_id, title, description, points_spent,
    reward_code, status, expires_at, used_at
  ) VALUES (
    redemption.user_id,
    redemption.advantage_id,
    coalesce(catalog_row.title, 'Avantage Foodiz Club'),
    catalog_row.description,
    redemption.points_cost,
    'USED-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    'used', now(), now()
  );

  DELETE FROM public.client_locked_advantages WHERE id = redemption.locked_advantage_id;
END;
$$;


ALTER FUNCTION "public"."apply_order_advantage"("target_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_courier_delivery"("target_order_id" "uuid", "target_courier_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."claim_courier_delivery"("target_order_id" "uuid", "target_courier_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_courier_delivery"("target_order_id" "uuid", "target_courier_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."complete_courier_delivery"("target_order_id" "uuid", "target_courier_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_first_paid_referral"("target_order_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  order_row public.orders%ROWTYPE;
  referral_row public.referrals%ROWTYPE;
  credited_points integer;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  SELECT *
  INTO order_row
  FROM public.orders
  WHERE id = target_order_id
  FOR UPDATE;

  IF NOT FOUND
     OR order_row.payment_status <> 'completed'
     OR order_row.status NOT IN ('preparing', 'ready', 'pickup', 'delivering', 'delivered') THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.orders previous_order
    WHERE previous_order.client_id = order_row.client_id
      AND previous_order.id <> order_row.id
      AND previous_order.payment_status = 'completed'
      AND previous_order.status IN ('preparing', 'ready', 'pickup', 'delivering', 'delivered')
      AND previous_order.created_at < order_row.created_at
  ) THEN
    RETURN 0;
  END IF;

  SELECT *
  INTO referral_row
  FROM public.referrals
  WHERE filleul_id = order_row.client_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  credited_points := greatest(0, coalesce(referral_row.reward_points, 0));

  UPDATE public.referrals
  SET status = 'completed',
      completed_at = now()
  WHERE filleul_id = order_row.client_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  INSERT INTO public.client_wallets (user_id, points_balance)
  VALUES (referral_row.parrain_id, credited_points)
  ON CONFLICT (user_id) DO UPDATE
  SET points_balance = public.client_wallets.points_balance + EXCLUDED.points_balance,
      updated_at = now();

  UPDATE public.profiles
  SET referral_count = coalesce(referral_count, 0) + 1,
      updated_at = now()
  WHERE id = referral_row.parrain_id;

  RETURN credited_points;
END;
$$;


ALTER FUNCTION "public"."complete_first_paid_referral"("target_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_client_payment_receipt"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.payment_status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_status = 'completed' THEN RETURN NEW; END IF;
  PERFORM public.generate_client_payment_receipt(NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_client_payment_receipt"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_loyalty_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.loyalty_balances (user_id, balance_cents)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_loyalty_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_order_delivery_code"("target_order_id" "uuid", "target_client_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  candidate text;
  existing_code text;
  entropy bytea;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE id = target_order_id
      AND client_id = target_client_id
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


ALTER FUNCTION "public"."create_order_delivery_code"("target_order_id" "uuid", "target_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_paid_settlement_document"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  recipient_email text;
  beneficiary_name text;
  beneficiary_address text;
  beneficiary_identifier text;
  items jsonb;
BEGIN
  IF NEW.status <> 'paid' OR OLD.status = 'paid' THEN RETURN NEW; END IF;
  beneficiary_name := NEW.beneficiary_name;
  SELECT profile.email,
         concat_ws(', ', nullif(profile.address, ''), nullif(profile.postal_code, ''), nullif(profile.city, ''))
  INTO recipient_email, beneficiary_address
  FROM public.profiles profile WHERE profile.id = NEW.beneficiary_id;

  beneficiary_identifier := NEW.legal_identifier;
  IF NEW.beneficiary_type = 'courier' THEN
    SELECT coalesce(nullif(application.legal_name, ''), NEW.beneficiary_name), application.siret,
           concat_ws(', ', nullif(application.address, ''), nullif(application.postal_code, ''), nullif(application.city, ''))
    INTO beneficiary_name, beneficiary_identifier, beneficiary_address
    FROM public.courier_applications application WHERE application.user_id = NEW.beneficiary_id;
  ELSE
    SELECT concat_ws(', ', nullif(restaurant.address, ''), nullif(restaurant.postal_code, ''), nullif(restaurant.city, ''))
    INTO beneficiary_address FROM public.restaurants restaurant WHERE restaurant.owner_id = NEW.beneficiary_id;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'order_id', item.order_id, 'delivered_at', orders.delivered_at,
    'amount_cents', item.amount_cents, 'allocation_type', item.allocation_type
  ) ORDER BY orders.delivered_at), '[]'::jsonb)
  INTO items
  FROM public.settlement_statement_items item
  JOIN public.orders orders ON orders.id = item.order_id
  WHERE item.statement_id = NEW.id;

  INSERT INTO public.financial_documents (
    document_number, document_type, recipient_id, recipient_email, settlement_id, payload_snapshot
  ) VALUES (
    NEW.document_number, 'settlement_statement', NEW.beneficiary_id, recipient_email, NEW.id,
    jsonb_build_object(
      'beneficiary_name', beneficiary_name,
      'beneficiary_type', NEW.beneficiary_type,
      'beneficiary_address', beneficiary_address,
      'legal_identifier', beneficiary_identifier,
      'period_start', NEW.period_start, 'period_end', NEW.period_end,
      'amount_cents', NEW.amount_cents, 'currency', NEW.currency,
      'payment_method', NEW.payment_method, 'payment_reference', NEW.payment_reference,
      'paid_at', NEW.paid_at, 'items', items
    )
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_paid_settlement_document"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_weekly_settlement"("target_beneficiary_id" "uuid", "target_beneficiary_type" "text", "target_period_start" "date", "target_period_end" "date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_weekly_settlement"("target_beneficiary_id" "uuid", "target_beneficiary_type" "text", "target_period_start" "date", "target_period_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."credit_order_loyalty"("target_order_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  order_row public.orders%ROWTYPE;
  inserted_points integer;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;

  SELECT * INTO order_row FROM public.orders WHERE id = target_order_id FOR UPDATE;
  IF NOT FOUND OR order_row.payment_status <> 'completed' THEN RETURN 0; END IF;

  INSERT INTO public.order_loyalty_credits (order_id, user_id, points)
  VALUES (order_row.id, order_row.client_id, GREATEST(0, order_row.loyalty_fund_cents))
  ON CONFLICT (order_id) DO NOTHING
  RETURNING points INTO inserted_points;

  IF inserted_points IS NULL THEN RETURN 0; END IF;

  INSERT INTO public.client_wallets (user_id, points_balance)
  VALUES (order_row.client_id, inserted_points)
  ON CONFLICT (user_id) DO UPDATE
  SET points_balance = public.client_wallets.points_balance + EXCLUDED.points_balance,
      updated_at = now();

  RETURN inserted_points;
END;
$$;


ALTER FUNCTION "public"."credit_order_loyalty"("target_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_has_role"("required_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = required_role
  );
$$;


ALTER FUNCTION "public"."current_user_has_role"("required_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_client_address_server"("target_user_id" "uuid", "target_address_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."delete_client_address_server"("target_user_id" "uuid", "target_address_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_order_worker_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."enforce_order_worker_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_single_admin_email"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.role = 'admin' AND NEW.email != 'admin@foodiz.co' THEN
    RAISE EXCEPTION 'Seul admin@foodiz.co peut avoir le rôle administrateur';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_single_admin_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_service_area_server"("target_city" "text", "target_postal_code" "text", "target_latitude" numeric, "target_longitude" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."ensure_service_area_server"("target_city" "text", "target_postal_code" "text", "target_latitude" numeric, "target_longitude" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."foodiz_app_is_launched"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT coalesce(
    (SELECT (value ->> 'launched')::boolean
     FROM public.app_settings
     WHERE key = 'launch_status'),
    false
  );
$$;


ALTER FUNCTION "public"."foodiz_app_is_launched"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."foodiz_application_access_allowed"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."foodiz_application_access_allowed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."foodiz_department_from_postal_code"("target_postal_code" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $_$
  SELECT CASE
    WHEN target_postal_code ~ '^20[0-9]{3}$'
      THEN CASE WHEN substring(target_postal_code, 1, 3)::integer <= 201 THEN '2A' ELSE '2B' END
    WHEN target_postal_code ~ '^(97|98)[0-9]{3}$' THEN substring(target_postal_code, 1, 3)
    WHEN target_postal_code ~ '^[0-9]{5}$' THEN substring(target_postal_code, 1, 2)
    ELSE NULL
  END;
$_$;


ALTER FUNCTION "public"."foodiz_department_from_postal_code"("target_postal_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_client_payment_receipt"("target_order_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  order_row public.orders%ROWTYPE;
  recipient_email text;
  restaurant_name text;
  items jsonb;
  document_no text;
  document_id uuid;
BEGIN
  SELECT * INTO order_row FROM public.orders WHERE id = target_order_id;
  IF NOT FOUND OR order_row.payment_status <> 'completed' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO document_id
  FROM public.financial_documents
  WHERE order_id = order_row.id AND document_type = 'client_payment_receipt';
  IF document_id IS NOT NULL THEN
    RETURN document_id;
  END IF;

  SELECT profile.email INTO recipient_email FROM public.profiles profile WHERE profile.id = order_row.client_id;
  SELECT restaurant.name INTO restaurant_name FROM public.restaurants restaurant WHERE restaurant.id = order_row.restaurant_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'product_name', product.name,
    'quantity', item.quantity,
    'unit_price_cents', item.unit_price_cents,
    'total_price_cents', item.total_price_cents
  ) ORDER BY item.created_at), '[]'::jsonb)
  INTO items
  FROM public.order_items item
  LEFT JOIN public.products product ON product.id = item.product_id
  WHERE item.order_id = order_row.id;

  document_no := 'FDZ-REC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.financial_document_number_seq')::text, 7, '0');
  INSERT INTO public.financial_documents (
    document_number, document_type, recipient_id, recipient_email, order_id, payload_snapshot
  ) VALUES (
    document_no, 'client_payment_receipt', order_row.client_id, recipient_email, order_row.id,
    jsonb_build_object(
      'order_id', order_row.id,
      'restaurant_name', restaurant_name,
      'order_created_at', order_row.created_at,
      'payment_confirmed_at', now(),
      'payment_reference', order_row.stripe_payment_intent_id,
      'delivery_address', order_row.delivery_address,
      'items', items,
      'partner_total_cents', order_row.partner_total_cents,
      'service_fee_cents', order_row.service_fee_cents,
      'delivery_fee_cents', order_row.delivery_fee_cents,
      'advantage_discount_cents', coalesce(order_row.advantage_discount_cents, 0),
      'total_paid_cents', order_row.final_client_total_cents,
      'currency', 'EUR'
    )
  ) RETURNING id INTO document_id;

  RETURN document_id;
END;
$$;


ALTER FUNCTION "public"."generate_client_payment_receipt"("target_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_foodiz_ref_code"("user_id" "uuid") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  SELECT 'FDZ-' || upper(substr(md5(user_id::text), 1, 8));
$$;


ALTER FUNCTION "public"."generate_foodiz_ref_code"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_client_order_courier_contact"("target_order_id" "uuid") RETURNS TABLE("profile_id" "uuid", "display_name" "text", "first_name" "text", "last_name" "text", "phone" "text", "avatar_url" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    courier.id,
    coalesce(
      nullif(courier.full_name, ''),
      nullif(concat_ws(' ', courier.first_name, courier.last_name), ''),
      'Livreur Foodiz'
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


ALTER FUNCTION "public"."get_client_order_courier_contact"("target_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_courier_order_client_contact"("target_order_id" "uuid") RETURNS TABLE("profile_id" "uuid", "display_name" "text", "first_name" "text", "phone" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    client.id,
    coalesce(
      nullif(client.full_name, ''),
      nullif(concat_ws(' ', client.first_name, client.last_name), ''),
      'Client Foodiz'
    ),
    client.first_name,
    client.phone
  FROM public.orders orders
  JOIN public.profiles client ON client.id = orders.client_id
  WHERE orders.id = target_order_id
    AND orders.courier_id = auth.uid()
    AND orders.status IN ('pickup', 'picked_up', 'delivering');
$$;


ALTER FUNCTION "public"."get_courier_order_client_contact"("target_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_partner_order_customers"() RETURNS TABLE("order_id" "uuid", "client_id" "uuid", "display_name" "text", "phone" "text", "address" "text", "postal_code" "text", "city" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    orders.id,
    client.id,
    coalesce(
      nullif(client.full_name, ''),
      nullif(concat_ws(' ', client.first_name, client.last_name), ''),
      'Client Foodiz'
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


ALTER FUNCTION "public"."get_partner_order_customers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_email_confirmation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Si l'email vient d'être confirmé (il était null avant, et ne l'est plus maintenant)
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- On met à jour la table profiles pour dire que le compte est approuvé/actif
    UPDATE public.profiles
    SET is_approved = true
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_email_confirmation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_foodiz_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
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
        'Établissement Foodiz'
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
        'Établissement Foodiz'
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


ALTER FUNCTION "public"."handle_new_foodiz_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_order_delivered"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- On ne déclenche l'action que si le statut passe EXACTEMENT à 'delivered' 
  -- et qu'il ne l'était pas avant (pour éviter les doubles paiements)
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN

    -- 1. DISTRIBUTION FIDÉLITÉ CLIENT (1 centime = 1 point)
    IF NEW.loyalty_fund_cents > 0 AND NEW.client_id IS NOT NULL THEN
      -- Mettre à jour ou créer le wallet client
      INSERT INTO public.client_wallets (user_id, points_balance, updated_at)
      VALUES (NEW.client_id, NEW.loyalty_fund_cents, now())
      ON CONFLICT (user_id) DO UPDATE
      SET points_balance = client_wallets.points_balance + EXCLUDED.points_balance,
          updated_at = now();

      -- Enregistrer l'historique
      INSERT INTO public.client_loyalty_transactions (user_id, order_id, points, type)
      VALUES (NEW.client_id, NEW.id, NEW.loyalty_fund_cents, 'order_reward');
    END IF;

    -- 2. DISTRIBUTION PRIME LIVREUR FOODIZ (1 centime = 1 point | 100 points = 1€)
    IF NEW.courier_prime_fund_cents > 0 AND NEW.courier_id IS NOT NULL THEN
      -- Mettre à jour ou créer le wallet prime livreur
      INSERT INTO public.courier_prime_wallets (courier_id, points_balance, euro_balance, total_earned_cents, updated_at)
      VALUES (
        NEW.courier_id, 
        NEW.courier_prime_fund_cents, 
        (NEW.courier_prime_fund_cents::numeric / 100), -- Conversion centimes en euros
        NEW.courier_prime_fund_cents, 
        now()
      )
      ON CONFLICT (courier_id) DO UPDATE
      SET 
        points_balance = courier_prime_wallets.points_balance + EXCLUDED.points_balance,
        euro_balance = courier_prime_wallets.euro_balance + (EXCLUDED.points_balance::numeric / 100),
        total_earned_cents = courier_prime_wallets.total_earned_cents + EXCLUDED.total_earned_cents,
        updated_at = now();

      -- Enregistrer l'historique
      INSERT INTO public.courier_prime_transactions (courier_id, order_id, points, amount_cents, type)
      VALUES (NEW.courier_id, NEW.id, NEW.courier_prime_fund_cents, NEW.courier_prime_fund_cents, 'order_prime');
    END IF;

  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_order_delivered"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_settlement_paid"("target_statement_id" "uuid", "target_payment_reference" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  statement public.settlement_statements%ROWTYPE;
BEGIN
  IF NOT public.current_user_has_role('admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
  IF length(trim(coalesce(target_payment_reference, ''))) < 3 THEN RAISE EXCEPTION 'Payment reference required'; END IF;
  SELECT * INTO statement FROM public.settlement_statements WHERE id = target_statement_id AND status = 'draft' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Draft statement not found'; END IF;

  UPDATE public.settlement_statements SET status = 'paid', payment_reference = trim(target_payment_reference), paid_at = now() WHERE id = target_statement_id;
  INSERT INTO public.payouts (user_id, amount_cents, currency, status, requested_at, paid_at, settlement_id, payment_reference, beneficiary_type, period_start, period_end)
  VALUES (statement.beneficiary_id, statement.amount_cents, statement.currency, 'paid', statement.generated_at, now(), statement.id, trim(target_payment_reference), statement.beneficiary_type, statement.period_start, statement.period_end);
END;
$$;


ALTER FUNCTION "public"."mark_settlement_paid"("target_statement_id" "uuid", "target_payment_reference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_foodiz_city"("target_city" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT lower(regexp_replace(trim(coalesce(target_city, '')), '\s+', ' ', 'g'));
$$;


ALTER FUNCTION "public"."normalize_foodiz_city"("target_city" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_foodiz_phone"("raw_phone" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    SET "search_path" TO 'public'
    AS $_$
  WITH cleaned AS (
    SELECT regexp_replace(trim(raw_phone), '[^0-9]', '', 'g') AS digits
  )
  SELECT CASE
    WHEN digits ~ '^0[1-9][0-9]{8}$'
      THEN '+33' || substring(digits FROM 2)
    WHEN digits ~ '^33[1-9][0-9]{8}$'
      THEN '+' || digits
    WHEN digits ~ '^0033[1-9][0-9]{8}$'
      THEN '+' || substring(digits FROM 3)
    WHEN digits ~ '^[1-9][0-9]{7,14}$'
      THEN '+' || digits
    ELSE NULL
  END
  FROM cleaned;
$_$;


ALTER FUNCTION "public"."normalize_foodiz_phone"("raw_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."promote_user_to_admin"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."promote_user_to_admin"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_courier_application_review_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."protect_courier_application_review_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_partner_application_review_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."protect_partner_application_review_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_profile_privileged_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
    IF OLD.role = 'courier' THEN
      NEW.courier_online := OLD.courier_online;
      NEW.courier_latitude := OLD.courier_latitude;
      NEW.courier_longitude := OLD.courier_longitude;
      NEW.courier_location_accuracy_meters := OLD.courier_location_accuracy_meters;
      NEW.courier_location_updated_at := OLD.courier_location_updated_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_profile_privileged_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_restaurant_privileged_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."protect_restaurant_privileged_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_restaurant_validation_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.current_user_has_role('admin') THEN
    NEW.owner_id := OLD.owner_id;
    NEW.status := OLD.status;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_restaurant_validation_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_ai_advantage_cycle"("proposals" "jsonb", "model_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  cycle uuid := gen_random_uuid();
  proposal jsonb;
  offer_count integer;
  title_value text;
  description_value text;
  type_value text;
  face_value integer;
  minimum_order integer;
  percent_value integer;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('foodiz_advantage_rotation'));
  IF EXISTS (
    SELECT 1 FROM public.advantage_generation_runs
    WHERE status = 'success' AND generated_at > now() - interval '48 hours'
  ) THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(proposals) <> 'array' THEN
    RAISE EXCEPTION 'Proposals must be an array';
  END IF;
  offer_count := jsonb_array_length(proposals);
  IF offer_count < 3 OR offer_count > 6 THEN
    RAISE EXCEPTION 'A cycle must contain between 3 and 6 offers';
  END IF;

  FOR proposal IN SELECT value FROM jsonb_array_elements(proposals)
  LOOP
    title_value := trim(proposal ->> 'title');
    description_value := trim(proposal ->> 'description');
    type_value := proposal ->> 'reward_type';
    face_value := (proposal ->> 'face_value_cents')::integer;
    minimum_order := (proposal ->> 'minimum_order_cents')::integer;
    percent_value := coalesce((proposal ->> 'discount_percent')::integer, 0);

    IF char_length(title_value) NOT BETWEEN 5 AND 80
       OR char_length(description_value) NOT BETWEEN 10 AND 180 THEN
      RAISE EXCEPTION 'Invalid offer wording';
    END IF;
    IF type_value NOT IN ('fixed_discount', 'percent_discount', 'free_delivery', 'free_item') THEN
      RAISE EXCEPTION 'Invalid reward type';
    END IF;
    IF face_value NOT BETWEEN 100 AND 1500 THEN
      RAISE EXCEPTION 'Offer value outside allowed range';
    END IF;
    IF minimum_order < face_value OR minimum_order > 10000 THEN
      RAISE EXCEPTION 'Invalid minimum order';
    END IF;
    IF type_value = 'percent_discount' AND percent_value NOT BETWEEN 5 AND 20 THEN
      RAISE EXCEPTION 'Invalid discount percentage';
    END IF;
    IF type_value <> 'percent_discount' THEN
      percent_value := 0;
    END IF;

    INSERT INTO public.advantage_catalog (
      cycle_id, title, description, points_cost, value_euros, valid_until,
      is_active, reward_type, face_value_cents, minimum_order_cents,
      discount_percent, source, generated_at
    ) VALUES (
      cycle, title_value, description_value, face_value, face_value::numeric / 100,
      now() + interval '48 hours', true, type_value, face_value,
      minimum_order, percent_value, 'ai', now()
    );
  END LOOP;

  UPDATE public.advantage_catalog
  SET is_active = false
  WHERE is_active = true AND cycle_id IS DISTINCT FROM cycle;

  INSERT INTO public.advantage_generation_runs (model_name, status, offer_count)
  VALUES (model_name, 'success', offer_count);
  RETURN cycle;
END;
$$;


ALTER FUNCTION "public"."publish_ai_advantage_cycle"("proposals" "jsonb", "model_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."publish_foodiz_advantage_cycle"("proposals" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  cycle uuid := gen_random_uuid();
  proposal jsonb;
  allowed_points integer[] := ARRAY[250, 500, 800, 1000, 1500, 2000];
  received_points integer[] := ARRAY[]::integer[];
  points_value integer;
  face_value integer;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('foodiz_advantage_rotation'));

  IF EXISTS (
    SELECT 1
    FROM public.advantage_catalog
    WHERE source = 'rules_engine'
      AND is_active = true
      AND cycle_id IS NOT NULL
      AND valid_until > now()
  ) THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(proposals) <> 'array' OR jsonb_array_length(proposals) <> 6 THEN
    RAISE EXCEPTION 'A cycle must contain exactly six offers';
  END IF;

  FOR proposal IN SELECT value FROM jsonb_array_elements(proposals)
  LOOP
    points_value := (proposal ->> 'points_cost')::integer;
    face_value := (proposal ->> 'face_value_cents')::integer;

    IF NOT points_value = ANY(allowed_points) OR points_value = ANY(received_points) THEN
      RAISE EXCEPTION 'Invalid or duplicated points tier';
    END IF;
    IF face_value <> points_value THEN
      RAISE EXCEPTION 'Maximum value must equal points cost';
    END IF;
    IF (proposal ->> 'category') NOT IN ('all', 'restaurant', 'market') THEN
      RAISE EXCEPTION 'Invalid category';
    END IF;

    received_points := array_append(received_points, points_value);

    INSERT INTO public.advantage_catalog (
      cycle_id, template_key, title, description, points_cost, value_euros,
      valid_until, is_active, reward_type, face_value_cents,
      minimum_order_cents, discount_percent, source, generated_at,
      category, eligible_products, eligible_establishments
    ) VALUES (
      cycle,
      proposal ->> 'template_key',
      trim(proposal ->> 'title'),
      trim(proposal ->> 'description'),
      points_value,
      face_value::numeric / 100,
      now() + interval '48 hours',
      true,
      proposal ->> 'reward_type',
      face_value,
      (proposal ->> 'minimum_order_cents')::integer,
      0,
      'rules_engine',
      now(),
      proposal ->> 'category',
      coalesce(
        ARRAY(SELECT jsonb_array_elements_text(proposal -> 'eligible_products')::uuid),
        ARRAY[]::uuid[]
      ),
      coalesce(
        ARRAY(SELECT jsonb_array_elements_text(proposal -> 'eligible_establishments')::uuid),
        ARRAY[]::uuid[]
      )
    );
  END LOOP;

  UPDATE public.advantage_catalog
  SET is_active = false
  WHERE is_active = true
    AND cycle_id IS DISTINCT FROM cycle;

  INSERT INTO public.advantage_generation_runs (model_name, status, offer_count)
  VALUES ('foodiz-rule-engine-v2', 'success', 6);

  RETURN cycle;
END;
$$;


ALTER FUNCTION "public"."publish_foodiz_advantage_cycle"("proposals" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_courier_delivery_step"("target_order_id" "uuid", "target_courier_id" "uuid", "target_step" "text", "target_latitude" numeric, "target_longitude" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."record_courier_delivery_step"("target_order_id" "uuid", "target_courier_id" "uuid", "target_step" "text", "target_latitude" numeric, "target_longitude" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_courier_pickup"("target_order_id" "uuid", "target_courier_id" "uuid", "target_pickup_latitude" numeric, "target_pickup_longitude" numeric, "target_gps_accuracy_meters" numeric, "target_route_duration_seconds" integer, "target_route_distance_meters" integer, "target_expected_arrival_at" timestamp with time zone, "target_eta_provider" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."record_courier_pickup"("target_order_id" "uuid", "target_courier_id" "uuid", "target_pickup_latitude" numeric, "target_pickup_longitude" numeric, "target_gps_accuracy_meters" numeric, "target_route_duration_seconds" integer, "target_route_distance_meters" integer, "target_expected_arrival_at" timestamp with time zone, "target_eta_provider" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."client_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "advantage_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "points_spent" integer NOT NULL,
    "reward_code" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval) NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "client_rewards_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'used'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."client_rewards" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_locked_advantage"() RETURNS "public"."client_rewards"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  locked_row public.client_locked_advantages;
  catalog_row public.advantage_catalog;
  wallet_points integer;
  reward_row public.client_rewards;
BEGIN
  SELECT * INTO locked_row FROM public.client_locked_advantages
  WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No locked advantage'; END IF;

  SELECT * INTO catalog_row FROM public.advantage_catalog WHERE id = locked_row.catalog_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Advantage unavailable'; END IF;

  SELECT points_balance INTO wallet_points FROM public.client_wallets
  WHERE user_id = auth.uid() FOR UPDATE;
  IF wallet_points < catalog_row.points_cost THEN RAISE EXCEPTION 'Insufficient points'; END IF;

  UPDATE public.client_wallets
  SET points_balance = points_balance - catalog_row.points_cost, updated_at = now()
  WHERE user_id = auth.uid();

  INSERT INTO public.client_rewards (
    user_id, advantage_id, title, description, points_spent, reward_code, expires_at
  ) VALUES (
    auth.uid(), catalog_row.id, locked_row.title, locked_row.description,
    catalog_row.points_cost, 'AV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), now() + interval '30 days'
  ) RETURNING * INTO reward_row;

  DELETE FROM public.client_locked_advantages WHERE id = locked_row.id;
  RETURN reward_row;
END;
$$;


ALTER FUNCTION "public"."redeem_locked_advantage"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regenerate_advantage_catalog"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_valid_until timestamp with time zone;
BEGIN
  -- Définit la date de fin pour les 48 prochaines heures
  new_valid_until := now() + interval '48 hours';
  
  -- Supprime les anciens avantages
  DELETE FROM public.advantage_catalog;

  -- Génération des avantages de base (Règle stricte : 100 pts = 1€ max)
  INSERT INTO public.advantage_catalog (title, description, points_cost, value_euros, valid_until) VALUES 
  ('Réduction Immédiate', '-1,50 € sur votre prochaine commande.', 150, 1.50, new_valid_until),
  ('Livraison Premium', 'Frais de service entièrement offerts.', 250, 2.50, new_valid_until),
  ('Bon d''Achat Foodiz', '-5,00 € sur vos courses.', 500, 5.00, new_valid_until),
  ('Dessert Offert', 'Un dessert gratuit (max 8,00 €).', 800, 8.00, new_valid_until),
  ('Menu Royal Offert', 'Un menu complet gratuit (max 15,00 €).', 1500, 15.00, new_valid_until),
  ('Nuit Gourmande', '-20,00 € sur vos achats après 22h.', 2000, 20.00, new_valid_until);

  -- Simulation IA : Ajoute aléatoirement un avantage "Spécial" pour rendre le catalogue unique à chaque cycle de 48h
  IF random() > 0.5 THEN
     INSERT INTO public.advantage_catalog (title, description, points_cost, value_euros, valid_until)
     VALUES ('Boost Burger', '-3,00 € sur tous les burgers ce cycle.', 300, 3.00, new_valid_until);
  END IF;
  
  IF random() > 0.7 THEN
     INSERT INTO public.advantage_catalog (title, description, points_cost, value_euros, valid_until)
     VALUES ('Cagnotte Market', '-10,00 € sur le Market Foodiz.', 1000, 10.00, new_valid_until);
  END IF;
END;
$$;


ALTER FUNCTION "public"."regenerate_advantage_catalog"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_delivery_code_failure"("target_order_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  verification public.delivery_code_verifications%ROWTYPE;
  next_attempt integer;
  lock_expiry timestamp with time zone;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;

  SELECT * INTO verification
  FROM public.delivery_code_verifications
  WHERE order_id = target_order_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'NOT_FOUND'); END IF;

  IF verification.locked_until IS NOT NULL AND verification.locked_until > now() THEN
    RETURN jsonb_build_object(
      'locked', true,
      'retryAfterSeconds', GREATEST(1, ceil(extract(epoch FROM verification.locked_until - now()))::integer)
    );
  END IF;

  next_attempt := verification.failed_attempts + 1;
  IF next_attempt >= 5 THEN
    lock_expiry := now() + interval '15 minutes';
    UPDATE public.delivery_code_verifications
    SET failed_attempts = 0, last_failed_at = now(), locked_until = lock_expiry
    WHERE order_id = target_order_id;
    RETURN jsonb_build_object('locked', true, 'retryAfterSeconds', 900);
  END IF;

  UPDATE public.delivery_code_verifications
  SET failed_attempts = next_attempt, last_failed_at = now(), locked_until = null
  WHERE order_id = target_order_id;
  RETURN jsonb_build_object('locked', false, 'remainingAttempts', 5 - next_attempt);
END;
$$;


ALTER FUNCTION "public"."register_delivery_code_failure"("target_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."release_order_advantage"("target_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;
  UPDATE public.order_advantage_redemptions
  SET status = 'released', released_at = now()
  WHERE order_id = target_order_id AND status = 'reserved';
END;
$$;


ALTER FUNCTION "public"."release_order_advantage"("target_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."require_courier_legal_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  approved_document_count integer;
BEGIN
  IF NEW.status = 'validated' AND OLD.status IS DISTINCT FROM 'validated' THEN
    SELECT count(*)
    INTO approved_document_count
    FROM public.courier_documents document
    WHERE document.user_id = NEW.user_id
      AND document.status = 'approved'
      AND document.document_type IN ('identity_front', 'identity_back', 'activity_proof');

    IF nullif(trim(coalesce(NEW.legal_name, '')), '') IS NULL
      OR NEW.siret !~ '^[0-9]{14}$'
      OR nullif(trim(coalesce(NEW.address, '')), '') IS NULL
      OR NEW.postal_code !~ '^[0-9]{5}$'
      OR NEW.document_review_status <> 'approved'
      OR NEW.identity_name_confirmed IS NOT TRUE
      OR NEW.business_identity_confirmed IS NOT TRUE
      OR approved_document_count <> 3 THEN
      RAISE EXCEPTION
        'Courier validation requires legal identity, SIRET, address, three approved documents and both identity confirmations';
    END IF;
  END IF;
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."require_courier_legal_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reserve_order_advantage"("target_order_id" "uuid", "target_user_id" "uuid", "target_locked_id" "uuid", "expected_discount_cents" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  locked_row public.client_locked_advantages;
  catalog_row public.advantage_catalog;
  wallet_points integer;
  already_reserved integer;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;
  SELECT * INTO locked_row FROM public.client_locked_advantages
  WHERE id = target_locked_id AND user_id = target_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Locked advantage unavailable'; END IF;

  SELECT * INTO catalog_row FROM public.advantage_catalog WHERE id = locked_row.catalog_id;
  IF NOT FOUND OR expected_discount_cents <= 0 OR expected_discount_cents > catalog_row.face_value_cents THEN
    RAISE EXCEPTION 'Invalid advantage discount';
  END IF;

  SELECT points_balance INTO wallet_points FROM public.client_wallets
  WHERE user_id = target_user_id FOR UPDATE;
  SELECT coalesce(sum(points_cost), 0) INTO already_reserved
  FROM public.order_advantage_redemptions
  WHERE user_id = target_user_id AND status = 'reserved';
  IF wallet_points - already_reserved < catalog_row.points_cost THEN RAISE EXCEPTION 'Insufficient points'; END IF;

  INSERT INTO public.order_advantage_redemptions (
    order_id, user_id, locked_advantage_id, advantage_id, points_cost, discount_cents
  ) VALUES (
    target_order_id, target_user_id, locked_row.id, catalog_row.id,
    catalog_row.points_cost, expected_discount_cents
  );
END;
$$;


ALTER FUNCTION "public"."reserve_order_advantage"("target_order_id" "uuid", "target_user_id" "uuid", "target_locked_id" "uuid", "expected_discount_cents" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reverse_applied_order_advantage"("target_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  redemption public.order_advantage_redemptions;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;

  SELECT * INTO redemption FROM public.order_advantage_redemptions
  WHERE order_id = target_order_id AND status IN ('reserved', 'applied') FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF redemption.status = 'applied' THEN
    UPDATE public.client_wallets
    SET points_balance = points_balance + redemption.points_cost, updated_at = now()
    WHERE user_id = redemption.user_id;

    UPDATE public.client_rewards
    SET status = 'cancelled'
    WHERE user_id = redemption.user_id
      AND advantage_id IS NOT DISTINCT FROM redemption.advantage_id
      AND points_spent = redemption.points_cost
      AND status = 'used'
      AND used_at = redemption.applied_at;
  END IF;

  UPDATE public.order_advantage_redemptions
  SET status = 'released', released_at = now()
  WHERE id = redemption.id;
END;
$$;


ALTER FUNCTION "public"."reverse_applied_order_advantage"("target_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reverse_order_loyalty"("target_order_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  credit_row public.order_loyalty_credits%ROWTYPE;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;

  SELECT * INTO credit_row
  FROM public.order_loyalty_credits
  WHERE order_id = target_order_id AND status = 'credited'
  FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;

  UPDATE public.client_wallets
  SET points_balance = GREATEST(0, points_balance - credit_row.points), updated_at = now()
  WHERE user_id = credit_row.user_id;

  UPDATE public.order_loyalty_credits
  SET status = 'reversed', reversed_at = now()
  WHERE id = credit_row.id;

  RETURN credit_row.points;
END;
$$;


ALTER FUNCTION "public"."reverse_order_loyalty"("target_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."review_courier_application"("target_application_id" "uuid", "target_reviewer_id" "uuid", "target_decision" "text", "target_comment" "text", "target_identity_name_confirmed" boolean, "target_business_identity_confirmed" boolean, "target_document_types" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  application_row public.courier_applications%ROWTYPE;
  prelaunch_profile_id_value uuid;
  document_count integer;
  review_time timestamptz := now();
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

  SELECT *
  INTO application_row
  FROM public.courier_applications
  WHERE id = target_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Courier application not found';
  END IF;

  SELECT id
  INTO prelaunch_profile_id_value
  FROM public.prelaunch_profiles
  WHERE user_id = application_row.user_id;

  IF target_decision = 'approve' THEN
    SELECT count(*)
    INTO document_count
    FROM public.courier_documents
    WHERE user_id = application_row.user_id
      AND document_type IN ('identity_front', 'identity_back', 'activity_proof');

    IF document_count <> 3
       OR target_identity_name_confirmed IS NOT TRUE
       OR target_business_identity_confirmed IS NOT TRUE THEN
      RAISE EXCEPTION 'Three documents and both identity confirmations are required';
    END IF;

    UPDATE public.courier_documents
    SET status = 'approved',
        review_comment = nullif(trim(coalesce(target_comment, '')), ''),
        reviewed_by = target_reviewer_id,
        reviewed_at = review_time
    WHERE user_id = application_row.user_id;

    UPDATE public.courier_applications
    SET status = 'validated',
        document_review_status = 'approved',
        document_review_comment = nullif(trim(coalesce(target_comment, '')), ''),
        identity_name_confirmed = true,
        business_identity_confirmed = true,
        reviewed_by = target_reviewer_id,
        reviewed_at = review_time,
        updated_at = review_time
    WHERE id = application_row.id;

    UPDATE public.profiles
    SET status = 'validated', updated_at = review_time
    WHERE id = application_row.user_id;

    UPDATE public.prelaunch_driver_details
    SET document_review_status = 'approved',
        document_review_comment = nullif(trim(coalesce(target_comment, '')), ''),
        reviewed_by = target_reviewer_id,
        reviewed_at = review_time
    WHERE prelaunch_profile_id = prelaunch_profile_id_value;
  ELSIF target_decision = 'request_replacement' THEN
    IF coalesce(array_length(target_document_types, 1), 0) = 0 THEN
      RAISE EXCEPTION 'Select at least one document to replace';
    END IF;

    UPDATE public.courier_documents
    SET status = 'replacement_requested',
        review_comment = trim(target_comment),
        reviewed_by = target_reviewer_id,
        reviewed_at = review_time
    WHERE user_id = application_row.user_id
      AND document_type = ANY(target_document_types);

    UPDATE public.courier_applications
    SET status = 'missing_documents',
        document_review_status = 'replacement_requested',
        document_review_comment = trim(target_comment),
        identity_name_confirmed = false,
        business_identity_confirmed = false,
        reviewed_by = target_reviewer_id,
        reviewed_at = review_time,
        updated_at = review_time
    WHERE id = application_row.id;

    UPDATE public.profiles
    SET status = 'missing_documents', updated_at = review_time
    WHERE id = application_row.user_id;

    UPDATE public.prelaunch_driver_details
    SET document_review_status = 'replacement_requested',
        document_review_comment = trim(target_comment),
        reviewed_by = target_reviewer_id,
        reviewed_at = review_time
    WHERE prelaunch_profile_id = prelaunch_profile_id_value;
  ELSE
    UPDATE public.courier_documents
    SET status = 'rejected',
        review_comment = trim(target_comment),
        reviewed_by = target_reviewer_id,
        reviewed_at = review_time
    WHERE user_id = application_row.user_id;

    UPDATE public.courier_applications
    SET status = 'rejected',
        document_review_status = 'rejected',
        document_review_comment = trim(target_comment),
        identity_name_confirmed = false,
        business_identity_confirmed = false,
        reviewed_by = target_reviewer_id,
        reviewed_at = review_time,
        updated_at = review_time
    WHERE id = application_row.id;

    UPDATE public.profiles
    SET status = 'rejected', updated_at = review_time
    WHERE id = application_row.user_id;

    UPDATE public.prelaunch_profiles
    SET status = 'rejected', updated_at = review_time
    WHERE id = prelaunch_profile_id_value;

    UPDATE public.prelaunch_driver_details
    SET document_review_status = 'rejected',
        document_review_comment = trim(target_comment),
        reviewed_by = target_reviewer_id,
        reviewed_at = review_time
    WHERE prelaunch_profile_id = prelaunch_profile_id_value;
  END IF;

  RETURN jsonb_build_object(
    'applicationId', application_row.id,
    'userId', application_row.user_id,
    'decision', target_decision,
    'reviewedAt', review_time
  );
END;
$$;


ALTER FUNCTION "public"."review_courier_application"("target_application_id" "uuid", "target_reviewer_id" "uuid", "target_decision" "text", "target_comment" "text", "target_identity_name_confirmed" boolean, "target_business_identity_confirmed" boolean, "target_document_types" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."review_partner_application_server"("target_application_id" "uuid", "target_reviewer_id" "uuid", "target_decision" "text", "target_comment" "text", "target_document_types" "text"[] DEFAULT '{}'::"text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."review_partner_application_server"("target_application_id" "uuid", "target_reviewer_id" "uuid", "target_decision" "text", "target_comment" "text", "target_document_types" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_client_delivery_address_server"("target_user_id" "uuid", "target_address_id" "uuid", "target_label" "text", "target_address" "text", "target_postal_code" "text", "target_city" "text", "target_latitude" numeric, "target_longitude" numeric, "make_default" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."save_client_delivery_address_server"("target_user_id" "uuid", "target_address_id" "uuid", "target_label" "text", "target_address" "text", "target_postal_code" "text", "target_city" "text", "target_latitude" numeric, "target_longitude" numeric, "make_default" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_partner_establishment_server"("target_user_id" "uuid", "target_name" "text", "target_siret" "text", "target_phone" "text", "target_address" "text", "target_postal_code" "text", "target_city" "text", "target_description" "text", "target_latitude" numeric, "target_longitude" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."save_partner_establishment_server"("target_user_id" "uuid", "target_name" "text", "target_siret" "text", "target_phone" "text", "target_address" "text", "target_postal_code" "text", "target_city" "text", "target_description" "text", "target_latitude" numeric, "target_longitude" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_bank_accounts_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_bank_accounts_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_client_default_address_server"("target_user_id" "uuid", "target_address_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."set_client_default_address_server"("target_user_id" "uuid", "target_address_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_partner_operational_status_server"("target_restaurant_id" "uuid", "target_reviewer_id" "uuid", "target_status" "text", "target_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."set_partner_operational_status_server"("target_restaurant_id" "uuid", "target_reviewer_id" "uuid", "target_status" "text", "target_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_prelaunch_professional_access"("target_user_id" "uuid", "target_reviewer_id" "uuid", "target_enabled" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."set_prelaunch_professional_access"("target_user_id" "uuid", "target_reviewer_id" "uuid", "target_enabled" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_prelaunch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_prelaunch_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_service_area_status_server"("target_area_id" "uuid", "target_reviewer_id" "uuid", "target_status" "text", "target_delivery_radius_km" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."set_service_area_status_server"("target_area_id" "uuid", "target_reviewer_id" "uuid", "target_status" "text", "target_delivery_radius_km" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_ledger_loyalty_redemption"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.order_financial_ledger
  SET loyalty_redeemed_cents = CASE WHEN NEW.status = 'applied' THEN NEW.discount_cents ELSE 0 END,
      updated_at = now()
  WHERE order_id = NEW.order_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_ledger_loyalty_redemption"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_order_delay_penalty_to_ledger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.order_financial_ledger
  SET courier_penalty_cents = coalesce(NEW.courier_delay_penalty_cents, 0),
      updated_at = now()
  WHERE order_id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_order_delay_penalty_to_ledger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_order_financial_ledger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  partner_owner uuid;
  redeemed integer := 0;
BEGIN
  IF NEW.payment_status <> 'completed' AND NEW.payment_status <> 'refunded' THEN RETURN NEW; END IF;
  SELECT owner_id INTO partner_owner FROM public.restaurants WHERE id = NEW.restaurant_id;
  SELECT coalesce(discount_cents, 0) INTO redeemed
  FROM public.order_advantage_redemptions
  WHERE order_id = NEW.id AND status = 'applied';

  INSERT INTO public.order_financial_ledger (
    order_id, client_id, restaurant_id, partner_user_id, courier_id,
    client_collected_cents, advantage_funded_cents, partner_cents,
    delivery_fee_cents, service_fee_cents, courier_earnings_cents,
    courier_prime_cents, foodiz_revenue_cents, internal_fees_cents,
    loyalty_fund_cents, loyalty_redeemed_cents, referral_fund_cents,
    system_reserve_cents, payment_status, order_status, paid_at, delivered_at
  ) VALUES (
    NEW.id, NEW.client_id, NEW.restaurant_id, partner_owner, NEW.courier_id,
    NEW.final_client_total_cents, coalesce(NEW.advantage_discount_cents, 0), NEW.partner_total_cents,
    coalesce(NEW.delivery_fee_cents, 0), coalesce(NEW.service_fee_cents, 0), coalesce(NEW.courier_earnings_cents, 0),
    coalesce(NEW.courier_prime_fund_cents, 0), coalesce(NEW.foodiz_revenue_cents, 0), coalesce(NEW.internal_fees_cents, 0),
    coalesce(NEW.loyalty_fund_cents, 0), redeemed, coalesce(NEW.referral_fund_cents, 0),
    coalesce(NEW.system_reserve_cents, 0), NEW.payment_status, NEW.status,
    coalesce(NEW.updated_at, now()), NEW.delivered_at
  )
  ON CONFLICT (order_id) DO UPDATE SET
    courier_id = EXCLUDED.courier_id,
    loyalty_redeemed_cents = EXCLUDED.loyalty_redeemed_cents,
    payment_status = EXCLUDED.payment_status,
    order_status = EXCLUDED.order_status,
    delivered_at = EXCLUDED.delivered_at,
    updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_order_financial_ledger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trusted_server_operation"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT current_user IN ('postgres', 'service_role', 'supabase_admin');
$$;


ALTER FUNCTION "public"."trusted_server_operation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_courier_presence_server"("target_user_id" "uuid", "target_online" boolean, "target_latitude" numeric, "target_longitude" numeric, "target_accuracy_meters" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
    FROM public.courier_applications
    WHERE user_id = target_user_id
      AND status = 'validated'
      AND document_review_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Courier application is not approved';
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


ALTER FUNCTION "public"."update_courier_presence_server"("target_user_id" "uuid", "target_online" boolean, "target_latitude" numeric, "target_longitude" numeric, "target_accuracy_meters" numeric) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "reason" "text",
    "previous_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "new_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_broadcasts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "sent_by" "uuid",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "admin_id" "uuid",
    "target_roles" "text"[] DEFAULT '{}'::"text"[],
    "is_sent" boolean DEFAULT false,
    "recipients_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_broadcasts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_financial_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "partner_user_id" "uuid" NOT NULL,
    "courier_id" "uuid",
    "client_collected_cents" integer DEFAULT 0 NOT NULL,
    "advantage_funded_cents" integer DEFAULT 0 NOT NULL,
    "partner_cents" integer DEFAULT 0 NOT NULL,
    "delivery_fee_cents" integer DEFAULT 0 NOT NULL,
    "service_fee_cents" integer DEFAULT 0 NOT NULL,
    "courier_earnings_cents" integer DEFAULT 0 NOT NULL,
    "courier_prime_cents" integer DEFAULT 0 NOT NULL,
    "foodiz_revenue_cents" integer DEFAULT 0 NOT NULL,
    "internal_fees_cents" integer DEFAULT 0 NOT NULL,
    "loyalty_fund_cents" integer DEFAULT 0 NOT NULL,
    "loyalty_redeemed_cents" integer DEFAULT 0 NOT NULL,
    "referral_fund_cents" integer DEFAULT 0 NOT NULL,
    "system_reserve_cents" integer DEFAULT 0 NOT NULL,
    "payment_status" "text" NOT NULL,
    "order_status" "text" NOT NULL,
    "paid_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "courier_penalty_cents" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "order_financial_ledger_check" CHECK ((("client_collected_cents" + "advantage_funded_cents") = ((((((((("partner_cents" + "delivery_fee_cents") + "service_fee_cents") + "courier_earnings_cents") + "courier_prime_cents") + "foodiz_revenue_cents") + "internal_fees_cents") + "loyalty_fund_cents") + "referral_fund_cents") + "system_reserve_cents"))),
    CONSTRAINT "order_financial_ledger_courier_penalty_check" CHECK (("courier_penalty_cents" >= 0))
);


ALTER TABLE "public"."order_financial_ledger" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_financial_account_balances" WITH ("security_invoker"='true') AS
 SELECT COALESCE("sum"("client_collected_cents"), (0)::bigint) AS "client_collected_cents",
    COALESCE("sum"("advantage_funded_cents"), (0)::bigint) AS "advantage_funded_cents",
    COALESCE("sum"("partner_cents"), (0)::bigint) AS "partner_cents",
    COALESCE("sum"("delivery_fee_cents"), (0)::bigint) AS "delivery_fee_cents",
    COALESCE("sum"("service_fee_cents"), (0)::bigint) AS "service_fee_cents",
    COALESCE("sum"("courier_earnings_cents"), (0)::bigint) AS "courier_earnings_cents",
    COALESCE("sum"("courier_prime_cents"), (0)::bigint) AS "courier_prime_cents",
    COALESCE("sum"("foodiz_revenue_cents"), (0)::bigint) AS "foodiz_revenue_cents",
    COALESCE("sum"("internal_fees_cents"), (0)::bigint) AS "internal_fees_cents",
    COALESCE("sum"("loyalty_fund_cents"), (0)::bigint) AS "loyalty_funded_cents",
    COALESCE("sum"("loyalty_redeemed_cents"), (0)::bigint) AS "loyalty_consumed_cents",
    COALESCE("sum"(("loyalty_fund_cents" - "loyalty_redeemed_cents")), (0)::bigint) AS "loyalty_balance_cents",
    COALESCE("sum"("referral_fund_cents"), (0)::bigint) AS "referral_fund_cents",
    COALESCE("sum"("system_reserve_cents"), (0)::bigint) AS "system_reserve_cents",
    COALESCE("sum"("courier_penalty_cents"), (0)::bigint) AS "courier_penalty_cents"
   FROM "public"."order_financial_ledger"
  WHERE ("payment_status" = 'completed'::"text");


ALTER VIEW "public"."admin_financial_account_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_kpis_daily" (
    "date" "date" NOT NULL,
    "total_revenue_cents" integer DEFAULT 0,
    "foodiz_margin_cents" integer DEFAULT 0,
    "total_loyalty_provisioned_cents" integer DEFAULT 0,
    "total_referral_provisioned_cents" integer DEFAULT 0
);


ALTER TABLE "public"."admin_kpis_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courier_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "city" "text",
    "vehicle_type" "text",
    "documents_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "legal_name" "text",
    "siret" "text",
    "address" "text",
    "postal_code" "text",
    "document_review_status" "text" DEFAULT 'documents_required'::"text" NOT NULL,
    "document_review_comment" "text",
    "identity_name_confirmed" boolean DEFAULT false NOT NULL,
    "business_identity_confirmed" boolean DEFAULT false NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "dispatch_priority_score" integer DEFAULT 100 NOT NULL,
    "service_area_id" "uuid",
    CONSTRAINT "courier_applications_dispatch_priority_score_check" CHECK ((("dispatch_priority_score" >= 0) AND ("dispatch_priority_score" <= 100))),
    CONSTRAINT "courier_applications_document_review_status_check" CHECK (("document_review_status" = ANY (ARRAY['documents_required'::"text", 'pending_review'::"text", 'replacement_requested'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "courier_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'validated'::"text", 'missing_documents'::"text", 'rejected'::"text", 'suspended'::"text"]))),
    CONSTRAINT "courier_applications_vehicle_type_check" CHECK (("vehicle_type" = ANY (ARRAY['bike'::"text", 'scooter'::"text", 'car'::"text", 'motorcycle'::"text"])))
);


ALTER TABLE "public"."courier_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'client'::"text" NOT NULL,
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "address" "text",
    "postal_code" "text",
    "city" "text",
    "latitude" numeric,
    "longitude" numeric,
    "avatar_url" "text",
    "cgu_accepted" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "full_name" "text",
    "work_address" "text",
    "siret" "text",
    "is_approved" boolean DEFAULT false,
    "referral_code" "text",
    "referral_count" integer DEFAULT 0,
    "ref_code" "text",
    "status" "text" DEFAULT 'active'::"text",
    "courier_online" boolean DEFAULT false NOT NULL,
    "phone_normalized" "text" GENERATED ALWAYS AS ("public"."normalize_foodiz_phone"("phone")) STORED,
    "courier_latitude" numeric,
    "courier_longitude" numeric,
    "courier_location_accuracy_meters" numeric,
    "courier_location_updated_at" timestamp with time zone,
    CONSTRAINT "profiles_courier_location_check" CHECK (((("courier_latitude" IS NULL) AND ("courier_longitude" IS NULL) AND ("courier_location_accuracy_meters" IS NULL)) OR ((("courier_latitude" >= ('-90'::integer)::numeric) AND ("courier_latitude" <= (90)::numeric)) AND (("courier_longitude" >= ('-180'::integer)::numeric) AND ("courier_longitude" <= (180)::numeric)) AND (("courier_location_accuracy_meters" >= (0)::numeric) AND ("courier_location_accuracy_meters" <= (5000)::numeric))))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['client'::"text", 'partner'::"text", 'courier'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."restaurants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "phone" "text",
    "address" "text",
    "postal_code" "text",
    "city" "text",
    "latitude" numeric,
    "longitude" numeric,
    "cover_image" "text",
    "logo_image" "text",
    "is_active" boolean DEFAULT false,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "siret" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cuisine_type" "text",
    "service_area_id" "uuid",
    CONSTRAINT "restaurants_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'suspended'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."restaurants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settlement_statement_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "statement_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "allocation_type" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "settlement_statement_items_allocation_type_check" CHECK (("allocation_type" = ANY (ARRAY['partner'::"text", 'courier'::"text"]))),
    CONSTRAINT "settlement_statement_items_amount_cents_check" CHECK (("amount_cents" > 0))
);


ALTER TABLE "public"."settlement_statement_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settlement_statements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_number" "text" NOT NULL,
    "beneficiary_id" "uuid" NOT NULL,
    "beneficiary_type" "text" NOT NULL,
    "beneficiary_name" "text" NOT NULL,
    "legal_identifier" "text",
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "payment_method" "text" DEFAULT 'manual_bank_transfer'::"text" NOT NULL,
    "payment_reference" "text",
    "notes" "text",
    "generated_by" "uuid",
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    CONSTRAINT "settlement_statements_amount_cents_check" CHECK (("amount_cents" > 0)),
    CONSTRAINT "settlement_statements_beneficiary_type_check" CHECK (("beneficiary_type" = ANY (ARRAY['partner'::"text", 'courier'::"text"]))),
    CONSTRAINT "settlement_statements_check" CHECK (("period_end" >= "period_start")),
    CONSTRAINT "settlement_statements_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['manual_bank_transfer'::"text", 'stripe_connect'::"text"]))),
    CONSTRAINT "settlement_statements_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'paid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."settlement_statements" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_weekly_payables" WITH ("security_invoker"='true') AS
 SELECT "ledger"."partner_user_id" AS "beneficiary_id",
    'partner'::"text" AS "beneficiary_type",
    "restaurant"."name" AS "beneficiary_name",
    "restaurant"."siret" AS "legal_identifier",
    ("count"(*))::integer AS "order_count",
    "sum"("ledger"."partner_cents") AS "amount_cents",
    ("min"("ledger"."delivered_at"))::"date" AS "first_delivery_date",
    ("max"("ledger"."delivered_at"))::"date" AS "last_delivery_date"
   FROM ("public"."order_financial_ledger" "ledger"
     JOIN "public"."restaurants" "restaurant" ON (("restaurant"."id" = "ledger"."restaurant_id")))
  WHERE (("ledger"."order_status" = 'delivered'::"text") AND ("ledger"."payment_status" = 'completed'::"text") AND (NOT (EXISTS ( SELECT 1
           FROM ("public"."settlement_statement_items" "item"
             JOIN "public"."settlement_statements" "statement" ON (("statement"."id" = "item"."statement_id")))
          WHERE (("item"."order_id" = "ledger"."order_id") AND ("item"."allocation_type" = 'partner'::"text") AND ("statement"."status" <> 'cancelled'::"text"))))))
  GROUP BY "ledger"."partner_user_id", "restaurant"."name", "restaurant"."siret"
UNION ALL
 SELECT "ledger"."courier_id" AS "beneficiary_id",
    'courier'::"text" AS "beneficiary_type",
    COALESCE("profile"."full_name", "profile"."email", 'Livreur Foodiz'::"text") AS "beneficiary_name",
    "application"."siret" AS "legal_identifier",
    ("count"(*))::integer AS "order_count",
    "sum"(((("ledger"."delivery_fee_cents" + "ledger"."courier_earnings_cents") + "ledger"."courier_prime_cents") - "ledger"."courier_penalty_cents")) AS "amount_cents",
    ("min"("ledger"."delivered_at"))::"date" AS "first_delivery_date",
    ("max"("ledger"."delivered_at"))::"date" AS "last_delivery_date"
   FROM (("public"."order_financial_ledger" "ledger"
     JOIN "public"."profiles" "profile" ON (("profile"."id" = "ledger"."courier_id")))
     LEFT JOIN "public"."courier_applications" "application" ON (("application"."user_id" = "ledger"."courier_id")))
  WHERE (("ledger"."order_status" = 'delivered'::"text") AND ("ledger"."payment_status" = 'completed'::"text") AND ("ledger"."courier_id" IS NOT NULL) AND (NOT (EXISTS ( SELECT 1
           FROM ("public"."settlement_statement_items" "item"
             JOIN "public"."settlement_statements" "statement" ON (("statement"."id" = "item"."statement_id")))
          WHERE (("item"."order_id" = "ledger"."order_id") AND ("item"."allocation_type" = 'courier'::"text") AND ("statement"."status" <> 'cancelled'::"text"))))))
  GROUP BY "ledger"."courier_id", "profile"."full_name", "profile"."email", "application"."siret";


ALTER VIEW "public"."admin_weekly_payables" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advantage_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "points_cost" integer NOT NULL,
    "value_euros" numeric(10,2) NOT NULL,
    "valid_until" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "cycle_id" "uuid",
    "reward_type" "text" DEFAULT 'fixed_discount'::"text" NOT NULL,
    "face_value_cents" integer DEFAULT 0 NOT NULL,
    "minimum_order_cents" integer DEFAULT 0 NOT NULL,
    "discount_percent" integer DEFAULT 0 NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "generated_at" timestamp with time zone,
    "template_key" "text",
    "category" "text" DEFAULT 'all'::"text" NOT NULL,
    "eligible_products" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "eligible_establishments" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    CONSTRAINT "advantage_catalog_category_check" CHECK (("category" = ANY (ARRAY['all'::"text", 'restaurant'::"text", 'market'::"text"]))),
    CONSTRAINT "advantage_catalog_reward_type_check" CHECK (("reward_type" = ANY (ARRAY['fixed_discount'::"text", 'percent_discount'::"text", 'free_delivery'::"text", 'free_item'::"text"])))
);


ALTER TABLE "public"."advantage_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."advantage_generation_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "model_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "offer_count" integer DEFAULT 0 NOT NULL,
    "error_message" "text",
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "advantage_generation_runs_status_check" CHECK (("status" = ANY (ARRAY['success'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."advantage_generation_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_accounts" (
    "user_id" "uuid" NOT NULL,
    "iban" "text" NOT NULL,
    "bic" "text",
    "holder_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bank_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "label" "text" NOT NULL,
    "full_address" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "address_line" "text",
    "postal_code" "text",
    "city" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."client_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_delay_compensations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points" integer NOT NULL,
    "status" "text" DEFAULT 'credited'::"text" NOT NULL,
    "credited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reversed_at" timestamp with time zone,
    CONSTRAINT "client_delay_compensations_points_check" CHECK (("points" > 0)),
    CONSTRAINT "client_delay_compensations_status_check" CHECK (("status" = ANY (ARRAY['credited'::"text", 'reversed'::"text"])))
);


ALTER TABLE "public"."client_delay_compensations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_delivery_codes" (
    "order_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "client_delivery_codes_code_check" CHECK (("code" ~ '^[0-9]{6}$'::"text"))
);


ALTER TABLE "public"."client_delivery_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "restaurant_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."client_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_locked_advantages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "points_cost" integer NOT NULL,
    "locked_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'locked'::"text",
    "catalog_id" "uuid"
);


ALTER TABLE "public"."client_locked_advantages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_loyalty_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "points" integer NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."client_loyalty_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "last_four" "text" NOT NULL,
    "expiry_date" "text" NOT NULL,
    "brand" "text" DEFAULT 'Visa'::"text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."client_payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_wallets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points_balance" integer DEFAULT 0,
    "loyalty_tier" "text" DEFAULT 'bronze'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "client_wallets_loyalty_tier_check" CHECK (("loyalty_tier" = ANY (ARRAY['bronze'::"text", 'silver'::"text", 'gold'::"text", 'platinum'::"text"])))
);


ALTER TABLE "public"."client_wallets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courier_delay_penalties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "pickup_at" timestamp with time zone,
    "expected_arrival_at" timestamp with time zone,
    "delivered_at" timestamp with time zone NOT NULL,
    "delay_seconds" integer DEFAULT 0 NOT NULL,
    "penalty_tier" "text" NOT NULL,
    "penalty_cents" integer DEFAULT 0 NOT NULL,
    "reward_points" integer DEFAULT 0 NOT NULL,
    "dispatch_priority_delta" integer DEFAULT 0 NOT NULL,
    "eta_provider" "text",
    "rule_version" "text" DEFAULT '2026-06-21'::"text" NOT NULL,
    "status" "text" DEFAULT 'applied'::"text" NOT NULL,
    "decision_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "courier_delay_penalties_delay_seconds_check" CHECK (("delay_seconds" >= 0)),
    CONSTRAINT "courier_delay_penalties_penalty_cents_check" CHECK (("penalty_cents" >= 0)),
    CONSTRAINT "courier_delay_penalties_penalty_tier_check" CHECK (("penalty_tier" = ANY (ARRAY['on_time'::"text", 'late_10'::"text", 'late_15'::"text", 'late_20'::"text", 'not_applicable'::"text"]))),
    CONSTRAINT "courier_delay_penalties_reward_points_check" CHECK (("reward_points" >= 0)),
    CONSTRAINT "courier_delay_penalties_status_check" CHECK (("status" = ANY (ARRAY['applied'::"text", 'not_applicable'::"text", 'waived'::"text", 'reversed'::"text"])))
);


ALTER TABLE "public"."courier_delay_penalties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courier_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "prelaunch_profile_id" "uuid",
    "document_type" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "original_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "review_comment" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "courier_documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['identity_front'::"text", 'identity_back'::"text", 'activity_proof'::"text"]))),
    CONSTRAINT "courier_documents_mime_type_check" CHECK (("mime_type" = ANY (ARRAY['image/jpeg'::"text", 'image/png'::"text", 'application/pdf'::"text"]))),
    CONSTRAINT "courier_documents_size_bytes_check" CHECK ((("size_bytes" > 0) AND ("size_bytes" <= 8388608))),
    CONSTRAINT "courier_documents_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'replacement_requested'::"text"])))
);


ALTER TABLE "public"."courier_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courier_prime_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "points" integer NOT NULL,
    "amount_cents" integer NOT NULL,
    "type" "text" DEFAULT 'order_prime'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."courier_prime_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courier_prime_wallets" (
    "courier_id" "uuid" NOT NULL,
    "points_balance" integer DEFAULT 0,
    "euro_balance" numeric(10,2) DEFAULT 0.00,
    "total_earned_cents" integer DEFAULT 0,
    "total_withdrawn_cents" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."courier_prime_wallets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courier_prime_withdrawals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "points_used" integer NOT NULL,
    "amount_cents" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "approved_at" timestamp with time zone,
    "paid_at" timestamp with time zone
);


ALTER TABLE "public"."courier_prime_withdrawals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_code_verifications" (
    "order_id" "uuid" NOT NULL,
    "code_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "failed_attempts" integer DEFAULT 0 NOT NULL,
    "locked_until" timestamp with time zone,
    "last_failed_at" timestamp with time zone,
    CONSTRAINT "delivery_code_verifications_code_hash_check" CHECK (("code_hash" ~ '^[0-9a-f]{64}$'::"text")),
    CONSTRAINT "delivery_code_verifications_failed_attempts_check" CHECK (("failed_attempts" >= 0))
);


ALTER TABLE "public"."delivery_code_verifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "pickup_latitude" numeric,
    "pickup_longitude" numeric,
    "pickup_at" timestamp with time zone,
    "current_latitude" numeric,
    "current_longitude" numeric,
    "current_location_name" "text",
    "dropoff_latitude" numeric,
    "dropoff_longitude" numeric,
    "dropoff_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "estimated_arrival_at" timestamp with time zone,
    "actual_delivery_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "pickup_route_duration_seconds" integer,
    "pickup_route_distance_meters" integer,
    "pickup_expected_arrival_at" timestamp with time zone,
    "eta_provider" "text",
    "eta_verified_at" timestamp with time zone,
    "pickup_gps_accuracy_meters" numeric,
    CONSTRAINT "delivery_tracking_gps_accuracy_check" CHECK ((("pickup_gps_accuracy_meters" IS NULL) OR ("pickup_gps_accuracy_meters" >= (0)::numeric))),
    CONSTRAINT "delivery_tracking_route_distance_check" CHECK ((("pickup_route_distance_meters" IS NULL) OR ("pickup_route_distance_meters" >= 0))),
    CONSTRAINT "delivery_tracking_route_duration_check" CHECK ((("pickup_route_duration_seconds" IS NULL) OR ("pickup_route_duration_seconds" > 0))),
    CONSTRAINT "delivery_tracking_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'at_restaurant'::"text", 'picked_up'::"text", 'in_transit'::"text", 'at_customer'::"text", 'delivered'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."delivery_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver_dispatch_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "score" integer NOT NULL,
    "distance_to_restaurant_m" integer,
    "distance_to_client_m" integer,
    "calculated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."driver_dispatch_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."driver_earnings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "amount_cents" integer NOT NULL,
    "type" "text" DEFAULT 'delivery'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."driver_earnings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_document_email_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "status" "text" NOT NULL,
    "provider_message_id" "text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "financial_document_email_events_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."financial_document_email_events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."financial_document_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."financial_document_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."financial_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_number" "text" NOT NULL,
    "document_type" "text" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "recipient_email" "text",
    "order_id" "uuid",
    "settlement_id" "uuid",
    "payload_snapshot" "jsonb" NOT NULL,
    "status" "text" DEFAULT 'generated'::"text" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_emailed_at" timestamp with time zone,
    CONSTRAINT "financial_documents_check" CHECK (((("document_type" = 'client_payment_receipt'::"text") AND ("order_id" IS NOT NULL) AND ("settlement_id" IS NULL)) OR (("document_type" = 'settlement_statement'::"text") AND ("settlement_id" IS NOT NULL) AND ("order_id" IS NULL)))),
    CONSTRAINT "financial_documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['client_payment_receipt'::"text", 'settlement_statement'::"text"]))),
    CONSTRAINT "financial_documents_status_check" CHECK (("status" = ANY (ARRAY['generated'::"text", 'sent'::"text", 'email_failed'::"text"])))
);


ALTER TABLE "public"."financial_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."foodiz_campaigns" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "objective" "text",
    "audience" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "recipients_count" integer DEFAULT 0,
    "opened_count" integer DEFAULT 0,
    "clicked_count" integer DEFAULT 0,
    "orders_generated" integer DEFAULT 0,
    "estimated_revenue" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "foodiz_campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'sent'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."foodiz_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."foodiz_plus_plans" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "monthly_price_cents" integer NOT NULL,
    "yearly_price_cents" integer NOT NULL,
    "monthly_campaign_limit" integer NOT NULL,
    "weekly_campaign_limit" integer NOT NULL,
    "max_cities_per_campaign" integer DEFAULT 1 NOT NULL,
    "priority_level" integer DEFAULT 1 NOT NULL,
    "features" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "foodiz_plus_plans_max_cities_per_campaign_check" CHECK (("max_cities_per_campaign" > 0)),
    CONSTRAINT "foodiz_plus_plans_monthly_campaign_limit_check" CHECK (("monthly_campaign_limit" > 0)),
    CONSTRAINT "foodiz_plus_plans_monthly_price_cents_check" CHECK (("monthly_price_cents" > 0)),
    CONSTRAINT "foodiz_plus_plans_priority_level_check" CHECK ((("priority_level" >= 1) AND ("priority_level" <= 3))),
    CONSTRAINT "foodiz_plus_plans_weekly_campaign_limit_check" CHECK (("weekly_campaign_limit" > 0)),
    CONSTRAINT "foodiz_plus_plans_yearly_price_cents_check" CHECK (("yearly_price_cents" > 0))
);


ALTER TABLE "public"."foodiz_plus_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fraud_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "order_id" "uuid",
    "risk_score" integer DEFAULT 0,
    "status" "public"."fraud_status" DEFAULT 'approved'::"public"."fraud_status",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."fraud_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_balances" (
    "user_id" "uuid" NOT NULL,
    "balance_cents" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."loyalty_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "type" "public"."loyalty_type" NOT NULL,
    "amount_cents" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."loyalty_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_campaign_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_id" "uuid",
    "delivered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "opened_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "converted_order_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."marketing_campaign_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "discount_percent" integer DEFAULT 0,
    "discount_cents" integer DEFAULT 0,
    "min_order_cents" integer DEFAULT 0,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "product_id" "uuid",
    "target_city" "text",
    "target_audience" "text" DEFAULT 'all_customers'::"text" NOT NULL,
    "template_key" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "recipient_count" integer DEFAULT 0 NOT NULL,
    "opened_count" integer DEFAULT 0 NOT NULL,
    "clicked_count" integer DEFAULT 0 NOT NULL,
    "converted_orders_count" integer DEFAULT 0 NOT NULL,
    "subscription_id" "uuid",
    CONSTRAINT "marketing_campaigns_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'sending'::"text", 'sent'::"text", 'cancelled'::"text", 'failed'::"text"]))),
    CONSTRAINT "marketing_campaigns_target_audience_check" CHECK (("target_audience" = ANY (ARRAY['all_customers'::"text", 'new_customers'::"text", 'loyal_customers'::"text", 'inactive_customers'::"text"])))
);


ALTER TABLE "public"."marketing_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text",
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "related_order_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "link" "text",
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'order'::"text", 'payment'::"text", 'alert'::"text", 'marketing'::"text", 'support'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_advantage_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "locked_advantage_id" "uuid",
    "advantage_id" "uuid",
    "points_cost" integer NOT NULL,
    "discount_cents" integer NOT NULL,
    "status" "text" DEFAULT 'reserved'::"text" NOT NULL,
    "reserved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_at" timestamp with time zone,
    "released_at" timestamp with time zone,
    CONSTRAINT "order_advantage_redemptions_status_check" CHECK (("status" = ANY (ARRAY['reserved'::"text", 'applied'::"text", 'released'::"text"])))
);


ALTER TABLE "public"."order_advantage_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price_cents" integer NOT NULL,
    "total_price_cents" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "partner_unit_price_cents" integer NOT NULL,
    "partner_total_price_cents" integer NOT NULL,
    CONSTRAINT "order_items_partner_total_price_nonnegative" CHECK (("partner_total_price_cents" >= 0)),
    CONSTRAINT "order_items_partner_unit_price_nonnegative" CHECK (("partner_unit_price_cents" >= 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_loyalty_credits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points" integer NOT NULL,
    "status" "text" DEFAULT 'credited'::"text" NOT NULL,
    "credited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reversed_at" timestamp with time zone,
    CONSTRAINT "order_loyalty_credits_points_check" CHECK (("points" >= 0)),
    CONSTRAINT "order_loyalty_credits_status_check" CHECK (("status" = ANY (ARRAY['credited'::"text", 'reversed'::"text"])))
);


ALTER TABLE "public"."order_loyalty_credits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "stripe_payment_intent_id" "text",
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text",
    "status" "text" DEFAULT 'requires_payment_method'::"text" NOT NULL,
    "client_secret" "text",
    "receipt_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "stripe_checkout_session_id" "text",
    CONSTRAINT "order_payments_status_check" CHECK (("status" = ANY (ARRAY['checkout_created'::"text", 'requires_payment_method'::"text", 'requires_confirmation'::"text", 'requires_action'::"text", 'processing'::"text", 'requires_capture'::"text", 'canceled'::"text", 'succeeded'::"text", 'completed'::"text", 'failed'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."order_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "courier_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "final_client_total_cents" integer NOT NULL,
    "partner_total_cents" integer NOT NULL,
    "service_fee_cents" integer DEFAULT 0,
    "internal_fees_cents" integer DEFAULT 0,
    "delivery_fee_cents" integer DEFAULT 0,
    "courier_earnings_cents" integer DEFAULT 0,
    "courier_prime_fund_cents" integer DEFAULT 0,
    "loyalty_fund_cents" integer DEFAULT 0,
    "referral_fund_cents" integer DEFAULT 0,
    "foodiz_revenue_cents" integer DEFAULT 0,
    "system_reserve_cents" integer DEFAULT 0,
    "delivery_address" "text",
    "client_latitude" numeric,
    "client_longitude" numeric,
    "delivery_code" "text",
    "estimated_time_mins" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "delivered_at" timestamp with time zone,
    "payment_status" "text" DEFAULT 'pending'::"text",
    "stripe_payment_intent_id" "text",
    "points_redeemed_cents" integer DEFAULT 0,
    "advantage_discount_cents" integer DEFAULT 0 NOT NULL,
    "cancellation_reason" "text",
    "cancelled_at" timestamp with time zone,
    "refunded_at" timestamp with time zone,
    "courier_delay_penalty_cents" integer DEFAULT 0 NOT NULL,
    "client_delay_reward_points" integer DEFAULT 0 NOT NULL,
    "delivery_delay_seconds" integer,
    "delay_penalty_applied_at" timestamp with time zone,
    "delivery_route_distance_meters" integer,
    "delivery_route_duration_seconds" integer,
    "delivery_route_provider" "text",
    "delivery_route_is_fallback" boolean DEFAULT false NOT NULL,
    "delivery_route_calculated_at" timestamp with time zone,
    CONSTRAINT "orders_client_delay_reward_check" CHECK (("client_delay_reward_points" >= 0)),
    CONSTRAINT "orders_courier_delay_penalty_check" CHECK (("courier_delay_penalty_cents" >= 0)),
    CONSTRAINT "orders_delivery_delay_check" CHECK ((("delivery_delay_seconds" IS NULL) OR ("delivery_delay_seconds" >= 0))),
    CONSTRAINT "orders_delivery_route_distance_check" CHECK ((("delivery_route_distance_meters" IS NULL) OR ("delivery_route_distance_meters" >= 0))),
    CONSTRAINT "orders_delivery_route_duration_check" CHECK ((("delivery_route_duration_seconds" IS NULL) OR ("delivery_route_duration_seconds" > 0))),
    CONSTRAINT "orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'requires_payment_method'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'refunded'::"text"]))),
    CONSTRAINT "orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'preparing'::"text", 'ready'::"text", 'pickup'::"text", 'picked_up'::"text", 'delivering'::"text", 'in_transit'::"text", 'delivered'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."delivery_route_distance_meters" IS 'Server-calculated road distance used for the delivery fee. Haversine only when provider fallback is explicitly recorded.';



COMMENT ON COLUMN "public"."orders"."delivery_route_duration_seconds" IS 'Server-calculated driving duration. Null when only straight-line fallback was available.';



COMMENT ON COLUMN "public"."orders"."delivery_route_provider" IS 'Routing provider that produced the snapshot: openrouteservice, osrm or haversine.';



COMMENT ON COLUMN "public"."orders"."delivery_route_is_fallback" IS 'True when the primary provider failed and the temporary straight-line fallback was used.';



CREATE TABLE IF NOT EXISTS "public"."partner_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "city" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "business_name" "text",
    "siret" "text",
    "description" "text",
    "categories" "text"[] DEFAULT '{}'::"text"[],
    "phone" "text",
    "email" "text",
    "address" "text",
    "postal_code" "text",
    "latitude" numeric,
    "longitude" numeric,
    "website" "text",
    "documents_url" "text",
    "rejection_reason" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "service_area_id" "uuid",
    "establishment_type" "text" DEFAULT 'other'::"text" NOT NULL,
    "handles_animal_products" boolean DEFAULT false NOT NULL,
    "sells_alcohol" boolean DEFAULT false NOT NULL,
    "requires_hygiene_proof" boolean DEFAULT false NOT NULL,
    "compliance_status" "text" DEFAULT 'documents_required'::"text" NOT NULL,
    "compliance_comment" "text",
    "documents_submitted_at" timestamp with time zone,
    CONSTRAINT "partner_applications_compliance_status_check" CHECK (("compliance_status" = ANY (ARRAY['documents_required'::"text", 'pending_review'::"text", 'replacement_requested'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"]))),
    CONSTRAINT "partner_applications_establishment_type_check" CHECK (("establishment_type" = ANY (ARRAY['restaurant'::"text", 'fast_food'::"text", 'bakery'::"text", 'pastry'::"text", 'butcher'::"text", 'caterer'::"text", 'grocery'::"text", 'greengrocer'::"text", 'supermarket'::"text", 'local_shop'::"text", 'franchise'::"text", 'national_brand'::"text", 'other'::"text"]))),
    CONSTRAINT "partner_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'validated'::"text", 'missing_documents'::"text", 'rejected'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."partner_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "application_id" "uuid" NOT NULL,
    "document_type" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "original_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "valid_until" "date",
    "review_comment" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "partner_documents_document_type_check" CHECK (("document_type" = ANY (ARRAY['registration_proof'::"text", 'liability_insurance'::"text", 'hygiene_training'::"text", 'sanitary_declaration'::"text", 'alcohol_license'::"text", 'representative_mandate'::"text"]))),
    CONSTRAINT "partner_documents_mime_type_check" CHECK (("mime_type" = ANY (ARRAY['image/jpeg'::"text", 'image/png'::"text", 'application/pdf'::"text"]))),
    CONSTRAINT "partner_documents_size_bytes_check" CHECK ((("size_bytes" > 0) AND ("size_bytes" <= 10485760))),
    CONSTRAINT "partner_documents_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'replacement_requested'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."partner_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_menu_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."partner_menu_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text" NOT NULL,
    "plan_id" "text" NOT NULL,
    "billing_period" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "last_payment_date" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "campaigns_used_period" integer DEFAULT 0 NOT NULL,
    "stripe_customer_id" "text",
    "stripe_checkout_session_id" "text",
    CONSTRAINT "partner_subscriptions_billing_period_check" CHECK (("billing_period" = ANY (ARRAY['monthly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "partner_subscriptions_status_check" CHECK (("status" = ANY (ARRAY['incomplete'::"text", 'incomplete_expired'::"text", 'active'::"text", 'past_due'::"text", 'unpaid'::"text", 'canceled'::"text", 'trialing'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."partner_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "status" "text" DEFAULT 'paid'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "currency" "text" DEFAULT 'EUR'::"text",
    "stripe_payout_id" "text",
    "failure_reason" "text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "paid_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "settlement_id" "uuid",
    "payment_reference" "text",
    "beneficiary_type" "text",
    "period_start" "date",
    "period_end" "date"
);


ALTER TABLE "public"."payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prelaunch_driver_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prelaunch_profile_id" "uuid" NOT NULL,
    "vehicle_type" "text" NOT NULL,
    "availability" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "siret" "text",
    "legal_name" "text",
    "address" "text",
    "postal_code" "text",
    "document_review_status" "text" DEFAULT 'documents_required'::"text" NOT NULL,
    "document_review_comment" "text",
    "document_upload_token_hash" "text",
    "document_upload_token_expires_at" timestamp with time zone,
    "documents_submitted_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "prelaunch_driver_details_availability_check" CHECK (("availability" = ANY (ARRAY['journee'::"text", 'soiree'::"text", 'nuit'::"text", 'week_end'::"text"]))),
    CONSTRAINT "prelaunch_driver_details_document_review_status_check" CHECK (("document_review_status" = ANY (ARRAY['documents_required'::"text", 'pending_review'::"text", 'replacement_requested'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "prelaunch_driver_details_postal_code_check" CHECK ((("postal_code" IS NULL) OR ("postal_code" ~ '^[0-9]{5}$'::"text"))),
    CONSTRAINT "prelaunch_driver_details_siret_format" CHECK ((("siret" IS NULL) OR ("siret" ~ '^[0-9]{14}$'::"text"))),
    CONSTRAINT "prelaunch_driver_details_vehicle_type_check" CHECK (("vehicle_type" = ANY (ARRAY['velo'::"text", 'scooter'::"text", 'voiture'::"text", 'autre'::"text"])))
);


ALTER TABLE "public"."prelaunch_driver_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prelaunch_partner_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "prelaunch_profile_id" "uuid" NOT NULL,
    "establishment_name" "text" NOT NULL,
    "establishment_type" "text" NOT NULL,
    "siret" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address" "text",
    "postal_code" "text",
    "handles_animal_products" boolean DEFAULT false NOT NULL,
    "sells_alcohol" boolean DEFAULT false NOT NULL,
    "requires_hygiene_proof" boolean DEFAULT false NOT NULL,
    "document_review_status" "text" DEFAULT 'documents_required'::"text" NOT NULL,
    "document_review_comment" "text",
    "documents_submitted_at" timestamp with time zone,
    "document_upload_token_hash" "text",
    "document_upload_token_expires_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "prelaunch_partner_details_document_review_status_check" CHECK (("document_review_status" = ANY (ARRAY['documents_required'::"text", 'pending_review'::"text", 'replacement_requested'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"]))),
    CONSTRAINT "prelaunch_partner_details_establishment_type_check" CHECK (("establishment_type" = ANY (ARRAY['restaurant'::"text", 'fast_food'::"text", 'bakery'::"text", 'pastry'::"text", 'butcher'::"text", 'caterer'::"text", 'grocery'::"text", 'greengrocer'::"text", 'supermarket'::"text", 'local_shop'::"text", 'franchise'::"text", 'national_brand'::"text", 'other'::"text"]))),
    CONSTRAINT "prelaunch_partner_details_siret_format_check" CHECK ((("siret" IS NULL) OR ("siret" ~ '^[0-9]{14}$'::"text")))
);


ALTER TABLE "public"."prelaunch_partner_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prelaunch_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "city" "text" NOT NULL,
    "status" "text" DEFAULT 'prelaunch_pending'::"text" NOT NULL,
    "marketing_consent" boolean DEFAULT false NOT NULL,
    "consent_at" timestamp with time zone,
    "launch_token" "text",
    "launch_token_expires_at" timestamp with time zone,
    "launch_notified_at" timestamp with time zone,
    "activated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone_normalized" "text" GENERATED ALWAYS AS ("public"."normalize_foodiz_phone"("phone")) STORED,
    "access_enabled" boolean DEFAULT false NOT NULL,
    "access_enabled_at" timestamp with time zone,
    "access_enabled_by" "uuid",
    CONSTRAINT "prelaunch_profiles_pilot_access_role_check" CHECK ((("access_enabled" = false) OR ("role" = ANY (ARRAY['livreur'::"text", 'partenaire'::"text"])))),
    CONSTRAINT "prelaunch_profiles_role_check" CHECK (("role" = ANY (ARRAY['client'::"text", 'livreur'::"text", 'partenaire'::"text"]))),
    CONSTRAINT "prelaunch_profiles_status_check" CHECK (("status" = ANY (ARRAY['prelaunch_pending'::"text", 'launch_email_sent'::"text", 'activated'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."prelaunch_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."prelaunch_registration_attempts" (
    "id" bigint NOT NULL,
    "fingerprint_hash" "text" NOT NULL,
    "email_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."prelaunch_registration_attempts" OWNER TO "postgres";


ALTER TABLE "public"."prelaunch_registration_attempts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."prelaunch_registration_attempts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "restaurant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "partner_price_cents" integer NOT NULL,
    "image_url" "text",
    "category" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."referral_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "parrain_id" "uuid",
    "filleul_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "code" "text",
    "reward_cents" integer DEFAULT 0,
    "completed_at" timestamp with time zone,
    "reward_points" integer DEFAULT 500 NOT NULL
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "restaurant_rating" integer,
    "courier_rating" integer,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reviews_courier_rating_check" CHECK ((("courier_rating" >= 1) AND ("courier_rating" <= 5))),
    CONSTRAINT "reviews_restaurant_rating_check" CHECK ((("restaurant_rating" >= 1) AND ("restaurant_rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "city" "text" NOT NULL,
    "city_normalized" "text" NOT NULL,
    "postal_codes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "department_code" "text",
    "region_name" "text",
    "center_latitude" numeric,
    "center_longitude" numeric,
    "delivery_radius_km" numeric DEFAULT 10 NOT NULL,
    "status" "text" DEFAULT 'recruiting'::"text" NOT NULL,
    "opened_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_areas_delivery_radius_km_check" CHECK ((("delivery_radius_km" > (0)::numeric) AND ("delivery_radius_km" <= (100)::numeric))),
    CONSTRAINT "service_areas_status_check" CHECK (("status" = ANY (ARRAY['recruiting'::"text", 'preparing'::"text", 'pilot'::"text", 'open'::"text", 'paused'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."service_areas" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."settlement_document_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."settlement_document_number_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_ticket_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "event_type" "text" NOT NULL,
    "message" "text",
    "previous_status" "text",
    "new_status" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "support_ticket_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['created'::"text", 'assigned'::"text", 'replied'::"text", 'resolved'::"text", 'closed'::"text", 'reopened'::"text", 'note'::"text"])))
);


ALTER TABLE "public"."support_ticket_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_email" "text",
    "admin_response" "text",
    "category" "text" DEFAULT 'other'::"text" NOT NULL,
    "subcategory" "text",
    "order_id" "uuid",
    "user_role" "text",
    "diagnostic" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "attempted_actions" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "resolution_summary" "text",
    "auto_resolved" boolean DEFAULT false NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    CONSTRAINT "support_tickets_category_check" CHECK (("category" = ANY (ARRAY['order'::"text", 'payment'::"text", 'delivery'::"text", 'advantage'::"text", 'account'::"text", 'partner'::"text", 'courier'::"text", 'other'::"text"]))),
    CONSTRAINT "support_tickets_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "support_tickets_source_check" CHECK (("source" = ANY (ARRAY['guided'::"text", 'manual'::"text", 'system'::"text"]))),
    CONSTRAINT "support_tickets_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."test_foodiz_permission" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."test_foodiz_permission" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_broadcasts"
    ADD CONSTRAINT "admin_broadcasts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_kpis_daily"
    ADD CONSTRAINT "admin_kpis_daily_pkey" PRIMARY KEY ("date");



ALTER TABLE ONLY "public"."advantage_catalog"
    ADD CONSTRAINT "advantage_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."advantage_generation_runs"
    ADD CONSTRAINT "advantage_generation_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."client_addresses"
    ADD CONSTRAINT "client_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_delay_compensations"
    ADD CONSTRAINT "client_delay_compensations_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."client_delay_compensations"
    ADD CONSTRAINT "client_delay_compensations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_delivery_codes"
    ADD CONSTRAINT "client_delivery_codes_pkey" PRIMARY KEY ("order_id");



ALTER TABLE ONLY "public"."client_favorites"
    ADD CONSTRAINT "client_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_favorites"
    ADD CONSTRAINT "client_favorites_user_id_restaurant_id_key" UNIQUE ("user_id", "restaurant_id");



ALTER TABLE ONLY "public"."client_locked_advantages"
    ADD CONSTRAINT "client_locked_advantages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_loyalty_transactions"
    ADD CONSTRAINT "client_loyalty_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_payment_methods"
    ADD CONSTRAINT "client_payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_rewards"
    ADD CONSTRAINT "client_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_rewards"
    ADD CONSTRAINT "client_rewards_reward_code_key" UNIQUE ("reward_code");



ALTER TABLE ONLY "public"."client_wallets"
    ADD CONSTRAINT "client_wallets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_wallets"
    ADD CONSTRAINT "client_wallets_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."courier_applications"
    ADD CONSTRAINT "courier_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courier_applications"
    ADD CONSTRAINT "courier_applications_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."courier_delay_penalties"
    ADD CONSTRAINT "courier_delay_penalties_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."courier_delay_penalties"
    ADD CONSTRAINT "courier_delay_penalties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courier_documents"
    ADD CONSTRAINT "courier_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courier_documents"
    ADD CONSTRAINT "courier_documents_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."courier_documents"
    ADD CONSTRAINT "courier_documents_user_id_document_type_key" UNIQUE ("user_id", "document_type");



ALTER TABLE ONLY "public"."courier_prime_transactions"
    ADD CONSTRAINT "courier_prime_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courier_prime_wallets"
    ADD CONSTRAINT "courier_prime_wallets_pkey" PRIMARY KEY ("courier_id");



ALTER TABLE ONLY "public"."courier_prime_withdrawals"
    ADD CONSTRAINT "courier_prime_withdrawals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_code_verifications"
    ADD CONSTRAINT "delivery_code_verifications_pkey" PRIMARY KEY ("order_id");



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_dispatch_scores"
    ADD CONSTRAINT "driver_dispatch_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."driver_earnings"
    ADD CONSTRAINT "driver_earnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_document_email_events"
    ADD CONSTRAINT "financial_document_email_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."financial_documents"
    ADD CONSTRAINT "financial_documents_document_number_key" UNIQUE ("document_number");



ALTER TABLE ONLY "public"."financial_documents"
    ADD CONSTRAINT "financial_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."foodiz_campaigns"
    ADD CONSTRAINT "foodiz_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."foodiz_plus_plans"
    ADD CONSTRAINT "foodiz_plus_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fraud_logs"
    ADD CONSTRAINT "fraud_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_balances"
    ADD CONSTRAINT "loyalty_balances_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_campaign_deliveries"
    ADD CONSTRAINT "marketing_campaign_deliveries_campaign_id_user_id_key" UNIQUE ("campaign_id", "user_id");



ALTER TABLE ONLY "public"."marketing_campaign_deliveries"
    ADD CONSTRAINT "marketing_campaign_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_advantage_redemptions"
    ADD CONSTRAINT "order_advantage_redemptions_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."order_advantage_redemptions"
    ADD CONSTRAINT "order_advantage_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_financial_ledger"
    ADD CONSTRAINT "order_financial_ledger_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."order_financial_ledger"
    ADD CONSTRAINT "order_financial_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_loyalty_credits"
    ADD CONSTRAINT "order_loyalty_credits_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."order_loyalty_credits"
    ADD CONSTRAINT "order_loyalty_credits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "order_payments_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "order_payments_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_delivery_code_key" UNIQUE ("delivery_code");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_applications"
    ADD CONSTRAINT "partner_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_documents"
    ADD CONSTRAINT "partner_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_documents"
    ADD CONSTRAINT "partner_documents_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."partner_documents"
    ADD CONSTRAINT "partner_documents_user_id_document_type_key" UNIQUE ("user_id", "document_type");



ALTER TABLE ONLY "public"."partner_menu_categories"
    ADD CONSTRAINT "partner_menu_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_menu_categories"
    ADD CONSTRAINT "partner_menu_categories_restaurant_id_name_key" UNIQUE ("restaurant_id", "name");



ALTER TABLE ONLY "public"."partner_subscriptions"
    ADD CONSTRAINT "partner_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_subscriptions"
    ADD CONSTRAINT "partner_subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."prelaunch_profiles"
    ADD CONSTRAINT "prelaunch_client_courier_phone_valid" CHECK ((("role" <> ALL (ARRAY['client'::"text", 'livreur'::"text"])) OR ("phone_normalized" IS NOT NULL))) NOT VALID;



ALTER TABLE ONLY "public"."prelaunch_driver_details"
    ADD CONSTRAINT "prelaunch_driver_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prelaunch_driver_details"
    ADD CONSTRAINT "prelaunch_driver_details_prelaunch_profile_id_key" UNIQUE ("prelaunch_profile_id");



ALTER TABLE ONLY "public"."prelaunch_partner_details"
    ADD CONSTRAINT "prelaunch_partner_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prelaunch_partner_details"
    ADD CONSTRAINT "prelaunch_partner_details_prelaunch_profile_id_key" UNIQUE ("prelaunch_profile_id");



ALTER TABLE ONLY "public"."prelaunch_profiles"
    ADD CONSTRAINT "prelaunch_profiles_launch_token_key" UNIQUE ("launch_token");



ALTER TABLE ONLY "public"."prelaunch_profiles"
    ADD CONSTRAINT "prelaunch_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prelaunch_profiles"
    ADD CONSTRAINT "prelaunch_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."prelaunch_registration_attempts"
    ADD CONSTRAINT "prelaunch_registration_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."profiles"
    ADD CONSTRAINT "profiles_client_courier_phone_valid" CHECK ((("role" <> ALL (ARRAY['client'::"text", 'courier'::"text"])) OR ("phone_normalized" IS NOT NULL))) NOT VALID;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_siret_key" UNIQUE ("siret");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_areas"
    ADD CONSTRAINT "service_areas_city_normalized_department_code_key" UNIQUE ("city_normalized", "department_code");



ALTER TABLE ONLY "public"."service_areas"
    ADD CONSTRAINT "service_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settlement_statement_items"
    ADD CONSTRAINT "settlement_statement_items_order_id_allocation_type_key" UNIQUE ("order_id", "allocation_type");



ALTER TABLE ONLY "public"."settlement_statement_items"
    ADD CONSTRAINT "settlement_statement_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settlement_statements"
    ADD CONSTRAINT "settlement_statements_document_number_key" UNIQUE ("document_number");



ALTER TABLE ONLY "public"."settlement_statements"
    ADD CONSTRAINT "settlement_statements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_ticket_events"
    ADD CONSTRAINT "support_ticket_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."test_foodiz_permission"
    ADD CONSTRAINT "test_foodiz_permission_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "client_delivery_codes_code_unique" ON "public"."client_delivery_codes" USING "btree" ("code");



CREATE INDEX "courier_documents_review_idx" ON "public"."courier_documents" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_admin_audit_admin" ON "public"."admin_audit_log" USING "btree" ("admin_id", "created_at" DESC);



CREATE INDEX "idx_admin_audit_entity" ON "public"."admin_audit_log" USING "btree" ("entity_type", "entity_id", "created_at" DESC);



CREATE INDEX "idx_advantage_generation_runs_date" ON "public"."advantage_generation_runs" USING "btree" ("generated_at" DESC);



CREATE INDEX "idx_broadcasts_admin" ON "public"."admin_broadcasts" USING "btree" ("admin_id");



CREATE INDEX "idx_broadcasts_sent" ON "public"."admin_broadcasts" USING "btree" ("is_sent");



CREATE INDEX "idx_campaign_deliveries_user" ON "public"."marketing_campaign_deliveries" USING "btree" ("user_id", "delivered_at" DESC);



CREATE INDEX "idx_campaigns_active" ON "public"."marketing_campaigns" USING "btree" ("is_active");



CREATE INDEX "idx_campaigns_restaurant" ON "public"."marketing_campaigns" USING "btree" ("restaurant_id");



CREATE UNIQUE INDEX "idx_client_addresses_one_default" ON "public"."client_addresses" USING "btree" ("user_id") WHERE ("is_default" = true);



CREATE INDEX "idx_client_addresses_user" ON "public"."client_addresses" USING "btree" ("user_id");



CREATE INDEX "idx_client_favorites_user" ON "public"."client_favorites" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_client_locked_advantages_user" ON "public"."client_locked_advantages" USING "btree" ("user_id");



CREATE INDEX "idx_client_payment_methods_user" ON "public"."client_payment_methods" USING "btree" ("user_id");



CREATE INDEX "idx_client_rewards_user_status" ON "public"."client_rewards" USING "btree" ("user_id", "status");



CREATE INDEX "idx_client_wallets_user" ON "public"."client_wallets" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_courier_applications_siret" ON "public"."courier_applications" USING "btree" ("siret") WHERE ("siret" IS NOT NULL);



CREATE INDEX "idx_courier_apps_user" ON "public"."courier_applications" USING "btree" ("user_id");



CREATE INDEX "idx_delivery_tracking_courier" ON "public"."delivery_tracking" USING "btree" ("courier_id");



CREATE INDEX "idx_delivery_tracking_order" ON "public"."delivery_tracking" USING "btree" ("order_id");



CREATE INDEX "idx_delivery_tracking_status" ON "public"."delivery_tracking" USING "btree" ("status");



CREATE INDEX "idx_financial_document_email_events" ON "public"."financial_document_email_events" USING "btree" ("document_id", "created_at" DESC);



CREATE UNIQUE INDEX "idx_financial_document_order_receipt" ON "public"."financial_documents" USING "btree" ("order_id") WHERE ("document_type" = 'client_payment_receipt'::"text");



CREATE UNIQUE INDEX "idx_financial_document_settlement" ON "public"."financial_documents" USING "btree" ("settlement_id") WHERE ("document_type" = 'settlement_statement'::"text");



CREATE INDEX "idx_financial_documents_recipient" ON "public"."financial_documents" USING "btree" ("recipient_id", "generated_at" DESC);



CREATE INDEX "idx_financial_ledger_courier" ON "public"."order_financial_ledger" USING "btree" ("courier_id", "delivered_at" DESC);



CREATE INDEX "idx_financial_ledger_delivered" ON "public"."order_financial_ledger" USING "btree" ("delivered_at" DESC);



CREATE INDEX "idx_financial_ledger_partner" ON "public"."order_financial_ledger" USING "btree" ("partner_user_id", "delivered_at" DESC);



CREATE INDEX "idx_marketing_campaigns_quota" ON "public"."marketing_campaigns" USING "btree" ("restaurant_id", "status", "sent_at" DESC);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_order_advantage_redemptions_user_status" ON "public"."order_advantage_redemptions" USING "btree" ("user_id", "status");



CREATE INDEX "idx_order_items_order" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_payments_order" ON "public"."order_payments" USING "btree" ("order_id");



CREATE INDEX "idx_order_payments_stripe_id" ON "public"."order_payments" USING "btree" ("stripe_payment_intent_id");



CREATE INDEX "idx_orders_available_courier" ON "public"."orders" USING "btree" ("status", "courier_id") WHERE (("status" = 'ready'::"text") AND ("courier_id" IS NULL));



CREATE INDEX "idx_orders_client" ON "public"."orders" USING "btree" ("client_id");



CREATE INDEX "idx_orders_courier" ON "public"."orders" USING "btree" ("courier_id");



CREATE INDEX "idx_orders_created" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_delivery_route_fallback" ON "public"."orders" USING "btree" ("delivery_route_is_fallback", "created_at" DESC) WHERE ("delivery_route_is_fallback" = true);



CREATE INDEX "idx_orders_restaurant" ON "public"."orders" USING "btree" ("restaurant_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_partner_applications_siret_phase1" ON "public"."partner_applications" USING "btree" ("siret") WHERE ("siret" IS NOT NULL);



CREATE INDEX "idx_partner_apps_status" ON "public"."partner_applications" USING "btree" ("status");



CREATE INDEX "idx_partner_apps_user" ON "public"."partner_applications" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_partner_subscriptions_checkout_session" ON "public"."partner_subscriptions" USING "btree" ("stripe_checkout_session_id") WHERE ("stripe_checkout_session_id" IS NOT NULL);



CREATE INDEX "idx_partner_subscriptions_customer" ON "public"."partner_subscriptions" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE INDEX "idx_payouts_status" ON "public"."payouts" USING "btree" ("status");



CREATE INDEX "idx_payouts_stripe_id" ON "public"."payouts" USING "btree" ("stripe_payout_id");



CREATE INDEX "idx_payouts_user" ON "public"."payouts" USING "btree" ("user_id");



CREATE INDEX "idx_products_restaurant" ON "public"."products" USING "btree" ("restaurant_id");



CREATE INDEX "idx_profiles_ref_code" ON "public"."profiles" USING "btree" ("ref_code");



CREATE UNIQUE INDEX "idx_profiles_ref_code_safe" ON "public"."profiles" USING "btree" ("ref_code") WHERE ("ref_code" IS NOT NULL);



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_referrals_code" ON "public"."referrals" USING "btree" ("code");



CREATE INDEX "idx_referrals_filleul" ON "public"."referrals" USING "btree" ("filleul_id");



CREATE UNIQUE INDEX "idx_referrals_filleul_unique" ON "public"."referrals" USING "btree" ("filleul_id");



CREATE INDEX "idx_referrals_parrain" ON "public"."referrals" USING "btree" ("parrain_id");



CREATE INDEX "idx_restaurants_owner" ON "public"."restaurants" USING "btree" ("owner_id");



CREATE INDEX "idx_restaurants_status" ON "public"."restaurants" USING "btree" ("status");



CREATE INDEX "idx_reviews_client" ON "public"."reviews" USING "btree" ("client_id");



CREATE INDEX "idx_reviews_order" ON "public"."reviews" USING "btree" ("order_id");



CREATE INDEX "idx_subscriptions_restaurant" ON "public"."partner_subscriptions" USING "btree" ("restaurant_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."partner_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_stripe_id" ON "public"."partner_subscriptions" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_support_ticket_events_ticket" ON "public"."support_ticket_events" USING "btree" ("ticket_id", "created_at" DESC);



CREATE INDEX "idx_support_tickets_order" ON "public"."support_tickets" USING "btree" ("order_id") WHERE ("order_id" IS NOT NULL);



CREATE INDEX "idx_support_tickets_queue" ON "public"."support_tickets" USING "btree" ("status", "priority", "category", "created_at" DESC);



CREATE INDEX "idx_support_tickets_user" ON "public"."support_tickets" USING "btree" ("user_id");



CREATE INDEX "partner_documents_application_status_idx" ON "public"."partner_documents" USING "btree" ("application_id", "status");



CREATE UNIQUE INDEX "prelaunch_client_courier_phone_unique" ON "public"."prelaunch_profiles" USING "btree" ("phone_normalized") WHERE (("role" = ANY (ARRAY['client'::"text", 'livreur'::"text"])) AND ("phone_normalized" IS NOT NULL));



CREATE UNIQUE INDEX "prelaunch_driver_details_siret_unique" ON "public"."prelaunch_driver_details" USING "btree" ("siret") WHERE ("siret" IS NOT NULL);



CREATE UNIQUE INDEX "prelaunch_driver_document_upload_token_unique" ON "public"."prelaunch_driver_details" USING "btree" ("document_upload_token_hash") WHERE ("document_upload_token_hash" IS NOT NULL);



CREATE UNIQUE INDEX "prelaunch_partner_details_siret_unique" ON "public"."prelaunch_partner_details" USING "btree" ("siret") WHERE ("siret" IS NOT NULL);



CREATE UNIQUE INDEX "prelaunch_partner_document_token_unique" ON "public"."prelaunch_partner_details" USING "btree" ("document_upload_token_hash") WHERE ("document_upload_token_hash" IS NOT NULL);



CREATE UNIQUE INDEX "prelaunch_profiles_email_unique_ci" ON "public"."prelaunch_profiles" USING "btree" ("lower"("email"));



CREATE INDEX "prelaunch_profiles_status_idx" ON "public"."prelaunch_profiles" USING "btree" ("status", "created_at");



CREATE INDEX "prelaunch_registration_attempts_lookup_idx" ON "public"."prelaunch_registration_attempts" USING "btree" ("fingerprint_hash", "created_at" DESC);



CREATE UNIQUE INDEX "profiles_client_courier_phone_unique" ON "public"."profiles" USING "btree" ("phone_normalized") WHERE (("role" = ANY (ARRAY['client'::"text", 'courier'::"text"])) AND ("phone_normalized" IS NOT NULL));



CREATE INDEX "service_areas_status_city_idx" ON "public"."service_areas" USING "btree" ("status", "city_normalized");



CREATE OR REPLACE TRIGGER "create_client_payment_receipt" AFTER UPDATE OF "payment_status" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."create_client_payment_receipt"();



CREATE OR REPLACE TRIGGER "create_paid_settlement_document" AFTER UPDATE OF "status" ON "public"."settlement_statements" FOR EACH ROW EXECUTE FUNCTION "public"."create_paid_settlement_document"();



CREATE OR REPLACE TRIGGER "enforce_order_worker_transition" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_order_worker_transition"();



CREATE OR REPLACE TRIGGER "protect_courier_application_review_fields" BEFORE UPDATE ON "public"."courier_applications" FOR EACH ROW EXECUTE FUNCTION "public"."protect_courier_application_review_fields"();



CREATE OR REPLACE TRIGGER "protect_partner_application_review_fields" BEFORE UPDATE ON "public"."partner_applications" FOR EACH ROW EXECUTE FUNCTION "public"."protect_partner_application_review_fields"();



CREATE OR REPLACE TRIGGER "protect_profile_privileged_fields" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_profile_privileged_fields"();



CREATE OR REPLACE TRIGGER "protect_restaurant_privileged_fields" BEFORE UPDATE ON "public"."restaurants" FOR EACH ROW EXECUTE FUNCTION "public"."protect_restaurant_privileged_fields"();



CREATE OR REPLACE TRIGGER "protect_restaurant_validation_fields" BEFORE UPDATE ON "public"."restaurants" FOR EACH ROW EXECUTE FUNCTION "public"."protect_restaurant_validation_fields"();



CREATE OR REPLACE TRIGGER "require_courier_legal_identity" BEFORE UPDATE OF "status" ON "public"."courier_applications" FOR EACH ROW EXECUTE FUNCTION "public"."require_courier_legal_identity"();



CREATE OR REPLACE TRIGGER "set_bank_accounts_updated_at" BEFORE UPDATE ON "public"."bank_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_bank_accounts_updated_at"();



CREATE OR REPLACE TRIGGER "set_courier_delay_penalties_updated_at" BEFORE UPDATE ON "public"."courier_delay_penalties" FOR EACH ROW EXECUTE FUNCTION "public"."set_prelaunch_updated_at"();



CREATE OR REPLACE TRIGGER "set_courier_documents_updated_at" BEFORE UPDATE ON "public"."courier_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_prelaunch_updated_at"();



CREATE OR REPLACE TRIGGER "set_partner_documents_updated_at" BEFORE UPDATE ON "public"."partner_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_prelaunch_updated_at"();



CREATE OR REPLACE TRIGGER "set_prelaunch_driver_details_updated_at" BEFORE UPDATE ON "public"."prelaunch_driver_details" FOR EACH ROW EXECUTE FUNCTION "public"."set_prelaunch_updated_at"();



CREATE OR REPLACE TRIGGER "set_prelaunch_partner_details_updated_at" BEFORE UPDATE ON "public"."prelaunch_partner_details" FOR EACH ROW EXECUTE FUNCTION "public"."set_prelaunch_updated_at"();



CREATE OR REPLACE TRIGGER "set_prelaunch_profiles_updated_at" BEFORE UPDATE ON "public"."prelaunch_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_prelaunch_updated_at"();



CREATE OR REPLACE TRIGGER "set_service_areas_updated_at" BEFORE UPDATE ON "public"."service_areas" FOR EACH ROW EXECUTE FUNCTION "public"."set_prelaunch_updated_at"();



CREATE OR REPLACE TRIGGER "sync_ledger_loyalty_redemption" AFTER INSERT OR UPDATE OF "status", "discount_cents" ON "public"."order_advantage_redemptions" FOR EACH ROW EXECUTE FUNCTION "public"."sync_ledger_loyalty_redemption"();



CREATE OR REPLACE TRIGGER "sync_order_delay_penalty_to_ledger" AFTER UPDATE OF "courier_delay_penalty_cents" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."sync_order_delay_penalty_to_ledger"();



CREATE OR REPLACE TRIGGER "sync_order_financial_ledger" AFTER INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."sync_order_financial_ledger"();



ALTER TABLE ONLY "public"."admin_audit_log"
    ADD CONSTRAINT "admin_audit_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_broadcasts"
    ADD CONSTRAINT "admin_broadcasts_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."admin_broadcasts"
    ADD CONSTRAINT "admin_broadcasts_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."bank_accounts"
    ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."client_addresses"
    ADD CONSTRAINT "client_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_delay_compensations"
    ADD CONSTRAINT "client_delay_compensations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_delay_compensations"
    ADD CONSTRAINT "client_delay_compensations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_delivery_codes"
    ADD CONSTRAINT "client_delivery_codes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_delivery_codes"
    ADD CONSTRAINT "client_delivery_codes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_favorites"
    ADD CONSTRAINT "client_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_locked_advantages"
    ADD CONSTRAINT "client_locked_advantages_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "public"."advantage_catalog"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_locked_advantages"
    ADD CONSTRAINT "client_locked_advantages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_loyalty_transactions"
    ADD CONSTRAINT "client_loyalty_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."client_payment_methods"
    ADD CONSTRAINT "client_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_rewards"
    ADD CONSTRAINT "client_rewards_advantage_id_fkey" FOREIGN KEY ("advantage_id") REFERENCES "public"."advantage_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_rewards"
    ADD CONSTRAINT "client_rewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_wallets"
    ADD CONSTRAINT "client_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courier_applications"
    ADD CONSTRAINT "courier_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."courier_applications"
    ADD CONSTRAINT "courier_applications_service_area_id_fkey" FOREIGN KEY ("service_area_id") REFERENCES "public"."service_areas"("id");



ALTER TABLE ONLY "public"."courier_applications"
    ADD CONSTRAINT "courier_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courier_delay_penalties"
    ADD CONSTRAINT "courier_delay_penalties_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."courier_delay_penalties"
    ADD CONSTRAINT "courier_delay_penalties_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."courier_delay_penalties"
    ADD CONSTRAINT "courier_delay_penalties_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courier_documents"
    ADD CONSTRAINT "courier_documents_prelaunch_profile_id_fkey" FOREIGN KEY ("prelaunch_profile_id") REFERENCES "public"."prelaunch_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."courier_documents"
    ADD CONSTRAINT "courier_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."courier_documents"
    ADD CONSTRAINT "courier_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courier_prime_transactions"
    ADD CONSTRAINT "courier_prime_transactions_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."courier_prime_wallets"
    ADD CONSTRAINT "courier_prime_wallets_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."courier_prime_withdrawals"
    ADD CONSTRAINT "courier_prime_withdrawals_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."delivery_code_verifications"
    ADD CONSTRAINT "delivery_code_verifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."delivery_tracking"
    ADD CONSTRAINT "delivery_tracking_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."driver_dispatch_scores"
    ADD CONSTRAINT "driver_dispatch_scores_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."driver_earnings"
    ADD CONSTRAINT "driver_earnings_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."financial_document_email_events"
    ADD CONSTRAINT "financial_document_email_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."financial_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."financial_documents"
    ADD CONSTRAINT "financial_documents_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."financial_documents"
    ADD CONSTRAINT "financial_documents_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."financial_documents"
    ADD CONSTRAINT "financial_documents_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlement_statements"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fraud_logs"
    ADD CONSTRAINT "fraud_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."loyalty_balances"
    ADD CONSTRAINT "loyalty_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."marketing_campaign_deliveries"
    ADD CONSTRAINT "marketing_campaign_deliveries_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaign_deliveries"
    ADD CONSTRAINT "marketing_campaign_deliveries_converted_order_id_fkey" FOREIGN KEY ("converted_order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_campaign_deliveries"
    ADD CONSTRAINT "marketing_campaign_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_campaign_deliveries"
    ADD CONSTRAINT "marketing_campaign_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_campaigns"
    ADD CONSTRAINT "marketing_campaigns_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."partner_subscriptions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_order_id_fkey" FOREIGN KEY ("related_order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_advantage_redemptions"
    ADD CONSTRAINT "order_advantage_redemptions_advantage_id_fkey" FOREIGN KEY ("advantage_id") REFERENCES "public"."advantage_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_advantage_redemptions"
    ADD CONSTRAINT "order_advantage_redemptions_locked_advantage_id_fkey" FOREIGN KEY ("locked_advantage_id") REFERENCES "public"."client_locked_advantages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_advantage_redemptions"
    ADD CONSTRAINT "order_advantage_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_advantage_redemptions"
    ADD CONSTRAINT "order_advantage_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_financial_ledger"
    ADD CONSTRAINT "order_financial_ledger_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."order_financial_ledger"
    ADD CONSTRAINT "order_financial_ledger_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."order_financial_ledger"
    ADD CONSTRAINT "order_financial_ledger_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_financial_ledger"
    ADD CONSTRAINT "order_financial_ledger_partner_user_id_fkey" FOREIGN KEY ("partner_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."order_financial_ledger"
    ADD CONSTRAINT "order_financial_ledger_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."order_loyalty_credits"
    ADD CONSTRAINT "order_loyalty_credits_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_loyalty_credits"
    ADD CONSTRAINT "order_loyalty_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id");



ALTER TABLE ONLY "public"."partner_applications"
    ADD CONSTRAINT "partner_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."partner_applications"
    ADD CONSTRAINT "partner_applications_service_area_id_fkey" FOREIGN KEY ("service_area_id") REFERENCES "public"."service_areas"("id");



ALTER TABLE ONLY "public"."partner_applications"
    ADD CONSTRAINT "partner_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_documents"
    ADD CONSTRAINT "partner_documents_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."partner_applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_documents"
    ADD CONSTRAINT "partner_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."partner_documents"
    ADD CONSTRAINT "partner_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_menu_categories"
    ADD CONSTRAINT "partner_menu_categories_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_subscriptions"
    ADD CONSTRAINT "partner_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."foodiz_plus_plans"("id") NOT VALID;



ALTER TABLE ONLY "public"."partner_subscriptions"
    ADD CONSTRAINT "partner_subscriptions_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlement_statements"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."prelaunch_driver_details"
    ADD CONSTRAINT "prelaunch_driver_details_prelaunch_profile_id_fkey" FOREIGN KEY ("prelaunch_profile_id") REFERENCES "public"."prelaunch_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prelaunch_driver_details"
    ADD CONSTRAINT "prelaunch_driver_details_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."prelaunch_partner_details"
    ADD CONSTRAINT "prelaunch_partner_details_prelaunch_profile_id_fkey" FOREIGN KEY ("prelaunch_profile_id") REFERENCES "public"."prelaunch_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."prelaunch_partner_details"
    ADD CONSTRAINT "prelaunch_partner_details_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."prelaunch_profiles"
    ADD CONSTRAINT "prelaunch_profiles_access_enabled_by_fkey" FOREIGN KEY ("access_enabled_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."prelaunch_profiles"
    ADD CONSTRAINT "prelaunch_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral_codes"
    ADD CONSTRAINT "referral_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_filleul_id_fkey" FOREIGN KEY ("filleul_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_parrain_id_fkey" FOREIGN KEY ("parrain_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_service_area_id_fkey" FOREIGN KEY ("service_area_id") REFERENCES "public"."service_areas"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settlement_statement_items"
    ADD CONSTRAINT "settlement_statement_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."settlement_statement_items"
    ADD CONSTRAINT "settlement_statement_items_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "public"."settlement_statements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."settlement_statements"
    ADD CONSTRAINT "settlement_statements_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."settlement_statements"
    ADD CONSTRAINT "settlement_statements_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."support_ticket_events"
    ADD CONSTRAINT "support_ticket_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."support_ticket_events"
    ADD CONSTRAINT "support_ticket_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Active restaurants viewable by all" ON "public"."restaurants" FOR SELECT USING ((("is_active" = true) OR ("auth"."uid"() = "owner_id")));



CREATE POLICY "Anyone can view active advantages" ON "public"."advantage_catalog" FOR SELECT USING (true);



CREATE POLICY "Campaigns viewable" ON "public"."foodiz_campaigns" FOR SELECT USING (true);



CREATE POLICY "Campaigns viewable by restaurant owner." ON "public"."foodiz_campaigns" FOR SELECT USING (true);



CREATE POLICY "Couriers view own prime wallets" ON "public"."courier_prime_wallets" FOR SELECT USING (("auth"."uid"() = "courier_id"));



CREATE POLICY "Orders viewable by involved parties" ON "public"."orders" FOR SELECT USING ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "courier_id") OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text") OR ("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "orders"."restaurant_id")))));



CREATE POLICY "Products viewable from active restaurants" ON "public"."products" FOR SELECT USING (((( SELECT "restaurants"."is_active"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "products"."restaurant_id")) = true) OR ("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "products"."restaurant_id")))));



CREATE POLICY "Users can view their own loyalty" ON "public"."loyalty_balances" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own transactions" ON "public"."loyalty_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own addresses" ON "public"."client_addresses" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own bank account" ON "public"."bank_accounts" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own favorites" ON "public"."client_favorites" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own locked advantages" ON "public"."client_locked_advantages" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own payment methods" ON "public"."client_payment_methods" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users view own payouts" ON "public"."payouts" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_audit_read" ON "public"."admin_audit_log" FOR SELECT USING ("public"."current_user_has_role"('admin'::"text"));



ALTER TABLE "public"."admin_broadcasts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_broadcasts_insert_admin_mvp" ON "public"."admin_broadcasts" FOR INSERT WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"));



ALTER TABLE "public"."admin_kpis_daily" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."advantage_catalog" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "advantage_catalog_select_mvp" ON "public"."advantage_catalog" FOR SELECT USING ((("is_active" = true) OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")));



ALTER TABLE "public"."advantage_generation_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_settings_admin_update" ON "public"."app_settings" FOR UPDATE TO "authenticated" USING ("public"."current_user_has_role"('admin'::"text")) WITH CHECK ("public"."current_user_has_role"('admin'::"text"));



CREATE POLICY "app_settings_public_read" ON "public"."app_settings" FOR SELECT TO "authenticated", "anon" USING (("key" = 'launch_status'::"text"));



ALTER TABLE "public"."bank_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bank_accounts_own_mvp" ON "public"."bank_accounts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "broadcasts_select_own" ON "public"."admin_broadcasts" FOR SELECT USING ((("auth"."uid"() = "admin_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "campaign_deliveries_client_read" ON "public"."marketing_campaign_deliveries" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."current_user_has_role"('admin'::"text")));



CREATE POLICY "campaigns_select_secure" ON "public"."marketing_campaigns" FOR SELECT USING ((("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "marketing_campaigns"."restaurant_id"))) OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."client_addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_addresses_select_own_phase3" ON "public"."client_addresses" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."client_delay_compensations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_delay_compensations_select_own" ON "public"."client_delay_compensations" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."client_delivery_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_delivery_codes_select_own" ON "public"."client_delivery_codes" FOR SELECT USING (("auth"."uid"() = "client_id"));



ALTER TABLE "public"."client_favorites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_favorites_own_mvp" ON "public"."client_favorites" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."client_locked_advantages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_locked_advantages_own_mvp" ON "public"."client_locked_advantages" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."client_loyalty_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_payment_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_payment_methods_own_mvp" ON "public"."client_payment_methods" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."client_rewards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_rewards_select_own" ON "public"."client_rewards" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."client_wallets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_wallets_insert_own_mvp" ON "public"."client_wallets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "client_wallets_select_own" ON "public"."client_wallets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "client_wallets_update_own" ON "public"."client_wallets" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."courier_applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courier_apps_insert_role_phase1" ON "public"."courier_applications" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."current_user_has_role"('courier'::"text")));



CREATE POLICY "courier_apps_select_own" ON "public"."courier_applications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "courier_apps_update_admin_production" ON "public"."courier_applications" FOR UPDATE USING ("public"."current_user_has_role"('admin'::"text")) WITH CHECK ("public"."current_user_has_role"('admin'::"text"));



CREATE POLICY "courier_apps_update_own_production" ON "public"."courier_applications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."courier_delay_penalties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courier_delay_penalties_select_involved" ON "public"."courier_delay_penalties" FOR SELECT TO "authenticated" USING (((("auth"."uid"() = "courier_id") OR ("auth"."uid"() = "client_id")) OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."courier_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courier_documents_select_own_or_admin" ON "public"."courier_documents" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."courier_prime_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courier_prime_wallets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courier_prime_withdrawals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_code_verifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."delivery_tracking" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delivery_tracking_select" ON "public"."delivery_tracking" FOR SELECT USING ((("auth"."uid"() = "courier_id") OR ("auth"."uid"() IN ( SELECT "orders"."client_id"
   FROM "public"."orders"
  WHERE ("orders"."id" = "delivery_tracking"."order_id"))) OR ("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = ( SELECT "orders"."restaurant_id"
           FROM "public"."orders"
          WHERE ("orders"."id" = "delivery_tracking"."order_id")))))));



CREATE POLICY "delivery_tracking_update_admin_delay_phase" ON "public"."delivery_tracking" FOR UPDATE TO "authenticated" USING ("public"."current_user_has_role"('admin'::"text")) WITH CHECK ("public"."current_user_has_role"('admin'::"text"));



ALTER TABLE "public"."driver_dispatch_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."driver_earnings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."financial_document_email_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_document_events_read_own_or_admin" ON "public"."financial_document_email_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."financial_documents" "document"
  WHERE (("document"."id" = "financial_document_email_events"."document_id") AND (("document"."recipient_id" = "auth"."uid"()) OR "public"."current_user_has_role"('admin'::"text"))))));



ALTER TABLE "public"."financial_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "financial_documents_read_own_or_admin" ON "public"."financial_documents" FOR SELECT USING ((("auth"."uid"() = "recipient_id") OR "public"."current_user_has_role"('admin'::"text")));



CREATE POLICY "financial_ledger_admin_read" ON "public"."order_financial_ledger" FOR SELECT USING ("public"."current_user_has_role"('admin'::"text"));



ALTER TABLE "public"."foodiz_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."foodiz_plus_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "foodiz_plus_plans_read" ON "public"."foodiz_plus_plans" FOR SELECT USING ((("is_active" = true) OR "public"."current_user_has_role"('admin'::"text")));



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."admin_audit_log" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."admin_broadcasts" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."admin_kpis_daily" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."advantage_catalog" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."advantage_generation_runs" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."bank_accounts" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."client_addresses" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."client_delay_compensations" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."client_delivery_codes" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."client_favorites" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."client_locked_advantages" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."client_loyalty_transactions" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."client_payment_methods" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."client_rewards" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."client_wallets" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."courier_applications" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."courier_delay_penalties" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."courier_documents" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."courier_prime_transactions" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."courier_prime_wallets" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."courier_prime_withdrawals" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."delivery_code_verifications" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."delivery_tracking" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."driver_dispatch_scores" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."driver_earnings" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."financial_document_email_events" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."financial_documents" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."foodiz_campaigns" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."foodiz_plus_plans" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."fraud_logs" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."loyalty_balances" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."loyalty_transactions" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."marketing_campaign_deliveries" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."marketing_campaigns" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."notifications" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."order_advantage_redemptions" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."order_financial_ledger" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."order_items" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."order_loyalty_credits" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."order_payments" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."orders" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."partner_applications" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."partner_documents" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."partner_menu_categories" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."partner_subscriptions" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."payouts" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."products" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."profiles" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."referral_codes" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."referrals" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."restaurants" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."reviews" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."settlement_statement_items" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."settlement_statements" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."support_ticket_events" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."support_tickets" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



CREATE POLICY "foodiz_prelaunch_global_gate" ON "public"."test_foodiz_permission" AS RESTRICTIVE TO "authenticated", "anon" USING ("public"."foodiz_application_access_allowed"()) WITH CHECK ("public"."foodiz_application_access_allowed"());



ALTER TABLE "public"."fraud_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loyalty_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loyalty_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_campaign_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."marketing_campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_insert_admin_or_self_mvp" ON "public"."notifications" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")));



CREATE POLICY "notifications_insert_partner_customers_production" ON "public"."notifications" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     JOIN "public"."restaurants" "r" ON (("r"."id" = "o"."restaurant_id")))
  WHERE (("o"."client_id" = "notifications"."user_id") AND ("o"."status" = 'delivered'::"text") AND ("r"."owner_id" = "auth"."uid"())))));



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_update_own_mvp" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."order_advantage_redemptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_advantage_redemptions_select_own" ON "public"."order_advantage_redemptions" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."order_financial_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_insert_client_mvp" ON "public"."order_items" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "orders"."client_id"
   FROM "public"."orders"
  WHERE ("orders"."id" = "order_items"."order_id"))));



CREATE POLICY "order_items_select" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "order_items"."order_id") AND (("auth"."uid"() = "orders"."client_id") OR ("auth"."uid"() = "orders"."courier_id") OR ("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
           FROM "public"."restaurants"
          WHERE ("restaurants"."id" = "orders"."restaurant_id"))))))));



CREATE POLICY "order_items_select_production" ON "public"."order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     LEFT JOIN "public"."restaurants" "r" ON (("r"."id" = "o"."restaurant_id")))
  WHERE (("o"."id" = "order_items"."order_id") AND (((("auth"."uid"() = "o"."client_id") OR ("auth"."uid"() = "o"."courier_id")) OR ("auth"."uid"() = "r"."owner_id")) OR "public"."current_user_has_role"('admin'::"text"))))));



ALTER TABLE "public"."order_loyalty_credits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_loyalty_credits_select_own" ON "public"."order_loyalty_credits" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."order_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_payments_select_own" ON "public"."order_payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     LEFT JOIN "public"."restaurants" "r" ON (("r"."id" = "o"."restaurant_id")))
  WHERE (("o"."id" = "order_payments"."order_id") AND ((("auth"."uid"() = "o"."client_id") OR ("auth"."uid"() = "r"."owner_id")) OR "public"."current_user_has_role"('admin'::"text"))))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_insert" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."uid"() = "client_id"));



CREATE POLICY "orders_insert_client_mvp" ON "public"."orders" FOR INSERT WITH CHECK (("auth"."uid"() = "client_id"));



CREATE POLICY "orders_select_own" ON "public"."orders" FOR SELECT USING ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "courier_id") OR ("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "orders"."restaurant_id")))));



CREATE POLICY "orders_update_admin_production" ON "public"."orders" FOR UPDATE USING ("public"."current_user_has_role"('admin'::"text")) WITH CHECK ("public"."current_user_has_role"('admin'::"text"));



CREATE POLICY "orders_update_own" ON "public"."orders" FOR UPDATE USING ((("auth"."uid"() = "client_id") OR ("auth"."uid"() = "courier_id") OR ("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "orders"."restaurant_id")))));



CREATE POLICY "orders_update_partner_production" ON "public"."orders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."restaurants" "r"
  WHERE (("r"."id" = "orders"."restaurant_id") AND ("r"."owner_id" = "auth"."uid"()) AND ("r"."status" = 'active'::"text") AND ("r"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."restaurants" "r"
  WHERE (("r"."id" = "orders"."restaurant_id") AND ("r"."owner_id" = "auth"."uid"()) AND ("r"."status" = 'active'::"text") AND ("r"."is_active" = true)))));



ALTER TABLE "public"."partner_applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_apps_insert_role_phase1" ON "public"."partner_applications" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."current_user_has_role"('partner'::"text")));



CREATE POLICY "partner_apps_select_admin" ON "public"."partner_applications" FOR SELECT USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."role" = 'admin'::"text"))));



CREATE POLICY "partner_apps_select_own" ON "public"."partner_applications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "partner_apps_update_admin_production" ON "public"."partner_applications" FOR UPDATE USING ("public"."current_user_has_role"('admin'::"text")) WITH CHECK ("public"."current_user_has_role"('admin'::"text"));



CREATE POLICY "partner_apps_update_own_production" ON "public"."partner_applications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."partner_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_documents_select_own_or_admin" ON "public"."partner_documents" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."partner_menu_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_menu_categories_owner_production" ON "public"."partner_menu_categories" USING (("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "partner_menu_categories"."restaurant_id")))) WITH CHECK (("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "partner_menu_categories"."restaurant_id"))));



ALTER TABLE "public"."partner_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payouts_select_own_or_admin" ON "public"."payouts" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."prelaunch_driver_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prelaunch_driver_details_read_own_or_admin" ON "public"."prelaunch_driver_details" FOR SELECT TO "authenticated" USING (("public"."current_user_has_role"('admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."prelaunch_profiles" "profile"
  WHERE (("profile"."id" = "prelaunch_driver_details"."prelaunch_profile_id") AND ("profile"."user_id" = "auth"."uid"()))))));



CREATE POLICY "prelaunch_driver_details_update_own_or_admin" ON "public"."prelaunch_driver_details" FOR UPDATE TO "authenticated" USING (("public"."current_user_has_role"('admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."prelaunch_profiles" "profile"
  WHERE (("profile"."id" = "prelaunch_driver_details"."prelaunch_profile_id") AND ("profile"."user_id" = "auth"."uid"())))))) WITH CHECK (("public"."current_user_has_role"('admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."prelaunch_profiles" "profile"
  WHERE (("profile"."id" = "prelaunch_driver_details"."prelaunch_profile_id") AND ("profile"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."prelaunch_partner_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prelaunch_partner_details_read_own_or_admin" ON "public"."prelaunch_partner_details" FOR SELECT TO "authenticated" USING (("public"."current_user_has_role"('admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."prelaunch_profiles" "profile"
  WHERE (("profile"."id" = "prelaunch_partner_details"."prelaunch_profile_id") AND ("profile"."user_id" = "auth"."uid"()))))));



CREATE POLICY "prelaunch_partner_details_update_own_or_admin" ON "public"."prelaunch_partner_details" FOR UPDATE TO "authenticated" USING (("public"."current_user_has_role"('admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."prelaunch_profiles" "profile"
  WHERE (("profile"."id" = "prelaunch_partner_details"."prelaunch_profile_id") AND ("profile"."user_id" = "auth"."uid"())))))) WITH CHECK (("public"."current_user_has_role"('admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."prelaunch_profiles" "profile"
  WHERE (("profile"."id" = "prelaunch_partner_details"."prelaunch_profile_id") AND ("profile"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."prelaunch_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prelaunch_profiles_read_own_or_admin" ON "public"."prelaunch_profiles" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."current_user_has_role"('admin'::"text")));



CREATE POLICY "prelaunch_profiles_update_own_or_admin" ON "public"."prelaunch_profiles" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."current_user_has_role"('admin'::"text"))) WITH CHECK (((("user_id" = "auth"."uid"()) AND ("status" = ANY (ARRAY['prelaunch_pending'::"text", 'launch_email_sent'::"text"]))) OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."prelaunch_registration_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete_owner_mvp" ON "public"."products" FOR DELETE USING (("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "products"."restaurant_id"))));



CREATE POLICY "products_insert_owner_mvp" ON "public"."products" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "products"."restaurant_id"))));



CREATE POLICY "products_select" ON "public"."products" FOR SELECT USING (true);



CREATE POLICY "products_update_owner_mvp" ON "public"."products" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "products"."restaurant_id")))) WITH CHECK (("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "products"."restaurant_id"))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_self_or_admin_phase1" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "id") OR "public"."current_user_has_role"('admin'::"text")));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_self_or_admin_phase1" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "id") OR "public"."current_user_has_role"('admin'::"text"))) WITH CHECK ((("auth"."uid"() = "id") OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."referral_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "referrals_select_own" ON "public"."referrals" FOR SELECT USING ((("auth"."uid"() = "parrain_id") OR ("auth"."uid"() = "filleul_id")));



ALTER TABLE "public"."restaurants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "restaurants_select_active" ON "public"."restaurants" FOR SELECT USING (("is_active" = true));



CREATE POLICY "restaurants_select_own" ON "public"."restaurants" FOR SELECT USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "restaurants_update_own" ON "public"."restaurants" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "restaurants_update_owner_or_admin_mvp" ON "public"."restaurants" FOR UPDATE USING ((("auth"."uid"() = "owner_id") OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text"))) WITH CHECK ((("auth"."uid"() = "owner_id") OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"text")));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_insert_client_production" ON "public"."reviews" FOR INSERT WITH CHECK ((("auth"."uid"() = "client_id") AND (EXISTS ( SELECT 1
   FROM "public"."orders"
  WHERE (("orders"."id" = "reviews"."order_id") AND ("orders"."client_id" = "auth"."uid"()) AND ("orders"."status" = 'delivered'::"text"))))));



CREATE POLICY "reviews_select" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "reviews_select_production" ON "public"."reviews" FOR SELECT USING (true);



ALTER TABLE "public"."service_areas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_areas_admin_write" ON "public"."service_areas" TO "authenticated" USING ("public"."current_user_has_role"('admin'::"text")) WITH CHECK ("public"."current_user_has_role"('admin'::"text"));



CREATE POLICY "service_areas_public_read" ON "public"."service_areas" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "settlement_admin_all" ON "public"."settlement_statements" USING ("public"."current_user_has_role"('admin'::"text")) WITH CHECK ("public"."current_user_has_role"('admin'::"text"));



CREATE POLICY "settlement_beneficiary_read" ON "public"."settlement_statements" FOR SELECT USING (("auth"."uid"() = "beneficiary_id"));



CREATE POLICY "settlement_items_admin_read" ON "public"."settlement_statement_items" FOR SELECT USING ("public"."current_user_has_role"('admin'::"text"));



CREATE POLICY "settlement_items_beneficiary_read" ON "public"."settlement_statement_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."settlement_statements" "s"
  WHERE (("s"."id" = "settlement_statement_items"."statement_id") AND ("s"."beneficiary_id" = "auth"."uid"())))));



ALTER TABLE "public"."settlement_statement_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settlement_statements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscriptions_select_own_or_admin" ON "public"."partner_subscriptions" FOR SELECT USING ((("auth"."uid"() IN ( SELECT "restaurants"."owner_id"
   FROM "public"."restaurants"
  WHERE ("restaurants"."id" = "partner_subscriptions"."restaurant_id"))) OR "public"."current_user_has_role"('admin'::"text")));



ALTER TABLE "public"."support_ticket_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_ticket_events_read_own_or_admin" ON "public"."support_ticket_events" FOR SELECT USING (("public"."current_user_has_role"('admin'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."support_tickets" "ticket"
  WHERE (("ticket"."id" = "support_ticket_events"."ticket_id") AND ("ticket"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_tickets_insert" ON "public"."support_tickets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "support_tickets_insert_own_production" ON "public"."support_tickets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "support_tickets_select_own" ON "public"."support_tickets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "support_tickets_select_own_production" ON "public"."support_tickets" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."current_user_has_role"('admin'::"text")));



CREATE POLICY "support_tickets_update_admin_production" ON "public"."support_tickets" FOR UPDATE USING ("public"."current_user_has_role"('admin'::"text")) WITH CHECK ("public"."current_user_has_role"('admin'::"text"));



ALTER TABLE "public"."test_foodiz_permission" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";












GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































REVOKE ALL ON FUNCTION "public"."admin_resolve_support_ticket"("target_ticket_id" "uuid", "target_response" "text", "target_summary" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_resolve_support_ticket"("target_ticket_id" "uuid", "target_response" "text", "target_summary" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_resolve_support_ticket"("target_ticket_id" "uuid", "target_response" "text", "target_summary" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_resolve_support_ticket"("target_ticket_id" "uuid", "target_response" "text", "target_summary" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_set_client_status"("target_user_id" "uuid", "target_status" "text", "target_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_set_client_status"("target_user_id" "uuid", "target_status" "text", "target_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_client_status"("target_user_id" "uuid", "target_status" "text", "target_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_client_status"("target_user_id" "uuid", "target_status" "text", "target_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_set_partner_status"("target_restaurant_id" "uuid", "target_status" "text", "target_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_set_partner_status"("target_restaurant_id" "uuid", "target_status" "text", "target_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_set_partner_status"("target_restaurant_id" "uuid", "target_status" "text", "target_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_set_partner_status"("target_restaurant_id" "uuid", "target_status" "text", "target_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_waive_courier_delay_penalty"("target_order_id" "uuid", "target_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_waive_courier_delay_penalty"("target_order_id" "uuid", "target_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_waive_courier_delay_penalty"("target_order_id" "uuid", "target_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_waive_courier_delay_penalty"("target_order_id" "uuid", "target_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_courier_delay_penalty"("target_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_courier_delay_penalty"("target_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_courier_delay_penalty"("target_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_order_advantage"("target_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_order_advantage"("target_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_order_advantage"("target_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_order_advantage"("target_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_courier_delivery"("target_order_id" "uuid", "target_courier_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_courier_delivery"("target_order_id" "uuid", "target_courier_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_courier_delivery"("target_order_id" "uuid", "target_courier_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_courier_delivery"("target_order_id" "uuid", "target_courier_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_courier_delivery"("target_order_id" "uuid", "target_courier_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_courier_delivery"("target_order_id" "uuid", "target_courier_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_courier_delivery"("target_order_id" "uuid", "target_courier_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_first_paid_referral"("target_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_first_paid_referral"("target_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_first_paid_referral"("target_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_client_payment_receipt"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_client_payment_receipt"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_client_payment_receipt"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_loyalty_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_loyalty_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_loyalty_balance"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_order_delivery_code"("target_order_id" "uuid", "target_client_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_order_delivery_code"("target_order_id" "uuid", "target_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_order_delivery_code"("target_order_id" "uuid", "target_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_order_delivery_code"("target_order_id" "uuid", "target_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_paid_settlement_document"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_paid_settlement_document"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_paid_settlement_document"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_weekly_settlement"("target_beneficiary_id" "uuid", "target_beneficiary_type" "text", "target_period_start" "date", "target_period_end" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_weekly_settlement"("target_beneficiary_id" "uuid", "target_beneficiary_type" "text", "target_period_start" "date", "target_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."create_weekly_settlement"("target_beneficiary_id" "uuid", "target_beneficiary_type" "text", "target_period_start" "date", "target_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_weekly_settlement"("target_beneficiary_id" "uuid", "target_beneficiary_type" "text", "target_period_start" "date", "target_period_end" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."credit_order_loyalty"("target_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."credit_order_loyalty"("target_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."credit_order_loyalty"("target_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."credit_order_loyalty"("target_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_has_role"("required_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_has_role"("required_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_has_role"("required_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_has_role"("required_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_client_address_server"("target_user_id" "uuid", "target_address_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_client_address_server"("target_user_id" "uuid", "target_address_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_client_address_server"("target_user_id" "uuid", "target_address_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_client_address_server"("target_user_id" "uuid", "target_address_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_order_worker_transition"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_order_worker_transition"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_order_worker_transition"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_single_admin_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_single_admin_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_single_admin_email"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_service_area_server"("target_city" "text", "target_postal_code" "text", "target_latitude" numeric, "target_longitude" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_service_area_server"("target_city" "text", "target_postal_code" "text", "target_latitude" numeric, "target_longitude" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_service_area_server"("target_city" "text", "target_postal_code" "text", "target_latitude" numeric, "target_longitude" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_service_area_server"("target_city" "text", "target_postal_code" "text", "target_latitude" numeric, "target_longitude" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."foodiz_app_is_launched"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."foodiz_app_is_launched"() TO "anon";
GRANT ALL ON FUNCTION "public"."foodiz_app_is_launched"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."foodiz_app_is_launched"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."foodiz_application_access_allowed"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."foodiz_application_access_allowed"() TO "anon";
GRANT ALL ON FUNCTION "public"."foodiz_application_access_allowed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."foodiz_application_access_allowed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."foodiz_department_from_postal_code"("target_postal_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."foodiz_department_from_postal_code"("target_postal_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."foodiz_department_from_postal_code"("target_postal_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_client_payment_receipt"("target_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_client_payment_receipt"("target_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_client_payment_receipt"("target_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_client_payment_receipt"("target_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_foodiz_ref_code"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_foodiz_ref_code"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_foodiz_ref_code"("user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_client_order_courier_contact"("target_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_client_order_courier_contact"("target_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_order_courier_contact"("target_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_order_courier_contact"("target_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_courier_order_client_contact"("target_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_courier_order_client_contact"("target_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_courier_order_client_contact"("target_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_courier_order_client_contact"("target_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_partner_order_customers"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_partner_order_customers"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_partner_order_customers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_partner_order_customers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_email_confirmation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_email_confirmation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_email_confirmation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_foodiz_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_foodiz_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_foodiz_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_foodiz_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_order_delivered"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_order_delivered"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_order_delivered"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_settlement_paid"("target_statement_id" "uuid", "target_payment_reference" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_settlement_paid"("target_statement_id" "uuid", "target_payment_reference" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_settlement_paid"("target_statement_id" "uuid", "target_payment_reference" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_settlement_paid"("target_statement_id" "uuid", "target_payment_reference" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_foodiz_city"("target_city" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_foodiz_city"("target_city" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_foodiz_city"("target_city" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."normalize_foodiz_phone"("raw_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."normalize_foodiz_phone"("raw_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_foodiz_phone"("raw_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_foodiz_phone"("raw_phone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."promote_user_to_admin"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."promote_user_to_admin"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."promote_user_to_admin"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_courier_application_review_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_courier_application_review_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_courier_application_review_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_partner_application_review_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_partner_application_review_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_partner_application_review_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_profile_privileged_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_profile_privileged_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_profile_privileged_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_restaurant_privileged_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_restaurant_privileged_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_restaurant_privileged_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_restaurant_validation_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_restaurant_validation_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_restaurant_validation_fields"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."publish_ai_advantage_cycle"("proposals" "jsonb", "model_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."publish_ai_advantage_cycle"("proposals" "jsonb", "model_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."publish_ai_advantage_cycle"("proposals" "jsonb", "model_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."publish_ai_advantage_cycle"("proposals" "jsonb", "model_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."publish_foodiz_advantage_cycle"("proposals" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."publish_foodiz_advantage_cycle"("proposals" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."publish_foodiz_advantage_cycle"("proposals" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."publish_foodiz_advantage_cycle"("proposals" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_courier_delivery_step"("target_order_id" "uuid", "target_courier_id" "uuid", "target_step" "text", "target_latitude" numeric, "target_longitude" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_courier_delivery_step"("target_order_id" "uuid", "target_courier_id" "uuid", "target_step" "text", "target_latitude" numeric, "target_longitude" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."record_courier_delivery_step"("target_order_id" "uuid", "target_courier_id" "uuid", "target_step" "text", "target_latitude" numeric, "target_longitude" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_courier_pickup"("target_order_id" "uuid", "target_courier_id" "uuid", "target_pickup_latitude" numeric, "target_pickup_longitude" numeric, "target_gps_accuracy_meters" numeric, "target_route_duration_seconds" integer, "target_route_distance_meters" integer, "target_expected_arrival_at" timestamp with time zone, "target_eta_provider" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_courier_pickup"("target_order_id" "uuid", "target_courier_id" "uuid", "target_pickup_latitude" numeric, "target_pickup_longitude" numeric, "target_gps_accuracy_meters" numeric, "target_route_duration_seconds" integer, "target_route_distance_meters" integer, "target_expected_arrival_at" timestamp with time zone, "target_eta_provider" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_courier_pickup"("target_order_id" "uuid", "target_courier_id" "uuid", "target_pickup_latitude" numeric, "target_pickup_longitude" numeric, "target_gps_accuracy_meters" numeric, "target_route_duration_seconds" integer, "target_route_distance_meters" integer, "target_expected_arrival_at" timestamp with time zone, "target_eta_provider" "text") TO "service_role";



GRANT ALL ON TABLE "public"."client_rewards" TO "anon";
GRANT ALL ON TABLE "public"."client_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."client_rewards" TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_locked_advantage"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_locked_advantage"() TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_locked_advantage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_locked_advantage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."regenerate_advantage_catalog"() TO "anon";
GRANT ALL ON FUNCTION "public"."regenerate_advantage_catalog"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."regenerate_advantage_catalog"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_delivery_code_failure"("target_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_delivery_code_failure"("target_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."register_delivery_code_failure"("target_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_delivery_code_failure"("target_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."release_order_advantage"("target_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."release_order_advantage"("target_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."release_order_advantage"("target_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."release_order_advantage"("target_order_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."require_courier_legal_identity"() TO "anon";
GRANT ALL ON FUNCTION "public"."require_courier_legal_identity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."require_courier_legal_identity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reserve_order_advantage"("target_order_id" "uuid", "target_user_id" "uuid", "target_locked_id" "uuid", "expected_discount_cents" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reserve_order_advantage"("target_order_id" "uuid", "target_user_id" "uuid", "target_locked_id" "uuid", "expected_discount_cents" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."reserve_order_advantage"("target_order_id" "uuid", "target_user_id" "uuid", "target_locked_id" "uuid", "expected_discount_cents" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserve_order_advantage"("target_order_id" "uuid", "target_user_id" "uuid", "target_locked_id" "uuid", "expected_discount_cents" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."reverse_applied_order_advantage"("target_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reverse_applied_order_advantage"("target_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reverse_applied_order_advantage"("target_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reverse_applied_order_advantage"("target_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reverse_order_loyalty"("target_order_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reverse_order_loyalty"("target_order_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reverse_order_loyalty"("target_order_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reverse_order_loyalty"("target_order_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."review_courier_application"("target_application_id" "uuid", "target_reviewer_id" "uuid", "target_decision" "text", "target_comment" "text", "target_identity_name_confirmed" boolean, "target_business_identity_confirmed" boolean, "target_document_types" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."review_courier_application"("target_application_id" "uuid", "target_reviewer_id" "uuid", "target_decision" "text", "target_comment" "text", "target_identity_name_confirmed" boolean, "target_business_identity_confirmed" boolean, "target_document_types" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."review_courier_application"("target_application_id" "uuid", "target_reviewer_id" "uuid", "target_decision" "text", "target_comment" "text", "target_identity_name_confirmed" boolean, "target_business_identity_confirmed" boolean, "target_document_types" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."review_partner_application_server"("target_application_id" "uuid", "target_reviewer_id" "uuid", "target_decision" "text", "target_comment" "text", "target_document_types" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."review_partner_application_server"("target_application_id" "uuid", "target_reviewer_id" "uuid", "target_decision" "text", "target_comment" "text", "target_document_types" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."review_partner_application_server"("target_application_id" "uuid", "target_reviewer_id" "uuid", "target_decision" "text", "target_comment" "text", "target_document_types" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."review_partner_application_server"("target_application_id" "uuid", "target_reviewer_id" "uuid", "target_decision" "text", "target_comment" "text", "target_document_types" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_client_delivery_address_server"("target_user_id" "uuid", "target_address_id" "uuid", "target_label" "text", "target_address" "text", "target_postal_code" "text", "target_city" "text", "target_latitude" numeric, "target_longitude" numeric, "make_default" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_client_delivery_address_server"("target_user_id" "uuid", "target_address_id" "uuid", "target_label" "text", "target_address" "text", "target_postal_code" "text", "target_city" "text", "target_latitude" numeric, "target_longitude" numeric, "make_default" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."save_client_delivery_address_server"("target_user_id" "uuid", "target_address_id" "uuid", "target_label" "text", "target_address" "text", "target_postal_code" "text", "target_city" "text", "target_latitude" numeric, "target_longitude" numeric, "make_default" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_client_delivery_address_server"("target_user_id" "uuid", "target_address_id" "uuid", "target_label" "text", "target_address" "text", "target_postal_code" "text", "target_city" "text", "target_latitude" numeric, "target_longitude" numeric, "make_default" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_partner_establishment_server"("target_user_id" "uuid", "target_name" "text", "target_siret" "text", "target_phone" "text", "target_address" "text", "target_postal_code" "text", "target_city" "text", "target_description" "text", "target_latitude" numeric, "target_longitude" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_partner_establishment_server"("target_user_id" "uuid", "target_name" "text", "target_siret" "text", "target_phone" "text", "target_address" "text", "target_postal_code" "text", "target_city" "text", "target_description" "text", "target_latitude" numeric, "target_longitude" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."save_partner_establishment_server"("target_user_id" "uuid", "target_name" "text", "target_siret" "text", "target_phone" "text", "target_address" "text", "target_postal_code" "text", "target_city" "text", "target_description" "text", "target_latitude" numeric, "target_longitude" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_partner_establishment_server"("target_user_id" "uuid", "target_name" "text", "target_siret" "text", "target_phone" "text", "target_address" "text", "target_postal_code" "text", "target_city" "text", "target_description" "text", "target_latitude" numeric, "target_longitude" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_bank_accounts_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_bank_accounts_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_bank_accounts_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_client_default_address_server"("target_user_id" "uuid", "target_address_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_client_default_address_server"("target_user_id" "uuid", "target_address_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_client_default_address_server"("target_user_id" "uuid", "target_address_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_client_default_address_server"("target_user_id" "uuid", "target_address_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_partner_operational_status_server"("target_restaurant_id" "uuid", "target_reviewer_id" "uuid", "target_status" "text", "target_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_partner_operational_status_server"("target_restaurant_id" "uuid", "target_reviewer_id" "uuid", "target_status" "text", "target_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_partner_operational_status_server"("target_restaurant_id" "uuid", "target_reviewer_id" "uuid", "target_status" "text", "target_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_partner_operational_status_server"("target_restaurant_id" "uuid", "target_reviewer_id" "uuid", "target_status" "text", "target_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_prelaunch_professional_access"("target_user_id" "uuid", "target_reviewer_id" "uuid", "target_enabled" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_prelaunch_professional_access"("target_user_id" "uuid", "target_reviewer_id" "uuid", "target_enabled" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_prelaunch_professional_access"("target_user_id" "uuid", "target_reviewer_id" "uuid", "target_enabled" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_prelaunch_professional_access"("target_user_id" "uuid", "target_reviewer_id" "uuid", "target_enabled" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_prelaunch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_prelaunch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_prelaunch_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_service_area_status_server"("target_area_id" "uuid", "target_reviewer_id" "uuid", "target_status" "text", "target_delivery_radius_km" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_service_area_status_server"("target_area_id" "uuid", "target_reviewer_id" "uuid", "target_status" "text", "target_delivery_radius_km" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."set_service_area_status_server"("target_area_id" "uuid", "target_reviewer_id" "uuid", "target_status" "text", "target_delivery_radius_km" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_service_area_status_server"("target_area_id" "uuid", "target_reviewer_id" "uuid", "target_status" "text", "target_delivery_radius_km" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_ledger_loyalty_redemption"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_ledger_loyalty_redemption"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_ledger_loyalty_redemption"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_order_delay_penalty_to_ledger"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_order_delay_penalty_to_ledger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_order_delay_penalty_to_ledger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_order_financial_ledger"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_order_financial_ledger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_order_financial_ledger"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."trusted_server_operation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trusted_server_operation"() TO "anon";
GRANT ALL ON FUNCTION "public"."trusted_server_operation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trusted_server_operation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_courier_presence_server"("target_user_id" "uuid", "target_online" boolean, "target_latitude" numeric, "target_longitude" numeric, "target_accuracy_meters" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_courier_presence_server"("target_user_id" "uuid", "target_online" boolean, "target_latitude" numeric, "target_longitude" numeric, "target_accuracy_meters" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_courier_presence_server"("target_user_id" "uuid", "target_online" boolean, "target_latitude" numeric, "target_longitude" numeric, "target_accuracy_meters" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_courier_presence_server"("target_user_id" "uuid", "target_online" boolean, "target_latitude" numeric, "target_longitude" numeric, "target_accuracy_meters" numeric) TO "service_role";
























GRANT ALL ON TABLE "public"."admin_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."admin_broadcasts" TO "anon";
GRANT ALL ON TABLE "public"."admin_broadcasts" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_broadcasts" TO "service_role";



GRANT ALL ON TABLE "public"."order_financial_ledger" TO "anon";
GRANT ALL ON TABLE "public"."order_financial_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."order_financial_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."admin_financial_account_balances" TO "anon";
GRANT ALL ON TABLE "public"."admin_financial_account_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_financial_account_balances" TO "service_role";



GRANT ALL ON TABLE "public"."admin_kpis_daily" TO "anon";
GRANT ALL ON TABLE "public"."admin_kpis_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_kpis_daily" TO "service_role";



GRANT ALL ON TABLE "public"."courier_applications" TO "anon";
GRANT ALL ON TABLE "public"."courier_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."courier_applications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."restaurants" TO "anon";
GRANT ALL ON TABLE "public"."restaurants" TO "authenticated";
GRANT ALL ON TABLE "public"."restaurants" TO "service_role";



GRANT ALL ON TABLE "public"."settlement_statement_items" TO "anon";
GRANT ALL ON TABLE "public"."settlement_statement_items" TO "authenticated";
GRANT ALL ON TABLE "public"."settlement_statement_items" TO "service_role";



GRANT ALL ON TABLE "public"."settlement_statements" TO "anon";
GRANT ALL ON TABLE "public"."settlement_statements" TO "authenticated";
GRANT ALL ON TABLE "public"."settlement_statements" TO "service_role";



GRANT ALL ON TABLE "public"."admin_weekly_payables" TO "anon";
GRANT ALL ON TABLE "public"."admin_weekly_payables" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_weekly_payables" TO "service_role";



GRANT ALL ON TABLE "public"."advantage_catalog" TO "anon";
GRANT ALL ON TABLE "public"."advantage_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."advantage_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."advantage_generation_runs" TO "anon";
GRANT ALL ON TABLE "public"."advantage_generation_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."advantage_generation_runs" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."bank_accounts" TO "anon";
GRANT ALL ON TABLE "public"."bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."client_addresses" TO "anon";
GRANT ALL ON TABLE "public"."client_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."client_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."client_delay_compensations" TO "anon";
GRANT ALL ON TABLE "public"."client_delay_compensations" TO "authenticated";
GRANT ALL ON TABLE "public"."client_delay_compensations" TO "service_role";



GRANT ALL ON TABLE "public"."client_delivery_codes" TO "anon";
GRANT ALL ON TABLE "public"."client_delivery_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."client_delivery_codes" TO "service_role";



GRANT ALL ON TABLE "public"."client_favorites" TO "anon";
GRANT ALL ON TABLE "public"."client_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."client_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."client_locked_advantages" TO "anon";
GRANT ALL ON TABLE "public"."client_locked_advantages" TO "authenticated";
GRANT ALL ON TABLE "public"."client_locked_advantages" TO "service_role";



GRANT ALL ON TABLE "public"."client_loyalty_transactions" TO "anon";
GRANT ALL ON TABLE "public"."client_loyalty_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."client_loyalty_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."client_payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."client_payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."client_payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."client_wallets" TO "anon";
GRANT ALL ON TABLE "public"."client_wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."client_wallets" TO "service_role";



GRANT ALL ON TABLE "public"."courier_delay_penalties" TO "anon";
GRANT ALL ON TABLE "public"."courier_delay_penalties" TO "authenticated";
GRANT ALL ON TABLE "public"."courier_delay_penalties" TO "service_role";



GRANT ALL ON TABLE "public"."courier_documents" TO "anon";
GRANT ALL ON TABLE "public"."courier_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."courier_documents" TO "service_role";



GRANT ALL ON TABLE "public"."courier_prime_transactions" TO "anon";
GRANT ALL ON TABLE "public"."courier_prime_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."courier_prime_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."courier_prime_wallets" TO "anon";
GRANT ALL ON TABLE "public"."courier_prime_wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."courier_prime_wallets" TO "service_role";



GRANT ALL ON TABLE "public"."courier_prime_withdrawals" TO "anon";
GRANT ALL ON TABLE "public"."courier_prime_withdrawals" TO "authenticated";
GRANT ALL ON TABLE "public"."courier_prime_withdrawals" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_code_verifications" TO "anon";
GRANT ALL ON TABLE "public"."delivery_code_verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_code_verifications" TO "service_role";



GRANT ALL ON TABLE "public"."delivery_tracking" TO "anon";
GRANT ALL ON TABLE "public"."delivery_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."delivery_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."driver_dispatch_scores" TO "anon";
GRANT ALL ON TABLE "public"."driver_dispatch_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_dispatch_scores" TO "service_role";



GRANT ALL ON TABLE "public"."driver_earnings" TO "anon";
GRANT ALL ON TABLE "public"."driver_earnings" TO "authenticated";
GRANT ALL ON TABLE "public"."driver_earnings" TO "service_role";



GRANT ALL ON TABLE "public"."financial_document_email_events" TO "anon";
GRANT ALL ON TABLE "public"."financial_document_email_events" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_document_email_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."financial_document_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."financial_document_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."financial_document_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."financial_documents" TO "anon";
GRANT ALL ON TABLE "public"."financial_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."financial_documents" TO "service_role";



GRANT ALL ON TABLE "public"."foodiz_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."foodiz_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."foodiz_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."foodiz_plus_plans" TO "anon";
GRANT ALL ON TABLE "public"."foodiz_plus_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."foodiz_plus_plans" TO "service_role";



GRANT ALL ON TABLE "public"."fraud_logs" TO "anon";
GRANT ALL ON TABLE "public"."fraud_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."fraud_logs" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_balances" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_balances" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_transactions" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_campaign_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."marketing_campaign_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_campaign_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."marketing_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."order_advantage_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."order_advantage_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."order_advantage_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_loyalty_credits" TO "anon";
GRANT ALL ON TABLE "public"."order_loyalty_credits" TO "authenticated";
GRANT ALL ON TABLE "public"."order_loyalty_credits" TO "service_role";



GRANT ALL ON TABLE "public"."order_payments" TO "anon";
GRANT ALL ON TABLE "public"."order_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."order_payments" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."partner_applications" TO "anon";
GRANT ALL ON TABLE "public"."partner_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_applications" TO "service_role";



GRANT ALL ON TABLE "public"."partner_documents" TO "anon";
GRANT ALL ON TABLE "public"."partner_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_documents" TO "service_role";



GRANT ALL ON TABLE "public"."partner_menu_categories" TO "anon";
GRANT ALL ON TABLE "public"."partner_menu_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_menu_categories" TO "service_role";



GRANT ALL ON TABLE "public"."partner_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."partner_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."payouts" TO "anon";
GRANT ALL ON TABLE "public"."payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."payouts" TO "service_role";



GRANT ALL ON TABLE "public"."prelaunch_driver_details" TO "anon";
GRANT ALL ON TABLE "public"."prelaunch_driver_details" TO "authenticated";
GRANT ALL ON TABLE "public"."prelaunch_driver_details" TO "service_role";



GRANT ALL ON TABLE "public"."prelaunch_partner_details" TO "anon";
GRANT ALL ON TABLE "public"."prelaunch_partner_details" TO "authenticated";
GRANT ALL ON TABLE "public"."prelaunch_partner_details" TO "service_role";



GRANT ALL ON TABLE "public"."prelaunch_profiles" TO "anon";
GRANT ALL ON TABLE "public"."prelaunch_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."prelaunch_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."prelaunch_registration_attempts" TO "anon";
GRANT ALL ON TABLE "public"."prelaunch_registration_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."prelaunch_registration_attempts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."prelaunch_registration_attempts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."prelaunch_registration_attempts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."prelaunch_registration_attempts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."referral_codes" TO "anon";
GRANT ALL ON TABLE "public"."referral_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_codes" TO "service_role";



GRANT ALL ON TABLE "public"."referrals" TO "anon";
GRANT ALL ON TABLE "public"."referrals" TO "authenticated";
GRANT ALL ON TABLE "public"."referrals" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."service_areas" TO "anon";
GRANT ALL ON TABLE "public"."service_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."service_areas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."settlement_document_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."settlement_document_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."settlement_document_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."support_ticket_events" TO "anon";
GRANT ALL ON TABLE "public"."support_ticket_events" TO "authenticated";
GRANT ALL ON TABLE "public"."support_ticket_events" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."test_foodiz_permission" TO "anon";
GRANT ALL ON TABLE "public"."test_foodiz_permission" TO "authenticated";
GRANT ALL ON TABLE "public"."test_foodiz_permission" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































