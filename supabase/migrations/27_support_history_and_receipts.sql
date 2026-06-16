-- Support history and reliable client receipt generation.

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.profiles(id);

CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id),
  event_type text NOT NULL CHECK (event_type IN ('created', 'assigned', 'replied', 'resolved', 'closed', 'reopened', 'note')),
  message text,
  previous_status text,
  new_status text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_events_ticket
  ON public.support_ticket_events(ticket_id, created_at DESC);

ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_ticket_events_read_own_or_admin" ON public.support_ticket_events;
CREATE POLICY "support_ticket_events_read_own_or_admin" ON public.support_ticket_events FOR SELECT
  USING (
    public.current_user_has_role('admin')
    OR EXISTS (
      SELECT 1 FROM public.support_tickets ticket
      WHERE ticket.id = ticket_id AND ticket.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.admin_resolve_support_ticket(
  target_ticket_id uuid,
  target_response text,
  target_summary text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ticket public.support_tickets%ROWTYPE;
BEGIN
  IF NOT public.current_user_has_role('admin') THEN
    RAISE EXCEPTION 'Admin required';
  END IF;
  IF length(trim(coalesce(target_response, ''))) < 2 THEN
    RAISE EXCEPTION 'Response required';
  END IF;

  SELECT * INTO ticket
  FROM public.support_tickets
  WHERE id = target_ticket_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  UPDATE public.support_tickets
  SET admin_response = trim(target_response),
      resolution_summary = coalesce(nullif(trim(coalesce(target_summary, '')), ''), trim(target_response)),
      status = 'closed',
      resolved_at = now(),
      resolved_by = auth.uid(),
      updated_at = now()
  WHERE id = target_ticket_id;

  INSERT INTO public.support_ticket_events (
    ticket_id, actor_id, event_type, message, previous_status, new_status
  ) VALUES (
    target_ticket_id, auth.uid(), 'resolved', trim(target_response), ticket.status, 'closed'
  );

  INSERT INTO public.notifications (
    user_id, title, message, type, link, is_read
  ) VALUES (
    ticket.user_id,
    'Réponse du support Foodiz',
    'Votre demande "' || ticket.subject || '" a été traitée.',
    'support',
    CASE ticket.user_role WHEN 'partner' THEN '/partner/support' WHEN 'courier' THEN '/courier/support' ELSE '/client/help-center' END,
    false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_support_ticket(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_support_ticket(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_client_payment_receipt(target_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_row public.orders%ROWTYPE;
  recipient_email text;
  restaurant_name text;
  items jsonb;
  document_no text;
  document_id uuid;
BEGIN
  SELECT * INTO order_row FROM public.orders WHERE id = target_order_id;
  IF NOT FOUND OR order_row.payment_status <> 'completed' THEN
    RETURN NULL;
  END IF;

  SELECT id INTO document_id
  FROM public.financial_documents
  WHERE order_id = order_row.id AND document_type = 'client_payment_receipt';
  IF document_id IS NOT NULL THEN
    RETURN document_id;
  END IF;

  SELECT profile.email INTO recipient_email FROM public.profiles profile WHERE profile.id = order_row.client_id;
  SELECT restaurant.name INTO restaurant_name FROM public.restaurants restaurant WHERE restaurant.id = order_row.restaurant_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'product_name', product.name,
    'quantity', item.quantity,
    'unit_price_cents', item.unit_price_cents,
    'total_price_cents', item.total_price_cents
  ) ORDER BY item.created_at), '[]'::jsonb)
  INTO items
  FROM public.order_items item
  LEFT JOIN public.products product ON product.id = item.product_id
  WHERE item.order_id = order_row.id;

  document_no := 'FDZ-REC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.financial_document_number_seq')::text, 7, '0');
  INSERT INTO public.financial_documents (
    document_number, document_type, recipient_id, recipient_email, order_id, payload_snapshot
  ) VALUES (
    document_no, 'client_payment_receipt', order_row.client_id, recipient_email, order_row.id,
    jsonb_build_object(
      'order_id', order_row.id,
      'restaurant_name', restaurant_name,
      'order_created_at', order_row.created_at,
      'payment_confirmed_at', now(),
      'payment_reference', order_row.stripe_payment_intent_id,
      'delivery_address', order_row.delivery_address,
      'items', items,
      'partner_total_cents', order_row.partner_total_cents,
      'service_fee_cents', order_row.service_fee_cents,
      'delivery_fee_cents', order_row.delivery_fee_cents,
      'advantage_discount_cents', coalesce(order_row.advantage_discount_cents, 0),
      'total_paid_cents', order_row.final_client_total_cents,
      'currency', 'EUR'
    )
  ) RETURNING id INTO document_id;

  RETURN document_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_client_payment_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status <> 'completed' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.payment_status = 'completed' THEN RETURN NEW; END IF;
  PERFORM public.generate_client_payment_receipt(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_client_payment_receipt ON public.orders;
CREATE TRIGGER create_client_payment_receipt
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.create_client_payment_receipt();

REVOKE ALL ON FUNCTION public.generate_client_payment_receipt(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_client_payment_receipt(uuid) TO service_role;
