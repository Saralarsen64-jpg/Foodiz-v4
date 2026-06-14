-- Foodiz+ plans, secure quotas, targeting and campaign performance.

CREATE TABLE IF NOT EXISTS public.foodiz_plus_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  monthly_price_cents integer NOT NULL CHECK (monthly_price_cents > 0),
  yearly_price_cents integer NOT NULL CHECK (yearly_price_cents > 0),
  monthly_campaign_limit integer NOT NULL CHECK (monthly_campaign_limit > 0),
  weekly_campaign_limit integer NOT NULL CHECK (weekly_campaign_limit > 0),
  max_cities_per_campaign integer NOT NULL DEFAULT 1 CHECK (max_cities_per_campaign > 0),
  priority_level integer NOT NULL DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 3),
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO public.foodiz_plus_plans (
  id, name, monthly_price_cents, yearly_price_cents, monthly_campaign_limit,
  weekly_campaign_limit, max_cities_per_campaign, priority_level, features
) VALUES
  ('discovery', 'Découverte', 3999, 40790, 8, 2, 1, 1,
   '["Génération automatique", "Ciblage ville et audience", "Statistiques essentielles"]'::jsonb),
  ('boost', 'Boost', 7999, 81590, 15, 4, 1, 2,
   '["Génération automatique avancée", "Programmation", "Statistiques détaillées", "Priorité haute"]'::jsonb),
  ('domination', 'Domination Locale', 11999, 122390, 25, 7, 5, 3,
   '["Multi-villes", "Programmation avancée", "Ciblage précis", "Priorité maximale", "Recommandations automatiques"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  yearly_price_cents = EXCLUDED.yearly_price_cents,
  monthly_campaign_limit = EXCLUDED.monthly_campaign_limit,
  weekly_campaign_limit = EXCLUDED.weekly_campaign_limit,
  max_cities_per_campaign = EXCLUDED.max_cities_per_campaign,
  priority_level = EXCLUDED.priority_level,
  features = EXCLUDED.features,
  is_active = true,
  updated_at = now();

ALTER TABLE public.partner_subscriptions
  ADD COLUMN IF NOT EXISTS campaigns_used_period integer NOT NULL DEFAULT 0;

UPDATE public.partner_subscriptions
SET plan_id = CASE plan_id
  WHEN 'basic' THEN 'discovery'
  WHEN 'pro' THEN 'boost'
  ELSE plan_id
END
WHERE plan_id IN ('basic', 'pro');

ALTER TABLE public.partner_subscriptions DROP CONSTRAINT IF EXISTS partner_subscriptions_plan_id_fkey;
ALTER TABLE public.partner_subscriptions ADD CONSTRAINT partner_subscriptions_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES public.foodiz_plus_plans(id) NOT VALID;

ALTER TABLE public.partner_subscriptions DROP CONSTRAINT IF EXISTS partner_subscriptions_status_check;
ALTER TABLE public.partner_subscriptions ADD CONSTRAINT partner_subscriptions_status_check
  CHECK (status IN ('incomplete', 'incomplete_expired', 'active', 'past_due', 'unpaid', 'canceled', 'trialing', 'paused'));

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_city text,
  ADD COLUMN IF NOT EXISTS target_audience text NOT NULL DEFAULT 'all_customers',
  ADD COLUMN IF NOT EXISTS template_key text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS recipient_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opened_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS converted_orders_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.partner_subscriptions(id) ON DELETE SET NULL;

ALTER TABLE public.marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_status_check;
ALTER TABLE public.marketing_campaigns ADD CONSTRAINT marketing_campaigns_status_check
  CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed'));

ALTER TABLE public.marketing_campaigns DROP CONSTRAINT IF EXISTS marketing_campaigns_target_audience_check;
ALTER TABLE public.marketing_campaigns ADD CONSTRAINT marketing_campaigns_target_audience_check
  CHECK (target_audience IN ('all_customers', 'new_customers', 'loyal_customers', 'inactive_customers'));

CREATE TABLE IF NOT EXISTS public.marketing_campaign_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  delivered_at timestamp with time zone NOT NULL DEFAULT now(),
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  converted_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_quota
  ON public.marketing_campaigns(restaurant_id, status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_user
  ON public.marketing_campaign_deliveries(user_id, delivered_at DESC);

ALTER TABLE public.foodiz_plus_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaign_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "foodiz_plus_plans_read" ON public.foodiz_plus_plans;
CREATE POLICY "foodiz_plus_plans_read" ON public.foodiz_plus_plans FOR SELECT
  USING (is_active = true OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "campaign_deliveries_client_read" ON public.marketing_campaign_deliveries;
CREATE POLICY "campaign_deliveries_client_read" ON public.marketing_campaign_deliveries FOR SELECT
  USING (auth.uid() = user_id OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "campaigns_select" ON public.marketing_campaigns;
CREATE POLICY "campaigns_select_secure" ON public.marketing_campaigns FOR SELECT
  USING (
    auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id)
    OR public.current_user_has_role('admin')
  );

-- Campaign creation and delivery are service-role only. Partners use the secured API.
DROP POLICY IF EXISTS "campaigns_insert_owner_production" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "campaigns_update_own" ON public.marketing_campaigns;
DROP POLICY IF EXISTS "campaigns_delete_owner_production" ON public.marketing_campaigns;
