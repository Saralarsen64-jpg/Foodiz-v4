-- ============================================================
-- FOODIZ DATABASE SCHEMA - COMPLETE SETUP
-- ============================================================

-- 1. PROFILES TABLE (Auth + User Info)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'partner', 'courier', 'admin')),
  email text,
  first_name text,
  last_name text,
  full_name text,
  phone text,
  address text,
  postal_code text,
  city text,
  latitude numeric,
  longitude numeric,
  avatar_url text,
  status text DEFAULT 'active',
  ref_code text,
  referral_count integer DEFAULT 0,
  cgu_accepted boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. RESTAURANTS TABLE (Partner Establishments)
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
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  partner_price_cents integer NOT NULL,
  image_url text,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. ORDERS TABLE (Complete Order Data)
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  courier_id uuid REFERENCES profiles(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'pickup', 'delivering', 'delivered', 'cancelled')),
  
  -- PRICING (in cents to avoid float issues)
  final_client_total_cents integer NOT NULL, -- Total that client pays
  partner_total_cents integer NOT NULL,      -- What restaurant gets (before fees)
  service_fee_cents integer DEFAULT 0,       -- Foodiz platform fee
  internal_fees_cents integer DEFAULT 0,     -- Internal processing
  delivery_fee_cents integer DEFAULT 0,      -- Delivery cost
  courier_earnings_cents integer DEFAULT 0,  -- Base courier pay
  courier_prime_fund_cents integer DEFAULT 0,-- Prime fund contribution
  loyalty_fund_cents integer DEFAULT 0,      -- Loyalty program fund
  referral_fund_cents integer DEFAULT 0,     -- Referral rewards fund
  foodiz_revenue_cents integer DEFAULT 0,    -- Foodiz net revenue
  system_reserve_cents integer DEFAULT 0,    -- System reserve
  
  -- DELIVERY INFO
  delivery_address text,
  client_latitude numeric,
  client_longitude numeric,
  delivery_code text UNIQUE,
  estimated_time_mins integer,
  
  -- TIMESTAMPS
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  delivered_at timestamp with time zone
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL,
  total_price_cents integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. CLIENT WALLETS (Points & Loyalty)
CREATE TABLE IF NOT EXISTS client_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  points_balance integer DEFAULT 0,
  loyalty_tier text DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 7. COURIER APPLICATIONS
CREATE TABLE IF NOT EXISTS courier_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected', 'suspended')),
  city text,
  vehicle_type text CHECK (vehicle_type IN ('bike', 'scooter', 'car', 'motorcycle')),
  documents_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 8. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 9. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info' CHECK (type IN ('info', 'order', 'payment', 'alert')),
  is_read boolean DEFAULT false,
  related_order_id uuid REFERENCES orders(id),
  created_at timestamp with time zone DEFAULT now()
);

-- 10. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id),
  restaurant_rating integer CHECK (restaurant_rating >= 1 AND restaurant_rating <= 5),
  courier_rating integer CHECK (courier_rating >= 1 AND courier_rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ref_code text;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_ref_code ON profiles(ref_code);
CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON restaurants(owner_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_products_restaurant ON products(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_courier ON orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_client_wallets_user ON client_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_courier_apps_user ON courier_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client ON reviews(client_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - BASIC POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view their own, public can view some fields
DROP POLICY IF EXISTS "Profiles are viewable by user" ON profiles;
CREATE POLICY "Profiles are viewable by user" ON profiles FOR SELECT
  USING (auth.uid() = id OR role != 'admin');

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Orders: Clients can view their own, couriers can view assigned, admins all
DROP POLICY IF EXISTS "Orders viewable by involved parties" ON orders;
CREATE POLICY "Orders viewable by involved parties" ON orders FOR SELECT
  USING (
    auth.uid() = client_id 
    OR auth.uid() = courier_id 
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR auth.uid() IN (SELECT owner_id FROM restaurants WHERE id = orders.restaurant_id)
  );

-- Restaurants: Anyone can view active, owners can view/edit their own
DROP POLICY IF EXISTS "Active restaurants viewable by all" ON restaurants;
CREATE POLICY "Active restaurants viewable by all" ON restaurants FOR SELECT
  USING (is_active = true OR auth.uid() = owner_id);

-- Products: Anyone can view from active restaurants
DROP POLICY IF EXISTS "Products viewable from active restaurants" ON products;
CREATE POLICY "Products viewable from active restaurants" ON products FOR SELECT
  USING (
    (SELECT is_active FROM restaurants WHERE id = restaurant_id) = true
    OR auth.uid() IN (SELECT owner_id FROM restaurants WHERE id = restaurant_id)
  );
