-- ============================================================
-- FOODIZ DATABASE SCHEMA - COMPLETELY FRESH START
-- ============================================================
-- Drop existing tables in correct order (respecting foreign keys)
-- ============================================================

DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.courier_applications CASCADE;
DROP TABLE IF EXISTS public.client_wallets CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.restaurants CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================
-- CREATE TABLES
-- ============================================================

-- 1. PROFILES TABLE (Users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'partner', 'courier', 'admin')),
  email text,
  first_name text,
  last_name text,
  phone text,
  address text,
  postal_code text,
  city text,
  latitude numeric,
  longitude numeric,
  avatar_url text,
  cgu_accepted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. RESTAURANTS TABLE (Partner Establishments)
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  phone text,
  address text,
  postal_code text,
  city text,
  latitude numeric,
  longitude numeric,
  cover_image text,
  logo_image text,
  is_active boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  siret text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. PRODUCTS TABLE (Menu Items)
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  partner_price_cents integer NOT NULL,
  image_url text,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. ORDERS TABLE (Complete Order Data with Economic Model)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  courier_id uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'pickup', 'delivering', 'delivered', 'cancelled')),
  final_client_total_cents integer NOT NULL,
  partner_total_cents integer NOT NULL,
  service_fee_cents integer DEFAULT 0,
  internal_fees_cents integer DEFAULT 0,
  delivery_fee_cents integer DEFAULT 0,
  courier_earnings_cents integer DEFAULT 0,
  courier_prime_fund_cents integer DEFAULT 0,
  loyalty_fund_cents integer DEFAULT 0,
  referral_fund_cents integer DEFAULT 0,
  foodiz_revenue_cents integer DEFAULT 0,
  system_reserve_cents integer DEFAULT 0,
  delivery_address text,
  client_latitude numeric,
  client_longitude numeric,
  delivery_code text UNIQUE,
  estimated_time_mins integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  delivered_at timestamp with time zone
);

-- 5. ORDER ITEMS TABLE (Line Items in Orders)
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL,
  total_price_cents integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. CLIENT WALLETS (Loyalty Points)
CREATE TABLE public.client_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_balance integer DEFAULT 0,
  loyalty_tier text NOT NULL DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 7. COURIER APPLICATIONS (Courier Validation)
CREATE TABLE public.courier_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected', 'suspended')),
  city text,
  vehicle_type text CHECK (vehicle_type IN ('bike', 'scooter', 'car', 'motorcycle')),
  documents_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 8. SUPPORT TICKETS
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 9. NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'order', 'payment', 'alert')),
  is_read boolean DEFAULT false,
  related_order_id uuid REFERENCES public.orders(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 10. REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id),
  restaurant_rating integer CHECK (restaurant_rating >= 1 AND restaurant_rating <= 5),
  courier_rating integer CHECK (courier_rating >= 1 AND courier_rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- CREATE INDEXES
-- ============================================================

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_restaurants_owner ON public.restaurants(owner_id);
CREATE INDEX idx_restaurants_status ON public.restaurants(status);
CREATE INDEX idx_products_restaurant ON public.products(restaurant_id);
CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX idx_orders_courier ON public.orders(courier_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_client_wallets_user ON public.client_wallets(user_id);
CREATE INDEX idx_courier_apps_user ON public.courier_applications(user_id);
CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CREATE ROW LEVEL SECURITY POLICIES
-- ============================================================

-- PROFILES: Users can view and update their own
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RESTAURANTS: Partners can view/edit their own
CREATE POLICY "restaurants_select_own" ON public.restaurants FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "restaurants_update_own" ON public.restaurants FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "restaurants_select_active" ON public.restaurants FOR SELECT
  USING (is_active = true);

-- PRODUCTS: Public read
CREATE POLICY "products_select" ON public.products FOR SELECT
  USING (true);

-- ORDERS: Clients, couriers, and partners can view their related orders
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT
  USING (
    auth.uid() = client_id 
    OR auth.uid() = courier_id
    OR (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = orders.restaurant_id))
  );

CREATE POLICY "orders_insert" ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "orders_update_own" ON public.orders FOR UPDATE
  USING (
    auth.uid() = client_id 
    OR auth.uid() = courier_id
    OR (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = orders.restaurant_id))
  );

-- ORDER ITEMS: Access through orders
CREATE POLICY "order_items_select" ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders WHERE 
        id = order_items.order_id AND (
          auth.uid() = client_id 
          OR auth.uid() = courier_id
          OR (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = orders.restaurant_id))
        )
    )
  );

-- CLIENT WALLETS: Users can view their own
CREATE POLICY "client_wallets_select_own" ON public.client_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "client_wallets_update_own" ON public.client_wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- COURIER APPLICATIONS: Users can view their own
CREATE POLICY "courier_apps_select_own" ON public.courier_applications FOR SELECT
  USING (auth.uid() = user_id);

-- SUPPORT TICKETS: Users can view their own
CREATE POLICY "support_tickets_select_own" ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "support_tickets_insert" ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- NOTIFICATIONS: Users can view their own
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- REVIEWS: Users can view all reviews
CREATE POLICY "reviews_select" ON public.reviews FOR SELECT
  USING (true);

-- ============================================================
-- DONE
-- ============================================================
