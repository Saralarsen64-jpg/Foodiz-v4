-- ============================================================
-- WEELLO - STRIPE INTEGRATION TABLES
-- ============================================================

-- 1. ORDER PAYMENTS (Suivi des paiements par commande)
CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  stripe_payment_intent_id text UNIQUE NOT NULL,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'requires_payment_method' CHECK (status IN ('requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'canceled', 'succeeded')),
  client_secret text,
  receipt_email text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_stripe_id ON public.order_payments(stripe_payment_intent_id);

-- 2. PARTNER SUBSCRIPTIONS (Souscriptions Weello+ pour partenaires)
CREATE TABLE IF NOT EXISTS public.partner_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE NOT NULL,
  plan_id text NOT NULL,
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'unpaid', 'canceled', 'trialing')),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamp with time zone,
  last_payment_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_restaurant ON public.partner_subscriptions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.partner_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.partner_subscriptions(status);

-- 3. PAYOUTS (Paiements vers les partenaires/livreurs)
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'EUR',
  stripe_payout_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled')),
  failure_reason text,
  requested_at timestamp with time zone DEFAULT now(),
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS amount_cents integer,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS stripe_payout_id text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS requested_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_payouts_user ON public.payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_stripe_id ON public.payouts(stripe_payout_id);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- ORDER PAYMENTS
DROP POLICY IF EXISTS "order_payments_select_own" ON public.order_payments;
CREATE POLICY "order_payments_select_own" ON public.order_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_payments.order_id 
      AND (auth.uid() = orders.client_id OR auth.uid() = orders.restaurant_id)
    )
  );

-- PARTNER SUBSCRIPTIONS
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.partner_subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.partner_subscriptions FOR SELECT
  USING (
    auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id)
  );

-- PAYOUTS
DROP POLICY IF EXISTS "payouts_select_own" ON public.payouts;
CREATE POLICY "payouts_select_own" ON public.payouts FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- MIGRATION NOTES:
-- Run this after applying the previous migration (02_add_missing_tables.sql)
-- Make sure to update your .env with:
-- - STRIPE_SECRET_KEY
-- - STRIPE_PUBLISHABLE_KEY
-- - STRIPE_WEBHOOK_SECRET
-- - STRIPE_PLAN_BASIC_MONTHLY
-- - STRIPE_PLAN_BASIC_YEARLY
-- - STRIPE_PLAN_PRO_MONTHLY
-- - STRIPE_PLAN_PRO_YEARLY
-- ============================================================
