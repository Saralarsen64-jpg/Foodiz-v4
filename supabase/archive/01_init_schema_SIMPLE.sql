-- ============================================================
-- FOODIZ DATABASE SCHEMA - SIMPLIFIED & FIXED
-- ============================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- 2. RESTAURANTS TABLE
CREATE TABLE IF NOT EXISTS public.restaurants (
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
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),
  siret text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
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

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  courier_id uuid REFERENCES public.profiles(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'pickup', 'delivering', 'delivered', 'cancelled')),
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

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL,
  total_price_cents integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. CLIENT WALLETS
CREATE TABLE IF NOT EXISTS public.client_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_balance integer DEFAULT 0,
  loyalty_tier text DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 7. COURIER APPLICATIONS
CREATE TABLE IF NOT EXISTS public.courier_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected', 'suspended')),
  city text,
  vehicle_type text CHECK (vehicle_type IN ('bike', 'scooter', 'car', 'motorcycle')),
  documents_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 8. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 9. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info' CHECK (type IN ('info', 'order', 'payment', 'alert')),
  is_read boolean DEFAULT false,
  related_order_id uuid REFERENCES public.orders(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 10. REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id),
  restaurant_rating integer CHECK (restaurant_rating >= 1 AND restaurant_rating <= 5),
  courier_rating integer CHECK (courier_rating >= 1 AND courier_rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON public.restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON public.restaurants(status);
CREATE INDEX IF NOT EXISTS idx_products_restaurant ON public.products(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_courier ON public.orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_client_wallets_user ON public.client_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_courier_apps_user ON public.courier_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
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

-- Profiles: Users can view and update their own
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Orders: Clients/couriers/partners can view related orders
CREATE POLICY "Users can view related orders" ON public.orders FOR SELECT
  USING (
    auth.uid() = client_id 
    OR auth.uid() = courier_id
    OR (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = orders.restaurant_id))
  );

-- Restaurants: Owners can view/edit their own
CREATE POLICY "Partners can view own restaurant" ON public.restaurants FOR SELECT
  USING (auth.uid() = owner_id);

-- Products: View from owned restaurant
CREATE POLICY "Can view products" ON public.products FOR SELECT
  USING (true);
