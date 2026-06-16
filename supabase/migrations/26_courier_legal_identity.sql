-- Legal identity required before validating new independent couriers.

ALTER TABLE public.courier_applications
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_courier_applications_siret
  ON public.courier_applications(siret) WHERE siret IS NOT NULL;

CREATE OR REPLACE FUNCTION public.require_courier_legal_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'validated' AND OLD.status IS DISTINCT FROM 'validated' THEN
    IF nullif(trim(coalesce(NEW.legal_name, '')), '') IS NULL
      OR NEW.siret !~ '^[0-9]{14}$'
      OR nullif(trim(coalesce(NEW.address, '')), '') IS NULL
      OR NEW.postal_code !~ '^[0-9]{5}$' THEN
      RAISE EXCEPTION 'Courier legal name, 14-digit SIRET, address and postal code are required';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_courier_legal_identity ON public.courier_applications;
CREATE TRIGGER require_courier_legal_identity
BEFORE UPDATE OF status ON public.courier_applications
FOR EACH ROW EXECUTE FUNCTION public.require_courier_legal_identity();

CREATE OR REPLACE FUNCTION public.create_paid_settlement_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_email text;
  beneficiary_name text;
  beneficiary_address text;
  beneficiary_identifier text;
  items jsonb;
BEGIN
  IF NEW.status <> 'paid' OR OLD.status = 'paid' THEN RETURN NEW; END IF;
  beneficiary_name := NEW.beneficiary_name;
  SELECT profile.email,
         concat_ws(', ', nullif(profile.address, ''), nullif(profile.postal_code, ''), nullif(profile.city, ''))
  INTO recipient_email, beneficiary_address
  FROM public.profiles profile WHERE profile.id = NEW.beneficiary_id;

  beneficiary_identifier := NEW.legal_identifier;
  IF NEW.beneficiary_type = 'courier' THEN
    SELECT coalesce(nullif(application.legal_name, ''), NEW.beneficiary_name), application.siret,
           concat_ws(', ', nullif(application.address, ''), nullif(application.postal_code, ''), nullif(application.city, ''))
    INTO beneficiary_name, beneficiary_identifier, beneficiary_address
    FROM public.courier_applications application WHERE application.user_id = NEW.beneficiary_id;
  ELSE
    SELECT concat_ws(', ', nullif(restaurant.address, ''), nullif(restaurant.postal_code, ''), nullif(restaurant.city, ''))
    INTO beneficiary_address FROM public.restaurants restaurant WHERE restaurant.owner_id = NEW.beneficiary_id;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'order_id', item.order_id, 'delivered_at', orders.delivered_at,
    'amount_cents', item.amount_cents, 'allocation_type', item.allocation_type
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
      'beneficiary_name', beneficiary_name,
      'beneficiary_type', NEW.beneficiary_type,
      'beneficiary_address', beneficiary_address,
      'legal_identifier', beneficiary_identifier,
      'period_start', NEW.period_start, 'period_end', NEW.period_end,
      'amount_cents', NEW.amount_cents, 'currency', NEW.currency,
      'payment_method', NEW.payment_method, 'payment_reference', NEW.payment_reference,
      'paid_at', NEW.paid_at, 'items', items
    )
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
