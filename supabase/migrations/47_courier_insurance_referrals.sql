-- Courier insurance callback leads. Weello acts only as a business introducer:
-- no quote, recommendation or insurance advice is produced by the platform.

CREATE TABLE IF NOT EXISTS public.courier_insurance_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text NOT NULL,
  preferred_contact_time text NOT NULL DEFAULT 'indifferent'
    CHECK (preferred_contact_time IN ('morning', 'afternoon', 'evening', 'indifferent')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'transmitted', 'contacted', 'closed', 'cancelled')),
  consent_partner_contact boolean NOT NULL CHECK (consent_partner_contact IS TRUE),
  consented_at timestamptz NOT NULL DEFAULT now(),
  partner_reference text,
  transmitted_at timestamptz,
  contacted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS courier_insurance_referrals_user_idx
  ON public.courier_insurance_referrals(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS courier_insurance_referrals_one_pending
  ON public.courier_insurance_referrals(user_id)
  WHERE status = 'pending';

ALTER TABLE public.courier_insurance_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courier_insurance_referrals_read_own_or_admin"
  ON public.courier_insurance_referrals;
CREATE POLICY "courier_insurance_referrals_read_own_or_admin"
ON public.courier_insurance_referrals
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.current_user_has_role('admin'));

-- INSERT/UPDATE/DELETE intentionally remain server-only through service_role.
DROP TRIGGER IF EXISTS set_courier_insurance_referrals_updated_at
  ON public.courier_insurance_referrals;
CREATE TRIGGER set_courier_insurance_referrals_updated_at
BEFORE UPDATE ON public.courier_insurance_referrals
FOR EACH ROW EXECUTE FUNCTION public.set_prelaunch_updated_at();

COMMENT ON TABLE public.courier_insurance_referrals IS
  'Consent-based callback requests for an external insurance partner; no insurance distribution is performed by Weello.';
