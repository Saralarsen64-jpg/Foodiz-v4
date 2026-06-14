-- Secure delivery confirmation and courier availability.

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS delivery_code_hash;

CREATE TABLE IF NOT EXISTS public.delivery_code_verifications (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  code_hash text NOT NULL CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- No client policy is created: only server-side service-role functions can access hashes.
ALTER TABLE public.delivery_code_verifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.client_delivery_codes (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (code ~ '^[0-9]{6}$'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_delivery_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_delivery_codes_select_own" ON public.client_delivery_codes;
CREATE POLICY "client_delivery_codes_select_own" ON public.client_delivery_codes FOR SELECT
  USING (auth.uid() = client_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS courier_online boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_available_courier
  ON public.orders(status, courier_id)
  WHERE status = 'ready' AND courier_id IS NULL;
