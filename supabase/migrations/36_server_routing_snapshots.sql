-- Server-owned route snapshots used by checkout, delivery pricing and dispatch.
-- The client never supplies these values and never receives provider secrets.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_route_distance_meters integer,
  ADD COLUMN IF NOT EXISTS delivery_route_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS delivery_route_provider text,
  ADD COLUMN IF NOT EXISTS delivery_route_is_fallback boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_route_calculated_at timestamptz;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_delivery_route_distance_check,
  DROP CONSTRAINT IF EXISTS orders_delivery_route_duration_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_route_distance_check
    CHECK (
      delivery_route_distance_meters IS NULL
      OR delivery_route_distance_meters >= 0
    ),
  ADD CONSTRAINT orders_delivery_route_duration_check
    CHECK (
      delivery_route_duration_seconds IS NULL
      OR delivery_route_duration_seconds > 0
    );

COMMENT ON COLUMN public.orders.delivery_route_distance_meters IS
  'Server-calculated road distance used for the delivery fee. Haversine only when provider fallback is explicitly recorded.';
COMMENT ON COLUMN public.orders.delivery_route_duration_seconds IS
  'Server-calculated driving duration. Null when only straight-line fallback was available.';
COMMENT ON COLUMN public.orders.delivery_route_provider IS
  'Routing provider that produced the snapshot: openrouteservice, osrm or haversine.';
COMMENT ON COLUMN public.orders.delivery_route_is_fallback IS
  'True when the primary provider failed and the temporary straight-line fallback was used.';

CREATE INDEX IF NOT EXISTS idx_orders_delivery_route_fallback
  ON public.orders(delivery_route_is_fallback, created_at DESC)
  WHERE delivery_route_is_fallback = true;
