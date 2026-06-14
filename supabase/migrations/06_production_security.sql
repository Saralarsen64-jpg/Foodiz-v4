-- Production security policies and columns required by the current application.

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS user_email text,
  ADD COLUMN IF NOT EXISTS admin_response text;

ALTER TABLE public.bank_accounts ALTER COLUMN bic DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.current_user_has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = required_role
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_profile(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = target_user_id
    OR public.current_user_has_role('admin')
    OR EXISTS (
      SELECT 1
      FROM public.orders o
      LEFT JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE target_user_id IN (o.client_id, o.courier_id, r.owner_id)
        AND auth.uid() IN (o.client_id, o.courier_id, r.owner_id)
    );
$$;

REVOKE ALL ON FUNCTION public.current_user_has_role(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS "Profiles are viewable by user" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all_mvp" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_production" ON public.profiles;
CREATE POLICY "profiles_select_production" ON public.profiles FOR SELECT
  USING (public.can_view_profile(id));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_production" ON public.profiles;
CREATE POLICY "profiles_update_own_production" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.current_user_has_role('admin'))
  WITH CHECK (auth.uid() = id OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "orders_update_involved_mvp" ON public.orders;
DROP POLICY IF EXISTS "orders_update_workers_production" ON public.orders;
CREATE POLICY "orders_update_workers_production" ON public.orders FOR UPDATE
  USING (
    auth.uid() = courier_id
    OR auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id)
    OR public.current_user_has_role('admin')
  )
  WITH CHECK (
    auth.uid() = courier_id
    OR auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id)
    OR public.current_user_has_role('admin')
  );

DROP POLICY IF EXISTS "couriers_claim_ready_orders_production" ON public.orders;
CREATE POLICY "couriers_claim_ready_orders_production" ON public.orders FOR UPDATE
  USING (
    public.current_user_has_role('courier')
    AND EXISTS (
      SELECT 1 FROM public.courier_applications
      WHERE user_id = auth.uid() AND status = 'validated'
    )
    AND status = 'ready'
    AND courier_id IS NULL
  )
  WITH CHECK (
    public.current_user_has_role('courier')
    AND EXISTS (
      SELECT 1 FROM public.courier_applications
      WHERE user_id = auth.uid() AND status = 'validated'
    )
    AND status = 'pickup'
    AND courier_id = auth.uid()
  );

DROP POLICY IF EXISTS "couriers_select_available_orders_production" ON public.orders;
CREATE POLICY "couriers_select_available_orders_production" ON public.orders FOR SELECT
  USING (
    public.current_user_has_role('courier')
    AND EXISTS (
      SELECT 1 FROM public.courier_applications
      WHERE user_id = auth.uid() AND status = 'validated'
    )
    AND status = 'ready'
    AND courier_id IS NULL
  );

DROP POLICY IF EXISTS "order_items_select_production" ON public.order_items;
CREATE POLICY "order_items_select_production" ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      LEFT JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id
        AND (
          auth.uid() IN (o.client_id, o.courier_id, r.owner_id)
          OR public.current_user_has_role('admin')
          OR (public.current_user_has_role('courier') AND o.status = 'ready' AND o.courier_id IS NULL)
        )
    )
  );

DROP POLICY IF EXISTS "support_tickets_select_own_production" ON public.support_tickets;
CREATE POLICY "support_tickets_select_own_production" ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "support_tickets_insert_own_production" ON public.support_tickets;
CREATE POLICY "support_tickets_insert_own_production" ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_tickets_update_admin_production" ON public.support_tickets;
CREATE POLICY "support_tickets_update_admin_production" ON public.support_tickets FOR UPDATE
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "delivery_tracking_insert_courier_production" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_insert_courier_production" ON public.delivery_tracking FOR INSERT
  WITH CHECK (
    auth.uid() = courier_id
    AND EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND courier_id = auth.uid())
  );

DROP POLICY IF EXISTS "delivery_tracking_update_courier_production" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_update_courier_production" ON public.delivery_tracking FOR UPDATE
  USING (auth.uid() = courier_id OR public.current_user_has_role('admin'))
  WITH CHECK (auth.uid() = courier_id OR public.current_user_has_role('admin'));

DROP POLICY IF EXISTS "reviews_insert_client_production" ON public.reviews;
CREATE POLICY "reviews_insert_client_production" ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND client_id = auth.uid() AND status = 'delivered'
    )
  );

DROP POLICY IF EXISTS "reviews_select_production" ON public.reviews;
CREATE POLICY "reviews_select_production" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "campaigns_insert_owner_production" ON public.marketing_campaigns;
CREATE POLICY "campaigns_insert_owner_production" ON public.marketing_campaigns FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id));

DROP POLICY IF EXISTS "campaigns_delete_owner_production" ON public.marketing_campaigns;
CREATE POLICY "campaigns_delete_owner_production" ON public.marketing_campaigns FOR DELETE
  USING (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id));

DROP POLICY IF EXISTS "order_payments_select_own" ON public.order_payments;
CREATE POLICY "order_payments_select_own" ON public.order_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      LEFT JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.id = order_id
        AND (auth.uid() IN (o.client_id, r.owner_id) OR public.current_user_has_role('admin'))
    )
  );

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.partner_subscriptions;
CREATE POLICY "subscriptions_select_own" ON public.partner_subscriptions FOR SELECT
  USING (
    auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id)
    OR public.current_user_has_role('admin')
  );

DROP POLICY IF EXISTS "notifications_insert_partner_customers_production" ON public.notifications;
CREATE POLICY "notifications_insert_partner_customers_production" ON public.notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders o
      JOIN public.restaurants r ON r.id = o.restaurant_id
      WHERE o.client_id = notifications.user_id
        AND o.status = 'delivered'
        AND r.owner_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.partner_menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, name)
);

ALTER TABLE public.partner_menu_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "partner_menu_categories_owner_production" ON public.partner_menu_categories;
CREATE POLICY "partner_menu_categories_owner_production" ON public.partner_menu_categories FOR ALL
  USING (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id))
  WITH CHECK (auth.uid() IN (SELECT owner_id FROM public.restaurants WHERE id = restaurant_id));

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_has_role('admin') THEN
    NEW.role := OLD.role;
    NEW.status := OLD.status;
    NEW.referral_count := OLD.referral_count;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

CREATE OR REPLACE FUNCTION public.protect_restaurant_validation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_has_role('admin') THEN
    NEW.owner_id := OLD.owner_id;
    NEW.status := OLD.status;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_restaurant_validation_fields ON public.restaurants;
CREATE TRIGGER protect_restaurant_validation_fields
BEFORE UPDATE ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.protect_restaurant_validation_fields();
