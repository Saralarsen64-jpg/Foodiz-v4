-- Partner-funded product offers and deterministic realtime delivery tracking.
-- This migration is additive and does not activate or modify existing products.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS promotion_label text,
  ADD COLUMN IF NOT EXISTS promotion_partner_price_cents integer,
  ADD COLUMN IF NOT EXISTS promotion_starts_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS promotion_ends_at timestamp with time zone;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_promotion_price_check,
  DROP CONSTRAINT IF EXISTS products_promotion_dates_check,
  DROP CONSTRAINT IF EXISTS products_promotion_label_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_promotion_price_check CHECK (
    promotion_partner_price_cents IS NULL
    OR (
      promotion_partner_price_cents >= 50
      AND promotion_partner_price_cents < partner_price_cents
    )
  ),
  ADD CONSTRAINT products_promotion_dates_check CHECK (
    promotion_starts_at IS NULL
    OR promotion_ends_at IS NULL
    OR promotion_ends_at > promotion_starts_at
  ),
  ADD CONSTRAINT products_promotion_label_check CHECK (
    promotion_label IS NULL OR char_length(trim(promotion_label)) BETWEEN 2 AND 40
  );

CREATE INDEX IF NOT EXISTS idx_products_active_promotions
  ON public.products(restaurant_id, promotion_starts_at, promotion_ends_at)
  WHERE is_active = true AND promotion_partner_price_cents IS NOT NULL;

ALTER TABLE public.delivery_tracking REPLICA IDENTITY FULL;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'delivery_tracking'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_tracking;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.service_area_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  city text NOT NULL,
  postal_code text,
  latitude numeric,
  longitude numeric,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'reviewing', 'planned', 'opened', 'closed')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, city)
);

ALTER TABLE public.service_area_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_area_requests_client_read" ON public.service_area_requests;
CREATE POLICY "service_area_requests_client_read"
ON public.service_area_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "service_area_requests_client_insert" ON public.service_area_requests;
CREATE POLICY "service_area_requests_client_insert"
ON public.service_area_requests FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.current_user_has_role('client')
);

DROP POLICY IF EXISTS "service_area_requests_admin_update" ON public.service_area_requests;
CREATE POLICY "service_area_requests_admin_update"
ON public.service_area_requests FOR UPDATE TO authenticated
USING (public.current_user_has_role('admin'))
WITH CHECK (public.current_user_has_role('admin'));

CREATE INDEX IF NOT EXISTS idx_service_area_requests_status_city
  ON public.service_area_requests(status, city, created_at DESC);
