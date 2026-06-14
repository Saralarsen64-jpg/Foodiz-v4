-- AI-assisted 48-hour advantage cycles with server-enforced economic rules.

ALTER TABLE public.advantage_catalog
  ADD COLUMN IF NOT EXISTS cycle_id uuid,
  ADD COLUMN IF NOT EXISTS reward_type text NOT NULL DEFAULT 'fixed_discount',
  ADD COLUMN IF NOT EXISTS face_value_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimum_order_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS generated_at timestamp with time zone;

ALTER TABLE public.advantage_catalog DROP CONSTRAINT IF EXISTS advantage_catalog_reward_type_check;
ALTER TABLE public.advantage_catalog ADD CONSTRAINT advantage_catalog_reward_type_check
  CHECK (reward_type IN ('fixed_discount', 'percent_discount', 'free_delivery', 'free_item'));

CREATE TABLE IF NOT EXISTS public.advantage_generation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  offer_count integer NOT NULL DEFAULT 0,
  error_message text,
  generated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.advantage_generation_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_advantage_generation_runs_date
  ON public.advantage_generation_runs(generated_at DESC);

CREATE OR REPLACE FUNCTION public.publish_ai_advantage_cycle(proposals jsonb, model_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.publish_ai_advantage_cycle(jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_ai_advantage_cycle(jsonb, text) TO service_role;

-- A locked offer remains redeemable after the public catalog rotates.
CREATE OR REPLACE FUNCTION public.redeem_locked_advantage()
RETURNS public.client_rewards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.redeem_locked_advantage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_locked_advantage() TO authenticated;
