-- Phase 2: preserve both the public client price and the private partner price
-- on every order item. New orders write the official Weello client price into
-- unit_price_cents/total_price_cents.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS partner_unit_price_cents integer,
  ADD COLUMN IF NOT EXISTS partner_total_price_cents integer;

UPDATE public.order_items
SET
  partner_unit_price_cents = coalesce(partner_unit_price_cents, unit_price_cents),
  partner_total_price_cents = coalesce(partner_total_price_cents, total_price_cents)
WHERE partner_unit_price_cents IS NULL
   OR partner_total_price_cents IS NULL;

ALTER TABLE public.order_items
  ALTER COLUMN partner_unit_price_cents SET NOT NULL,
  ALTER COLUMN partner_total_price_cents SET NOT NULL;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_partner_unit_price_nonnegative,
  DROP CONSTRAINT IF EXISTS order_items_partner_total_price_nonnegative;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_partner_unit_price_nonnegative
    CHECK (partner_unit_price_cents >= 0),
  ADD CONSTRAINT order_items_partner_total_price_nonnegative
    CHECK (partner_total_price_cents >= 0);

-- A referral becomes payable only when the referred client has a first order
-- that is both paid and accepted by the partner.
CREATE OR REPLACE FUNCTION public.complete_first_paid_referral(target_order_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.complete_first_paid_referral(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_first_paid_referral(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_first_paid_referral(uuid) TO service_role;
