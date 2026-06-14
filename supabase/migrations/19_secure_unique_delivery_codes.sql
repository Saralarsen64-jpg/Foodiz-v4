-- Unique six-digit delivery codes and brute-force protection.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.delivery_code_verifications
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_failed_at timestamp with time zone;

-- Repair any historical duplicate before enforcing global active-code uniqueness.
DO $$
DECLARE
  duplicate_row record;
  candidate text;
  entropy bytea;
BEGIN
  FOR duplicate_row IN
    SELECT order_id
    FROM (
      SELECT order_id, row_number() OVER (PARTITION BY code ORDER BY created_at, order_id) AS position
      FROM public.client_delivery_codes
    ) ranked
    WHERE position > 1
  LOOP
    LOOP
      entropy := gen_random_bytes(4);
      candidate := (100000 + mod(
        get_byte(entropy, 0)::bigint * 16777216
        + get_byte(entropy, 1)::bigint * 65536
        + get_byte(entropy, 2)::bigint * 256
        + get_byte(entropy, 3)::bigint,
        900000
      ))::text;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.client_delivery_codes WHERE code = candidate);
    END LOOP;

    UPDATE public.client_delivery_codes SET code = candidate WHERE order_id = duplicate_row.order_id;
    UPDATE public.delivery_code_verifications
    SET code_hash = encode(digest(candidate, 'sha256'), 'hex'), failed_attempts = 0, locked_until = null, last_failed_at = null
    WHERE order_id = duplicate_row.order_id;
  END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS client_delivery_codes_code_unique
  ON public.client_delivery_codes(code);

CREATE OR REPLACE FUNCTION public.create_order_delivery_code(target_order_id uuid, target_client_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  candidate text;
  existing_code text;
  attempt integer;
  entropy bytea;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = target_order_id AND client_id = target_client_id
  ) THEN RAISE EXCEPTION 'Order does not belong to client'; END IF;

  SELECT code INTO existing_code FROM public.client_delivery_codes WHERE order_id = target_order_id;
  IF existing_code IS NOT NULL THEN RETURN existing_code; END IF;

  FOR attempt IN 1..25 LOOP
    entropy := gen_random_bytes(4);
    candidate := (100000 + mod(
      get_byte(entropy, 0)::bigint * 16777216
      + get_byte(entropy, 1)::bigint * 65536
      + get_byte(entropy, 2)::bigint * 256
      + get_byte(entropy, 3)::bigint,
      900000
    ))::text;
    BEGIN
      INSERT INTO public.client_delivery_codes (order_id, client_id, code)
      VALUES (target_order_id, target_client_id, candidate);

      INSERT INTO public.delivery_code_verifications (order_id, code_hash)
      VALUES (target_order_id, encode(digest(candidate, 'sha256'), 'hex'));

      RETURN candidate;
    EXCEPTION WHEN unique_violation THEN
      SELECT code INTO existing_code FROM public.client_delivery_codes WHERE order_id = target_order_id;
      IF existing_code IS NOT NULL THEN RETURN existing_code; END IF;
    END;
  END LOOP;

  RAISE EXCEPTION 'Unable to allocate a unique delivery code';
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_delivery_code(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_delivery_code(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.register_delivery_code_failure(target_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  verification public.delivery_code_verifications%ROWTYPE;
  next_attempt integer;
  lock_expiry timestamp with time zone;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') THEN RAISE EXCEPTION 'Service role required'; END IF;

  SELECT * INTO verification
  FROM public.delivery_code_verifications
  WHERE order_id = target_order_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'NOT_FOUND'); END IF;

  IF verification.locked_until IS NOT NULL AND verification.locked_until > now() THEN
    RETURN jsonb_build_object(
      'locked', true,
      'retryAfterSeconds', GREATEST(1, ceil(extract(epoch FROM verification.locked_until - now()))::integer)
    );
  END IF;

  next_attempt := verification.failed_attempts + 1;
  IF next_attempt >= 5 THEN
    lock_expiry := now() + interval '15 minutes';
    UPDATE public.delivery_code_verifications
    SET failed_attempts = 0, last_failed_at = now(), locked_until = lock_expiry
    WHERE order_id = target_order_id;
    RETURN jsonb_build_object('locked', true, 'retryAfterSeconds', 900);
  END IF;

  UPDATE public.delivery_code_verifications
  SET failed_attempts = next_attempt, last_failed_at = now(), locked_until = null
  WHERE order_id = target_order_id;
  RETURN jsonb_build_object('locked', false, 'remainingAttempts', 5 - next_attempt);
END;
$$;

REVOKE ALL ON FUNCTION public.register_delivery_code_failure(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_delivery_code_failure(uuid) TO service_role;
