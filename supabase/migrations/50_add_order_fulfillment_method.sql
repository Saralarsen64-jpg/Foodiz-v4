ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_method text NOT NULL DEFAULT 'delivery';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_fulfillment_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_fulfillment_method_check
  CHECK (fulfillment_method IN ('delivery', 'pickup'));

CREATE INDEX IF NOT EXISTS idx_orders_ready_delivery_dispatch
  ON public.orders(status, fulfillment_method, courier_id)
  WHERE status = 'ready' AND courier_id IS NULL;
