-- Client-controlled handling of unavailable items.
-- A partner may only propose a replacement; the client decides whether to accept it
-- or receive a refund for that specific item.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS missing_item_preference text NOT NULL DEFAULT 'ask_before_replacement',
  ADD COLUMN IF NOT EXISTS partial_refunded_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_missing_item_preference_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_missing_item_preference_check
  CHECK (missing_item_preference IN ('ask_before_replacement', 'refund_unavailable'));

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS replacement_product_id uuid REFERENCES public.products(id);

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_fulfillment_status_check;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_fulfillment_status_check
  CHECK (fulfillment_status IN ('available', 'replacement_proposed', 'replaced', 'refunded'));

ALTER TABLE public.order_payments
  DROP CONSTRAINT IF EXISTS order_payments_status_check;
ALTER TABLE public.order_payments
  ADD CONSTRAINT order_payments_status_check CHECK (
    status IN (
      'checkout_created', 'requires_payment_method', 'requires_confirmation',
      'requires_action', 'processing', 'requires_capture', 'canceled',
      'succeeded', 'completed', 'failed', 'partially_refunded', 'refunded'
    )
  );

CREATE TABLE IF NOT EXISTS public.order_item_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL UNIQUE REFERENCES public.order_items(id) ON DELETE CASCADE,
  original_product_id uuid NOT NULL REFERENCES public.products(id),
  proposed_product_id uuid REFERENCES public.products(id),
  status text NOT NULL DEFAULT 'proposed',
  original_client_total_cents integer NOT NULL CHECK (original_client_total_cents >= 0),
  original_partner_total_cents integer NOT NULL CHECK (original_partner_total_cents >= 0),
  refund_amount_cents integer NOT NULL DEFAULT 0 CHECK (refund_amount_cents >= 0),
  stripe_refund_id text UNIQUE,
  partner_note text,
  proposed_at timestamp with time zone NOT NULL DEFAULT now(),
  client_decided_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT order_item_resolutions_status_check CHECK (
    status IN ('proposed', 'refund_processing', 'replaced', 'refunded')
  )
);

CREATE INDEX IF NOT EXISTS idx_order_item_resolutions_order ON public.order_item_resolutions(order_id);

ALTER TABLE public.order_item_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_item_resolutions_select_involved" ON public.order_item_resolutions;
CREATE POLICY "order_item_resolutions_select_involved" ON public.order_item_resolutions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      LEFT JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id
        AND (
          auth.uid() IN (o.client_id, o.courier_id, r.owner_id)
          OR public.current_user_has_role('admin')
        )
    )
  );

CREATE OR REPLACE FUNCTION public.touch_order_item_resolution()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_order_item_resolution ON public.order_item_resolutions;
CREATE TRIGGER touch_order_item_resolution
BEFORE UPDATE ON public.order_item_resolutions
FOR EACH ROW EXECUTE FUNCTION public.touch_order_item_resolution();

CREATE OR REPLACE FUNCTION public.finalize_order_item_refund(
  target_resolution_id uuid,
  refund_cents integer,
  stripe_refund_reference text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolution_row public.order_item_resolutions%ROWTYPE;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Service role required';
  END IF;
  IF refund_cents < 0 THEN RAISE EXCEPTION 'Invalid refund amount'; END IF;

  SELECT * INTO resolution_row
  FROM public.order_item_resolutions
  WHERE id = target_resolution_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resolution not found'; END IF;
  IF resolution_row.status = 'refunded' THEN RETURN; END IF;
  IF resolution_row.status <> 'refund_processing' THEN
    RAISE EXCEPTION 'Resolution is not being refunded';
  END IF;

  UPDATE public.order_item_resolutions
  SET status = 'refunded', refund_amount_cents = refund_cents,
      stripe_refund_id = stripe_refund_reference,
      client_decided_at = coalesce(client_decided_at, now()), resolved_at = now()
  WHERE id = target_resolution_id;

  UPDATE public.order_items
  SET fulfillment_status = 'refunded'
  WHERE id = resolution_row.order_item_id;

  UPDATE public.orders
  SET partial_refunded_cents = partial_refunded_cents + refund_cents,
      partner_total_cents = greatest(0, partner_total_cents - resolution_row.original_partner_total_cents),
      updated_at = now()
  WHERE id = resolution_row.order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_order_item_refund(uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_order_item_refund(uuid, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_order_item_refund(uuid, integer, text) TO service_role;
