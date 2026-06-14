-- Reliable account bootstrap, referral rewards and atomic advantage redemption.

ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_code_key;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS reward_points integer NOT NULL DEFAULT 500;
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_filleul_unique ON public.referrals(filleul_id);

ALTER TABLE public.client_locked_advantages
  ADD COLUMN IF NOT EXISTS catalog_id uuid REFERENCES public.advantage_catalog(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.client_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  advantage_id uuid REFERENCES public.advantage_catalog(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  points_spent integer NOT NULL,
  reward_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_rewards_user_status ON public.client_rewards(user_id, status);
ALTER TABLE public.client_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_rewards_select_own" ON public.client_rewards;
CREATE POLICY "client_rewards_select_own" ON public.client_rewards FOR SELECT
  USING (auth.uid() = user_id OR public.current_user_has_role('admin'));

CREATE OR REPLACE FUNCTION public.generate_foodiz_ref_code(user_id uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'FDZ-' || upper(substr(md5(user_id::text), 1, 8));
$$;

CREATE OR REPLACE FUNCTION public.handle_new_foodiz_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requested_role text;
  sponsor_id uuid;
  supplied_ref_code text;
  generated_code text;
BEGIN
  requested_role := CASE
    WHEN NEW.raw_user_meta_data ->> 'role' IN ('client', 'partner', 'courier')
      THEN NEW.raw_user_meta_data ->> 'role'
    ELSE 'client'
  END;
  generated_code := public.generate_foodiz_ref_code(NEW.id);

  INSERT INTO public.profiles (
    id, role, email, first_name, last_name, full_name, phone, address,
    postal_code, city, cgu_accepted, status, ref_code
  ) VALUES (
    NEW.id,
    requested_role,
    NEW.email,
    nullif(NEW.raw_user_meta_data ->> 'first_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'last_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'full_name', ''),
    nullif(NEW.raw_user_meta_data ->> 'phone', ''),
    nullif(NEW.raw_user_meta_data ->> 'address', ''),
    nullif(NEW.raw_user_meta_data ->> 'postal_code', ''),
    nullif(NEW.raw_user_meta_data ->> 'city', ''),
    coalesce((NEW.raw_user_meta_data ->> 'cgu_accepted')::boolean, false),
    CASE WHEN requested_role = 'client' THEN 'active' ELSE 'pending' END,
    generated_code
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    ref_code = coalesce(public.profiles.ref_code, EXCLUDED.ref_code);

  IF requested_role = 'client' THEN
    INSERT INTO public.client_wallets (user_id, points_balance, loyalty_tier)
    VALUES (NEW.id, 0, 'bronze') ON CONFLICT (user_id) DO NOTHING;

    supplied_ref_code := upper(nullif(trim(NEW.raw_user_meta_data ->> 'ref_code'), ''));
    IF supplied_ref_code IS NOT NULL THEN
      SELECT id INTO sponsor_id FROM public.profiles
      WHERE upper(ref_code) = supplied_ref_code AND id <> NEW.id AND role = 'client';

      IF sponsor_id IS NOT NULL THEN
        INSERT INTO public.referrals (parrain_id, filleul_id, code, status, reward_points, completed_at)
        VALUES (sponsor_id, NEW.id, supplied_ref_code, 'completed', 500, now())
        ON CONFLICT (filleul_id) DO NOTHING;

        IF FOUND THEN
          UPDATE public.client_wallets SET points_balance = points_balance + 500, updated_at = now()
          WHERE user_id IN (sponsor_id, NEW.id);
          UPDATE public.profiles SET referral_count = referral_count + 1, updated_at = now()
          WHERE id = sponsor_id;
        END IF;
      END IF;
    END IF;
  ELSIF requested_role = 'partner' THEN
    INSERT INTO public.restaurants (owner_id, name, siret, phone, address, postal_code, city, status, is_active)
    VALUES (
      NEW.id,
      coalesce(nullif(NEW.raw_user_meta_data ->> 'business_name', ''), nullif(NEW.raw_user_meta_data ->> 'full_name', ''), 'Établissement Foodiz'),
      nullif(NEW.raw_user_meta_data ->> 'siret', ''),
      nullif(NEW.raw_user_meta_data ->> 'phone', ''),
      nullif(NEW.raw_user_meta_data ->> 'address', ''),
      nullif(NEW.raw_user_meta_data ->> 'postal_code', ''),
      nullif(NEW.raw_user_meta_data ->> 'city', ''),
      'pending', false
    ) ON CONFLICT (siret) DO NOTHING;

    INSERT INTO public.partner_applications (user_id, business_name, siret, phone, email, address, postal_code, city, status)
    VALUES (
      NEW.id,
      coalesce(nullif(NEW.raw_user_meta_data ->> 'business_name', ''), nullif(NEW.raw_user_meta_data ->> 'full_name', ''), 'Établissement Foodiz'),
      nullif(NEW.raw_user_meta_data ->> 'siret', ''),
      nullif(NEW.raw_user_meta_data ->> 'phone', ''), NEW.email,
      nullif(NEW.raw_user_meta_data ->> 'address', ''),
      nullif(NEW.raw_user_meta_data ->> 'postal_code', ''),
      nullif(NEW.raw_user_meta_data ->> 'city', ''), 'pending'
    ) ON CONFLICT (user_id) DO NOTHING;
  ELSIF requested_role = 'courier' THEN
    INSERT INTO public.courier_applications (user_id, city, status)
    VALUES (NEW.id, nullif(NEW.raw_user_meta_data ->> 'city', ''), 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_foodiz ON auth.users;
CREATE TRIGGER on_auth_user_created_foodiz
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_foodiz_user();

UPDATE public.profiles SET ref_code = public.generate_foodiz_ref_code(id) WHERE ref_code IS NULL;
INSERT INTO public.client_wallets (user_id, points_balance, loyalty_tier)
SELECT id, 0, 'bronze' FROM public.profiles WHERE role = 'client'
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.redeem_locked_advantage()
RETURNS public.client_rewards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked_row public.client_locked_advantages;
  catalog_row public.advantage_catalog;
  wallet_points integer;
  reward_row public.client_rewards;
BEGIN
  SELECT * INTO locked_row FROM public.client_locked_advantages
  WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No locked advantage'; END IF;

  SELECT * INTO catalog_row FROM public.advantage_catalog
  WHERE id = locked_row.catalog_id AND is_active = true AND valid_until > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Advantage unavailable'; END IF;

  SELECT points_balance INTO wallet_points FROM public.client_wallets
  WHERE user_id = auth.uid() FOR UPDATE;
  IF wallet_points < catalog_row.points_cost THEN RAISE EXCEPTION 'Insufficient points'; END IF;

  UPDATE public.client_wallets
  SET points_balance = points_balance - catalog_row.points_cost, updated_at = now()
  WHERE user_id = auth.uid();

  INSERT INTO public.client_rewards (
    user_id, advantage_id, title, description, points_spent, reward_code, expires_at
  ) VALUES (
    auth.uid(), catalog_row.id, catalog_row.title, catalog_row.description,
    catalog_row.points_cost, 'AV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), now() + interval '30 days'
  ) RETURNING * INTO reward_row;

  DELETE FROM public.client_locked_advantages WHERE id = locked_row.id;
  RETURN reward_row;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_locked_advantage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_locked_advantage() TO authenticated;
