-- Safe restaurant refusal workflow and refund bookkeeping.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone;

ALTER TABLE public.order_payments DROP CONSTRAINT IF EXISTS order_payments_status_check;
ALTER TABLE public.order_payments ADD CONSTRAINT order_payments_status_check CHECK (
  status IN (
    'checkout_created', 'requires_payment_method', 'requires_confirmation',
    'requires_action', 'processing', 'requires_capture', 'canceled',
    'succeeded', 'completed', 'failed', 'refunded'
  )
);

CREATE OR REPLACE FUNCTION public.reverse_applied_order_advantage(target_order_id uuid)
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

REVOKE ALL ON FUNCTION public.reverse_applied_order_advantage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reverse_applied_order_advantage(uuid) TO service_role;
