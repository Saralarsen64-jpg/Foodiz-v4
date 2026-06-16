-- Auditable order allocations, weekly settlement statements and admin access.

CREATE SEQUENCE IF NOT EXISTS public.settlement_document_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.order_financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  partner_user_id uuid NOT NULL REFERENCES public.profiles(id),
  courier_id uuid REFERENCES public.profiles(id),
  client_collected_cents integer NOT NULL DEFAULT 0,
  advantage_funded_cents integer NOT NULL DEFAULT 0,
  partner_cents integer NOT NULL DEFAULT 0,
  delivery_fee_cents integer NOT NULL DEFAULT 0,
  service_fee_cents integer NOT NULL DEFAULT 0,
  courier_earnings_cents integer NOT NULL DEFAULT 0,
  courier_prime_cents integer NOT NULL DEFAULT 0,
  foodiz_revenue_cents integer NOT NULL DEFAULT 0,
  internal_fees_cents integer NOT NULL DEFAULT 0,
  loyalty_fund_cents integer NOT NULL DEFAULT 0,
  loyalty_redeemed_cents integer NOT NULL DEFAULT 0,
  referral_fund_cents integer NOT NULL DEFAULT 0,
  system_reserve_cents integer NOT NULL DEFAULT 0,
  payment_status text NOT NULL,
  order_status text NOT NULL,
  paid_at timestamp with time zone,
  delivered_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (
    client_collected_cents + advantage_funded_cents =
    partner_cents + delivery_fee_cents + service_fee_cents + courier_earnings_cents
    + courier_prime_cents + foodiz_revenue_cents + internal_fees_cents
    + loyalty_fund_cents + referral_fund_cents + system_reserve_cents
  )
);

CREATE INDEX IF NOT EXISTS idx_financial_ledger_delivered ON public.order_financial_ledger(delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_partner ON public.order_financial_ledger(partner_user_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_ledger_courier ON public.order_financial_ledger(courier_id, delivered_at DESC);

CREATE TABLE IF NOT EXISTS public.settlement_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text NOT NULL UNIQUE,
  beneficiary_id uuid NOT NULL REFERENCES public.profiles(id),
  beneficiary_type text NOT NULL CHECK (beneficiary_type IN ('partner', 'courier')),
  beneficiary_name text NOT NULL,
  legal_identifier text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'paid', 'cancelled')),
  payment_method text NOT NULL DEFAULT 'manual_bank_transfer' CHECK (payment_method IN ('manual_bank_transfer', 'stripe_connect')),
  payment_reference text,
  notes text,
  generated_by uuid REFERENCES public.profiles(id),
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  paid_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.settlement_statement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES public.settlement_statements(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  allocation_type text NOT NULL CHECK (allocation_type IN ('partner', 'courier')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(order_id, allocation_type)
);

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS settlement_id uuid REFERENCES public.settlement_statements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS beneficiary_type text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date;

CREATE OR REPLACE FUNCTION public.sync_order_financial_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS sync_order_financial_ledger ON public.orders;
CREATE TRIGGER sync_order_financial_ledger
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_order_financial_ledger();

INSERT INTO public.order_financial_ledger (
  order_id, client_id, restaurant_id, partner_user_id, courier_id,
  client_collected_cents, advantage_funded_cents, partner_cents,
  delivery_fee_cents, service_fee_cents, courier_earnings_cents,
  courier_prime_cents, foodiz_revenue_cents, internal_fees_cents,
  loyalty_fund_cents, loyalty_redeemed_cents, referral_fund_cents,
  system_reserve_cents, payment_status, order_status, paid_at, delivered_at
)
SELECT
  o.id, o.client_id, o.restaurant_id, r.owner_id, o.courier_id,
  o.final_client_total_cents, coalesce(o.advantage_discount_cents, 0), o.partner_total_cents,
  coalesce(o.delivery_fee_cents, 0), coalesce(o.service_fee_cents, 0), coalesce(o.courier_earnings_cents, 0),
  coalesce(o.courier_prime_fund_cents, 0), coalesce(o.foodiz_revenue_cents, 0), coalesce(o.internal_fees_cents, 0),
  coalesce(o.loyalty_fund_cents, 0), coalesce(redemption.discount_cents, 0), coalesce(o.referral_fund_cents, 0),
  coalesce(o.system_reserve_cents, 0), o.payment_status, o.status, o.updated_at, o.delivered_at
FROM public.orders o
JOIN public.restaurants r ON r.id = o.restaurant_id
LEFT JOIN public.order_advantage_redemptions redemption ON redemption.order_id = o.id AND redemption.status = 'applied'
WHERE o.payment_status IN ('completed', 'refunded')
ON CONFLICT (order_id) DO NOTHING;

ALTER TABLE public.order_financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_statement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_ledger_admin_read" ON public.order_financial_ledger FOR SELECT
  USING (public.current_user_has_role('admin'));
CREATE POLICY "settlement_admin_all" ON public.settlement_statements FOR ALL
  USING (public.current_user_has_role('admin')) WITH CHECK (public.current_user_has_role('admin'));
CREATE POLICY "settlement_beneficiary_read" ON public.settlement_statements FOR SELECT
  USING (auth.uid() = beneficiary_id);
CREATE POLICY "settlement_items_admin_read" ON public.settlement_statement_items FOR SELECT
  USING (public.current_user_has_role('admin'));
CREATE POLICY "settlement_items_beneficiary_read" ON public.settlement_statement_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.settlement_statements s WHERE s.id = statement_id AND s.beneficiary_id = auth.uid()));

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.partner_subscriptions;
CREATE POLICY "subscriptions_select_own_or_admin" ON public.partner_subscriptions FOR SELECT
  USING (
    auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id)
    OR public.current_user_has_role('admin')
  );

DROP POLICY IF EXISTS "payouts_select_own" ON public.payouts;
CREATE POLICY "payouts_select_own_or_admin" ON public.payouts FOR SELECT
  USING (auth.uid() = user_id OR public.current_user_has_role('admin'));

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
  coalesce(sum(system_reserve_cents), 0)::bigint AS system_reserve_cents
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
  null::text AS legal_identifier,
  count(*)::integer AS order_count,
  sum(ledger.delivery_fee_cents + ledger.courier_earnings_cents + ledger.courier_prime_cents)::bigint AS amount_cents,
  min(ledger.delivered_at)::date AS first_delivery_date,
  max(ledger.delivered_at)::date AS last_delivery_date
FROM public.order_financial_ledger ledger
JOIN public.profiles profile ON profile.id = ledger.courier_id
WHERE ledger.order_status = 'delivered'
  AND ledger.payment_status = 'completed'
  AND ledger.courier_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.settlement_statement_items item
    JOIN public.settlement_statements statement ON statement.id = item.statement_id
    WHERE item.order_id = ledger.order_id AND item.allocation_type = 'courier' AND statement.status <> 'cancelled'
  )
GROUP BY ledger.courier_id, profile.full_name, profile.email;

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
    SELECT coalesce(p.full_name, p.email, 'Livreur Foodiz') INTO beneficiary_name FROM public.profiles p WHERE p.id = target_beneficiary_id;
    SELECT coalesce(sum(ledger.delivery_fee_cents + ledger.courier_earnings_cents + ledger.courier_prime_cents), 0)::integer INTO total_amount
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
    SELECT statement_id, ledger.order_id, 'courier', ledger.delivery_fee_cents + ledger.courier_earnings_cents + ledger.courier_prime_cents
    FROM public.order_financial_ledger ledger
    WHERE ledger.courier_id = target_beneficiary_id AND ledger.order_status = 'delivered' AND ledger.payment_status = 'completed'
      AND ledger.delivered_at::date BETWEEN target_period_start AND target_period_end
      AND NOT EXISTS (SELECT 1 FROM public.settlement_statement_items i JOIN public.settlement_statements s ON s.id = i.statement_id WHERE i.order_id = ledger.order_id AND i.allocation_type = 'courier' AND s.status <> 'cancelled');
  END IF;
  RETURN statement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_settlement_paid(target_statement_id uuid, target_payment_reference text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.create_weekly_settlement(uuid, text, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_settlement_paid(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_weekly_settlement(uuid, text, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_settlement_paid(uuid, text) TO authenticated;
