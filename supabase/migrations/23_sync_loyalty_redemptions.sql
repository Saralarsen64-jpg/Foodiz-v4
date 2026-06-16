-- Keep the accounting ledger synchronized when an advantage is applied after order creation.

CREATE OR REPLACE FUNCTION public.sync_ledger_loyalty_redemption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.order_financial_ledger
  SET loyalty_redeemed_cents = CASE WHEN NEW.status = 'applied' THEN NEW.discount_cents ELSE 0 END,
      updated_at = now()
  WHERE order_id = NEW.order_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_ledger_loyalty_redemption ON public.order_advantage_redemptions;
CREATE TRIGGER sync_ledger_loyalty_redemption
AFTER INSERT OR UPDATE OF status, discount_cents ON public.order_advantage_redemptions
FOR EACH ROW EXECUTE FUNCTION public.sync_ledger_loyalty_redemption();

UPDATE public.order_financial_ledger ledger
SET loyalty_redeemed_cents = redemption.discount_cents,
    updated_at = now()
FROM public.order_advantage_redemptions redemption
WHERE redemption.order_id = ledger.order_id AND redemption.status = 'applied';
