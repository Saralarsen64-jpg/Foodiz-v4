-- ============================================================
-- WEELLO MVP HARDENING
-- Aligns the database contract with the current React/Netlify app.
-- Safe to run after the existing 01/02/03 migrations.
-- ============================================================

-- ---------- Existing table compatibility ----------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS ref_code text,
  ADD COLUMN IF NOT EXISTS referral_count integer DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_ref_code_safe
  ON public.profiles(ref_code)
  WHERE ref_code IS NOT NULL;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS cuisine_type text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS points_redeemed_cents integer DEFAULT 0;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link text;

ALTER TABLE public.order_payments
  ALTER COLUMN stripe_payment_intent_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

ALTER TABLE public.order_payments DROP CONSTRAINT IF EXISTS order_payments_status_check;
ALTER TABLE public.order_payments
  ADD CONSTRAINT order_payments_status_check CHECK (
    status IN (
      'checkout_created',
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
      'processing',
      'requires_capture',
      'canceled',
      'succeeded',
      'completed',
      'failed'
    )
  );

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending',
      'accepted',
      'preparing',
      'ready',
      'pickup',
      'picked_up',
      'delivering',
      'in_transit',
      'delivered',
      'cancelled'
    )
  );

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check CHECK (
    payment_status IN ('pending', 'requires_payment_method', 'processing', 'completed', 'failed', 'refunded')
  );

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN ('info', 'order', 'payment', 'alert', 'marketing', 'support')
  );

ALTER TABLE public.partner_applications DROP CONSTRAINT IF EXISTS partner_applications_status_check;
ALTER TABLE public.partner_applications
  ADD CONSTRAINT partner_applications_status_check CHECK (
    status IN ('pending', 'validated', 'missing_documents', 'rejected', 'suspended')
  );

ALTER TABLE public.courier_applications DROP CONSTRAINT IF EXISTS courier_applications_status_check;
ALTER TABLE public.courier_applications
  ADD CONSTRAINT courier_applications_status_check CHECK (
    status IN ('pending', 'validated', 'missing_documents', 'rejected', 'suspended')
  );

ALTER TABLE public.delivery_tracking DROP CONSTRAINT IF EXISTS delivery_tracking_status_check;
ALTER TABLE public.delivery_tracking
  ADD CONSTRAINT delivery_tracking_status_check CHECK (
    status IN ('pending', 'accepted', 'at_restaurant', 'picked_up', 'in_transit', 'at_customer', 'delivered', 'cancelled')
  );

-- ---------- Missing client feature tables ----------

CREATE TABLE IF NOT EXISTS public.client_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Maison',
  full_address text NOT NULL,
  latitude numeric,
  longitude numeric,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

CREATE TABLE IF NOT EXISTS public.client_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  brand text NOT NULL DEFAULT 'Card',
  last_four text NOT NULL CHECK (char_length(last_four) = 4),
  expiry_date text,
  stripe_payment_method_id text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.advantage_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  points_cost integer NOT NULL DEFAULT 0,
  valid_until timestamp with time zone DEFAULT (now() + interval '7 days'),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.advantage_catalog
  ADD COLUMN IF NOT EXISTS value_euros numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_until timestamp with time zone DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();

ALTER TABLE public.advantage_catalog
  ALTER COLUMN valid_until SET DEFAULT (now() + interval '7 days');

CREATE TABLE IF NOT EXISTS public.client_locked_advantages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  points_cost integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_locked_advantages_user
  ON public.client_locked_advantages(user_id);
CREATE INDEX IF NOT EXISTS idx_client_addresses_user ON public.client_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_client_favorites_user ON public.client_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_client_payment_methods_user ON public.client_payment_methods(user_id);

ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advantage_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_locked_advantages ENABLE ROW LEVEL SECURITY;

INSERT INTO public.advantage_catalog (title, description, points_cost, value_euros, valid_until, is_active)
SELECT '-10 % sur votre commande', 'Une remise immédiate sur votre prochaine commande.', 200, 10, now() + interval '7 days', true
WHERE NOT EXISTS (SELECT 1 FROM public.advantage_catalog);

INSERT INTO public.advantage_catalog (title, description, points_cost, value_euros, valid_until, is_active)
SELECT 'Livraison offerte', 'Les frais de livraison sont offerts sur votre prochaine commande.', 150, 0, now() + interval '7 days', true
WHERE NOT EXISTS (SELECT 1 FROM public.advantage_catalog WHERE title = 'Livraison offerte');

INSERT INTO public.advantage_catalog (title, description, points_cost, value_euros, valid_until, is_active)
SELECT 'Dessert offert max 8€', 'Un dessert offert dans la limite de 8 euros.', 800, 8, now() + interval '7 days', true
WHERE NOT EXISTS (SELECT 1 FROM public.advantage_catalog WHERE title = 'Dessert offert max 8€');

-- ---------- RLS policies required by the MVP app ----------

DROP POLICY IF EXISTS "profiles_insert_own_mvp" ON public.profiles;
CREATE POLICY "profiles_insert_own_mvp" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_admin_all_mvp" ON public.profiles;
CREATE POLICY "profiles_admin_all_mvp" ON public.profiles FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "restaurants_insert_owner_mvp" ON public.restaurants;
CREATE POLICY "restaurants_insert_owner_mvp" ON public.restaurants FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "restaurants_update_owner_or_admin_mvp" ON public.restaurants;
CREATE POLICY "restaurants_update_owner_or_admin_mvp" ON public.restaurants FOR UPDATE
  USING (auth.uid() = owner_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK (auth.uid() = owner_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "products_insert_owner_mvp" ON public.products;
CREATE POLICY "products_insert_owner_mvp" ON public.products FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id));

DROP POLICY IF EXISTS "products_update_owner_mvp" ON public.products;
CREATE POLICY "products_update_owner_mvp" ON public.products FOR UPDATE
  USING (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id))
  WITH CHECK (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id));

DROP POLICY IF EXISTS "products_delete_owner_mvp" ON public.products;
CREATE POLICY "products_delete_owner_mvp" ON public.products FOR DELETE
  USING (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id));

DROP POLICY IF EXISTS "orders_insert_client_mvp" ON public.orders;
CREATE POLICY "orders_insert_client_mvp" ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "orders_update_involved_mvp" ON public.orders;
CREATE POLICY "orders_update_involved_mvp" ON public.orders FOR UPDATE
  USING (
    auth.uid() = client_id
    OR auth.uid() = courier_id
    OR auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id)
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    auth.uid() = client_id
    OR auth.uid() = courier_id
    OR auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id)
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "order_items_insert_client_mvp" ON public.order_items;
CREATE POLICY "order_items_insert_client_mvp" ON public.order_items FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT client_id FROM public.orders WHERE id = order_id));

DROP POLICY IF EXISTS "client_wallets_insert_own_mvp" ON public.client_wallets;
CREATE POLICY "client_wallets_insert_own_mvp" ON public.client_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_admin_or_self_mvp" ON public.notifications;
CREATE POLICY "notifications_insert_admin_or_self_mvp" ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "notifications_update_own_mvp" ON public.notifications;
CREATE POLICY "notifications_update_own_mvp" ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "partner_apps_insert_own_mvp" ON public.partner_applications;
CREATE POLICY "partner_apps_insert_own_mvp" ON public.partner_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "partner_apps_update_admin_or_own_mvp" ON public.partner_applications;
CREATE POLICY "partner_apps_update_admin_or_own_mvp" ON public.partner_applications FOR UPDATE
  USING (auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "courier_apps_insert_own_mvp" ON public.courier_applications;
CREATE POLICY "courier_apps_insert_own_mvp" ON public.courier_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "courier_apps_update_admin_or_own_mvp" ON public.courier_applications;
CREATE POLICY "courier_apps_update_admin_or_own_mvp" ON public.courier_applications FOR UPDATE
  USING (auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK (auth.uid() = user_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "admin_broadcasts_insert_admin_mvp" ON public.admin_broadcasts;
CREATE POLICY "admin_broadcasts_insert_admin_mvp" ON public.admin_broadcasts FOR INSERT
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "client_addresses_own_mvp" ON public.client_addresses;
CREATE POLICY "client_addresses_own_mvp" ON public.client_addresses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_favorites_own_mvp" ON public.client_favorites;
CREATE POLICY "client_favorites_own_mvp" ON public.client_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "client_payment_methods_own_mvp" ON public.client_payment_methods;
CREATE POLICY "client_payment_methods_own_mvp" ON public.client_payment_methods FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "advantage_catalog_select_mvp" ON public.advantage_catalog;
CREATE POLICY "advantage_catalog_select_mvp" ON public.advantage_catalog FOR SELECT
  USING (is_active = true OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "client_locked_advantages_own_mvp" ON public.client_locked_advantages;
CREATE POLICY "client_locked_advantages_own_mvp" ON public.client_locked_advantages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
