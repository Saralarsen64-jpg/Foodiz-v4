-- Idempotent loyalty credits tied to paid orders.

CREATE TABLE IF NOT EXISTS public.order_loyalty_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points integer NOT NULL CHECK (points >= 0),
  status text NOT NULL DEFAULT 'credited' CHECK (status IN ('credited', 'reversed')),
  credited_at timestamp with time zone NOT NULL DEFAULT now(),
  reversed_at timestamp with time zone
);

ALTER TABLE public.order_loyalty_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_loyalty_credits_select_own" ON public.order_loyalty_credits;
CREATE POLICY "order_loyalty_credits_select_own" ON public.order_loyalty_credits FOR SELECT
  USING (auth.uid() = user_id OR public.current_user_has_role('admin'));

-- Completed orders deployed before this ledger are marked as already processed.
INSERT INTO public.order_loyalty_credits (order_id, user_id, points)
SELECT id, client_id, GREATEST(0, loyalty_fund_cents)
FROM public.orders
WHERE payment_status = 'completed'
ON CONFLICT (order_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.credit_order_loyalty(target_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.reverse_order_loyalty(target_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.credit_order_loyalty(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_order_loyalty(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_order_loyalty(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_order_loyalty(uuid) TO service_role;
