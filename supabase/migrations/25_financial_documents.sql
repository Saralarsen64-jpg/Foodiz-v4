-- Immutable financial documents and email delivery history.

CREATE SEQUENCE IF NOT EXISTS public.financial_document_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.financial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number text NOT NULL UNIQUE,
  document_type text NOT NULL CHECK (document_type IN ('client_payment_receipt', 'settlement_statement')),
  recipient_id uuid NOT NULL REFERENCES public.profiles(id),
  recipient_email text,
  order_id uuid REFERENCES public.orders(id) ON DELETE RESTRICT,
  settlement_id uuid REFERENCES public.settlement_statements(id) ON DELETE RESTRICT,
  payload_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'email_failed')),
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_emailed_at timestamp with time zone,
  CHECK (
    (document_type = 'client_payment_receipt' AND order_id IS NOT NULL AND settlement_id IS NULL)
    OR (document_type = 'settlement_statement' AND settlement_id IS NOT NULL AND order_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_document_order_receipt
  ON public.financial_documents(order_id) WHERE document_type = 'client_payment_receipt';
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_document_settlement
  ON public.financial_documents(settlement_id) WHERE document_type = 'settlement_statement';
CREATE INDEX IF NOT EXISTS idx_financial_documents_recipient
  ON public.financial_documents(recipient_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS public.financial_document_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.financial_documents(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  provider_message_id text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_document_email_events
  ON public.financial_document_email_events(document_id, created_at DESC);

ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_document_email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_documents_read_own_or_admin" ON public.financial_documents FOR SELECT
  USING (auth.uid() = recipient_id OR public.current_user_has_role('admin'));
CREATE POLICY "financial_document_events_read_own_or_admin" ON public.financial_document_email_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.financial_documents document
    WHERE document.id = document_id
      AND (document.recipient_id = auth.uid() OR public.current_user_has_role('admin'))
  ));

CREATE OR REPLACE FUNCTION public.create_client_payment_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_email text;
  restaurant_name text;
  items jsonb;
  document_no text;
BEGIN
  IF NEW.payment_status <> 'completed' OR OLD.payment_status = 'completed' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.financial_documents WHERE order_id = NEW.id AND document_type = 'client_payment_receipt') THEN RETURN NEW; END IF;

  SELECT profile.email INTO recipient_email FROM public.profiles profile WHERE profile.id = NEW.client_id;
  SELECT restaurant.name INTO restaurant_name FROM public.restaurants restaurant WHERE restaurant.id = NEW.restaurant_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'product_name', product.name,
    'quantity', item.quantity,
    'unit_price_cents', item.unit_price_cents,
    'total_price_cents', item.total_price_cents
  ) ORDER BY item.created_at), '[]'::jsonb)
  INTO items
  FROM public.order_items item
  LEFT JOIN public.products product ON product.id = item.product_id
  WHERE item.order_id = NEW.id;

  document_no := 'FDZ-REC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.financial_document_number_seq')::text, 7, '0');
  INSERT INTO public.financial_documents (
    document_number, document_type, recipient_id, recipient_email, order_id, payload_snapshot
  ) VALUES (
    document_no, 'client_payment_receipt', NEW.client_id, recipient_email, NEW.id,
    jsonb_build_object(
      'order_id', NEW.id,
      'restaurant_name', restaurant_name,
      'order_created_at', NEW.created_at,
      'payment_confirmed_at', now(),
      'payment_reference', NEW.stripe_payment_intent_id,
      'delivery_address', NEW.delivery_address,
      'items', items,
      'partner_total_cents', NEW.partner_total_cents,
      'service_fee_cents', NEW.service_fee_cents,
      'delivery_fee_cents', NEW.delivery_fee_cents,
      'advantage_discount_cents', coalesce(NEW.advantage_discount_cents, 0),
      'total_paid_cents', NEW.final_client_total_cents,
      'currency', 'EUR'
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_client_payment_receipt ON public.orders;
CREATE TRIGGER create_client_payment_receipt
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.create_client_payment_receipt();

CREATE OR REPLACE FUNCTION public.create_paid_settlement_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_email text;
  items jsonb;
BEGIN
  IF NEW.status <> 'paid' OR OLD.status = 'paid' THEN RETURN NEW; END IF;
  SELECT profile.email INTO recipient_email FROM public.profiles profile WHERE profile.id = NEW.beneficiary_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'order_id', item.order_id,
    'delivered_at', orders.delivered_at,
    'amount_cents', item.amount_cents,
    'allocation_type', item.allocation_type
  ) ORDER BY orders.delivered_at), '[]'::jsonb)
  INTO items
  FROM public.settlement_statement_items item
  JOIN public.orders orders ON orders.id = item.order_id
  WHERE item.statement_id = NEW.id;

  INSERT INTO public.financial_documents (
    document_number, document_type, recipient_id, recipient_email, settlement_id, payload_snapshot
  ) VALUES (
    NEW.document_number, 'settlement_statement', NEW.beneficiary_id, recipient_email, NEW.id,
    jsonb_build_object(
      'beneficiary_name', NEW.beneficiary_name,
      'beneficiary_type', NEW.beneficiary_type,
      'legal_identifier', NEW.legal_identifier,
      'period_start', NEW.period_start,
      'period_end', NEW.period_end,
      'amount_cents', NEW.amount_cents,
      'currency', NEW.currency,
      'payment_method', NEW.payment_method,
      'payment_reference', NEW.payment_reference,
      'paid_at', NEW.paid_at,
      'items', items
    )
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_paid_settlement_document ON public.settlement_statements;
CREATE TRIGGER create_paid_settlement_document
AFTER UPDATE OF status ON public.settlement_statements
FOR EACH ROW EXECUTE FUNCTION public.create_paid_settlement_document();

-- Backfill immutable receipts for payments already completed.
INSERT INTO public.financial_documents (
  document_number, document_type, recipient_id, recipient_email, order_id, payload_snapshot
)
SELECT
  'FDZ-REC-' || to_char(coalesce(order_row.updated_at, now()), 'YYYY') || '-' || lpad(nextval('public.financial_document_number_seq')::text, 7, '0'),
  'client_payment_receipt', order_row.client_id, profile.email, order_row.id,
  jsonb_build_object(
    'order_id', order_row.id,
    'restaurant_name', restaurant.name,
    'order_created_at', order_row.created_at,
    'payment_confirmed_at', order_row.updated_at,
    'payment_reference', order_row.stripe_payment_intent_id,
    'delivery_address', order_row.delivery_address,
    'items', coalesce((SELECT jsonb_agg(jsonb_build_object('product_name', product.name, 'quantity', item.quantity, 'unit_price_cents', item.unit_price_cents, 'total_price_cents', item.total_price_cents) ORDER BY item.created_at) FROM public.order_items item LEFT JOIN public.products product ON product.id = item.product_id WHERE item.order_id = order_row.id), '[]'::jsonb),
    'partner_total_cents', order_row.partner_total_cents,
    'service_fee_cents', order_row.service_fee_cents,
    'delivery_fee_cents', order_row.delivery_fee_cents,
    'advantage_discount_cents', coalesce(order_row.advantage_discount_cents, 0),
    'total_paid_cents', order_row.final_client_total_cents,
    'currency', 'EUR'
  )
FROM public.orders order_row
JOIN public.profiles profile ON profile.id = order_row.client_id
JOIN public.restaurants restaurant ON restaurant.id = order_row.restaurant_id
WHERE order_row.payment_status = 'completed'
  AND NOT EXISTS (SELECT 1 FROM public.financial_documents document WHERE document.order_id = order_row.id AND document.document_type = 'client_payment_receipt');

INSERT INTO public.financial_documents (
  document_number, document_type, recipient_id, recipient_email, settlement_id, payload_snapshot
)
SELECT
  statement.document_number, 'settlement_statement', statement.beneficiary_id, profile.email, statement.id,
  jsonb_build_object(
    'beneficiary_name', statement.beneficiary_name,
    'beneficiary_type', statement.beneficiary_type,
    'legal_identifier', statement.legal_identifier,
    'period_start', statement.period_start,
    'period_end', statement.period_end,
    'amount_cents', statement.amount_cents,
    'currency', statement.currency,
    'payment_method', statement.payment_method,
    'payment_reference', statement.payment_reference,
    'paid_at', statement.paid_at,
    'items', coalesce((SELECT jsonb_agg(jsonb_build_object('order_id', item.order_id, 'delivered_at', orders.delivered_at, 'amount_cents', item.amount_cents, 'allocation_type', item.allocation_type) ORDER BY orders.delivered_at) FROM public.settlement_statement_items item JOIN public.orders orders ON orders.id = item.order_id WHERE item.statement_id = statement.id), '[]'::jsonb)
  )
FROM public.settlement_statements statement
JOIN public.profiles profile ON profile.id = statement.beneficiary_id
WHERE statement.status = 'paid'
  AND NOT EXISTS (SELECT 1 FROM public.financial_documents document WHERE document.settlement_id = statement.id AND document.document_type = 'settlement_statement');
