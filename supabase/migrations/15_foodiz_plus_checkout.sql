-- Stripe Checkout references for reliable Weello+ billing and portal access.

ALTER TABLE public.partner_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

CREATE INDEX IF NOT EXISTS idx_partner_subscriptions_customer
  ON public.partner_subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_subscriptions_checkout_session
  ON public.partner_subscriptions(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
