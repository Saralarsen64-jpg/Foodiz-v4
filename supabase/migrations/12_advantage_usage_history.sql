-- Record confirmed advantage usage in the Weello Club history.

CREATE OR REPLACE FUNCTION public.apply_order_advantage(target_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    coalesce(catalog_row.title, 'Avantage Weello Club'),
    catalog_row.description,
    redemption.points_cost,
    'USED-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    'used', now(), now()
  );

  DELETE FROM public.client_locked_advantages WHERE id = redemption.locked_advantage_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_order_advantage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_order_advantage(uuid) TO service_role;
