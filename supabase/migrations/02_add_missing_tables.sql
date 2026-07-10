-- ============================================================
-- WEELLO - ADD MISSING TABLES
-- ============================================================

-- 1. REFERRALS TABLE (Parrainage)
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parrain_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  filleul_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  reward_cents integer DEFAULT 0,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS parrain_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS filleul_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reward_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_referrals_parrain ON public.referrals(parrain_id);
CREATE INDEX IF NOT EXISTS idx_referrals_filleul ON public.referrals(filleul_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(code);

-- 2. PARTNER APPLICATIONS TABLE (Candidature Partenaires)
CREATE TABLE IF NOT EXISTS public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  siret text UNIQUE,
  description text,
  categories text[] DEFAULT '{}',
  phone text,
  email text,
  address text,
  postal_code text,
  city text,
  latitude numeric,
  longitude numeric,
  website text,
  documents_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected', 'suspended')),
  rejection_reason text,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_apps_user ON public.partner_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_apps_status ON public.partner_applications(status);

-- 3. ADMIN BROADCASTS TABLE (Notifications Groupe)
CREATE TABLE IF NOT EXISTS public.admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  message text NOT NULL,
  target_roles text[] NOT NULL DEFAULT '{}',
  is_sent boolean DEFAULT false,
  sent_at timestamp with time zone,
  recipients_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.admin_broadcasts
  ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS target_roles text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS recipients_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_broadcasts_admin ON public.admin_broadcasts(admin_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_sent ON public.admin_broadcasts(is_sent);

-- 4. DELIVERY TRACKING TABLE (Suivi de Livraison)
CREATE TABLE IF NOT EXISTS public.delivery_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  courier_id uuid NOT NULL REFERENCES public.profiles(id),
  pickup_latitude numeric,
  pickup_longitude numeric,
  pickup_at timestamp with time zone,
  current_latitude numeric,
  current_longitude numeric,
  current_location_name text,
  dropoff_latitude numeric,
  dropoff_longitude numeric,
  dropoff_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
  estimated_arrival_at timestamp with time zone,
  actual_delivery_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order ON public.delivery_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_courier ON public.delivery_tracking(courier_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_status ON public.delivery_tracking(status);

-- 5. MARKETING CAMPAIGNS TABLE (Campagnes Marketing Partenaire)
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  discount_percent integer DEFAULT 0,
  discount_cents integer DEFAULT 0,
  min_order_cents integer DEFAULT 0,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_restaurant ON public.marketing_campaigns(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON public.marketing_campaigns(is_active);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- REFERRALS
DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own" ON public.referrals FOR SELECT
  USING (auth.uid() = parrain_id OR auth.uid() = filleul_id);

-- PARTNER APPLICATIONS
DROP POLICY IF EXISTS "partner_apps_select_own" ON public.partner_applications;
CREATE POLICY "partner_apps_select_own" ON public.partner_applications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "partner_apps_select_admin" ON public.partner_applications;
CREATE POLICY "partner_apps_select_admin" ON public.partner_applications FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- ADMIN BROADCASTS
DROP POLICY IF EXISTS "broadcasts_select_own" ON public.admin_broadcasts;
CREATE POLICY "broadcasts_select_own" ON public.admin_broadcasts FOR SELECT
  USING (auth.uid() = admin_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- DELIVERY TRACKING
DROP POLICY IF EXISTS "delivery_tracking_select" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_select" ON public.delivery_tracking FOR SELECT
  USING (
    auth.uid() = courier_id 
    OR (auth.uid() IN (
      SELECT client_id FROM public.orders WHERE id = delivery_tracking.order_id
    ))
    OR (auth.uid() IN (
      SELECT owner_id FROM public.restaurants WHERE id = (
        SELECT restaurant_id FROM public.orders WHERE id = delivery_tracking.order_id
      )
    ))
  );

-- MARKETING CAMPAIGNS
DROP POLICY IF EXISTS "campaigns_select" ON public.marketing_campaigns;
CREATE POLICY "campaigns_select" ON public.marketing_campaigns FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "campaigns_update_own" ON public.marketing_campaigns;
CREATE POLICY "campaigns_update_own" ON public.marketing_campaigns FOR UPDATE
  USING (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id));
