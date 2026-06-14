-- Free deterministic loyalty engine and payment-confirmed advantage consumption.

ALTER TABLE public.advantage_catalog
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS eligible_products uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS eligible_establishments uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.advantage_catalog DROP CONSTRAINT IF EXISTS advantage_catalog_category_check;
ALTER TABLE public.advantage_catalog ADD CONSTRAINT advantage_catalog_category_check
  CHECK (category IN ('all', 'restaurant', 'market'));

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS advantage_discount_cents integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.order_advantage_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  locked_advantage_id uuid REFERENCES public.client_locked_advantages(id) ON DELETE SET NULL,
  advantage_id uuid REFERENCES public.advantage_catalog(id) ON DELETE SET NULL,
  points_cost integer NOT NULL,
  discount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'applied', 'released')),
  reserved_at timestamp with time zone NOT NULL DEFAULT now(),
  applied_at timestamp with time zone,
  released_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_order_advantage_redemptions_user_status
  ON public.order_advantage_redemptions(user_id, status);
ALTER TABLE public.order_advantage_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_advantage_redemptions_select_own" ON public.order_advantage_redemptions;
CREATE POLICY "order_advantage_redemptions_select_own" ON public.order_advantage_redemptions FOR SELECT
  USING (auth.uid() = user_id OR public.current_user_has_role('admin'));

CREATE OR REPLACE FUNCTION public.publish_foodiz_advantage_cycle(proposals jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cycle uuid := gen_random_uuid();
  proposal jsonb;
  allowed_points integer[] := ARRAY[250, 500, 800, 1000, 1500, 2000];
  received_points integer[] := '{}';
  points_value integer;
  face_value integer;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('foodiz_advantage_rotation'));

  IF EXISTS (
    SELECT 1 FROM public.advantage_generation_runs
    WHERE status = 'success' AND generated_at > now() - interval '48 hours'
  ) THEN RETURN NULL; END IF;

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
      RAISE EXCEPTION 'Maximum value must equal the points cost in cents';
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
      coalesce(ARRAY(SELECT jsonb_array_elements_text(proposal -> 'eligible_products')::uuid), '{}'),
      coalesce(ARRAY(SELECT jsonb_array_elements_text(proposal -> 'eligible_establishments')::uuid), '{}')
    );
  END LOOP;

  UPDATE public.advantage_catalog SET is_active = false
  WHERE is_active = true AND cycle_id IS DISTINCT FROM cycle;

  INSERT INTO public.advantage_generation_runs (model_name, status, offer_count)
  VALUES ('foodiz-rule-engine-v1', 'success', 6);
  RETURN cycle;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_foodiz_advantage_cycle(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_foodiz_advantage_cycle(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_order_advantage(
  target_order_id uuid,
  target_user_id uuid,
  target_locked_id uuid,
  expected_discount_cents integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.apply_order_advantage(target_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  redemption public.order_advantage_redemptions;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;
  SELECT * INTO redemption FROM public.order_advantage_redemptions
  WHERE order_id = target_order_id AND status = 'reserved' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.client_wallets
  SET points_balance = points_balance - redemption.points_cost, updated_at = now()
  WHERE user_id = redemption.user_id AND points_balance >= redemption.points_cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient points at payment confirmation'; END IF;

  UPDATE public.order_advantage_redemptions SET status = 'applied', applied_at = now()
  WHERE id = redemption.id;
  DELETE FROM public.client_locked_advantages WHERE id = redemption.locked_advantage_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_order_advantage(target_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;
  UPDATE public.order_advantage_redemptions
  SET status = 'released', released_at = now()
  WHERE order_id = target_order_id AND status = 'reserved';
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_order_advantage(uuid, uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_order_advantage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_order_advantage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_order_advantage(uuid, uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_order_advantage(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_advantage(uuid) TO service_role;
