


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."account_status_enum" AS ENUM (
    'active',
    'suspended',
    'deleted'
);


ALTER TYPE "public"."account_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."cart_status_enum" AS ENUM (
    'active',
    'converted',
    'expired'
);


ALTER TYPE "public"."cart_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."courier_validation_status_enum" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'suspended'
);


ALTER TYPE "public"."courier_validation_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."delivery_fee_model_enum" AS ENUM (
    'zone_fixed',
    'zone_distance_variable'
);


ALTER TYPE "public"."delivery_fee_model_enum" OWNER TO "postgres";


CREATE TYPE "public"."delivery_status_enum" AS ENUM (
    'pending_assignment',
    'courier_assigned',
    'picked_up',
    'delivered',
    'cancelled'
);


ALTER TYPE "public"."delivery_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."device_platform_enum" AS ENUM (
    'ios',
    'android',
    'web'
);


ALTER TYPE "public"."device_platform_enum" OWNER TO "postgres";


CREATE TYPE "public"."establishment_type_enum" AS ENUM (
    'restaurant',
    'market'
);


ALTER TYPE "public"."establishment_type_enum" OWNER TO "postgres";


COMMENT ON TYPE "public"."establishment_type_enum" IS 'Foodiz supports only restaurant and market. No sweet_night, market_day or market_night.';



CREATE TYPE "public"."loyalty_source_enum" AS ENUM (
    'order',
    'partner_review',
    'courier_review',
    'satisfaction_response'
);


ALTER TYPE "public"."loyalty_source_enum" OWNER TO "postgres";


CREATE TYPE "public"."notification_campaign_status_enum" AS ENUM (
    'draft',
    'generated',
    'sent',
    'cancelled'
);


ALTER TYPE "public"."notification_campaign_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."notification_credit_source_enum" AS ENUM (
    'pack_purchase',
    'campaign_consumption'
);


ALTER TYPE "public"."notification_credit_source_enum" OWNER TO "postgres";


CREATE TYPE "public"."notification_dispatch_status_enum" AS ENUM (
    'pending',
    'sent',
    'failed'
);


ALTER TYPE "public"."notification_dispatch_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."notification_message_type_enum" AS ENUM (
    'transactional',
    'partner_campaign'
);


ALTER TYPE "public"."notification_message_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."notification_pack_type_enum" AS ENUM (
    'discovery',
    'boost',
    'performance'
);


ALTER TYPE "public"."notification_pack_type_enum" OWNER TO "postgres";


COMMENT ON TYPE "public"."notification_pack_type_enum" IS 'Technical mapping: discovery = Découverte, boost = Boost, performance = Performance.';



CREATE TYPE "public"."order_status_enum" AS ENUM (
    'pending_payment',
    'paid',
    'in_preparation',
    'ready_for_pickup',
    'courier_assigned',
    'picked_up',
    'delivered',
    'cancelled'
);


ALTER TYPE "public"."order_status_enum" OWNER TO "postgres";


COMMENT ON TYPE "public"."order_status_enum" IS 'Foodiz economic model remains calculated per article, never at restaurant or basket-global rule level.';



CREATE TYPE "public"."partner_document_status_enum" AS ENUM (
    'pending_review',
    'approved',
    'rejected'
);


ALTER TYPE "public"."partner_document_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."partner_document_type_enum" AS ENUM (
    'siret',
    'identity_document',
    'kbis',
    'rc_pro'
);


ALTER TYPE "public"."partner_document_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."partner_validation_status_enum" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'suspended'
);


ALTER TYPE "public"."partner_validation_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."payment_status_enum" AS ENUM (
    'pending',
    'succeeded',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."payment_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."payout_status_enum" AS ENUM (
    'pending',
    'paid',
    'cancelled'
);


ALTER TYPE "public"."payout_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."product_status_enum" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."product_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."referral_status_enum" AS ENUM (
    'pending',
    'rewarded',
    'cancelled'
);


ALTER TYPE "public"."referral_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."user_role_enum" AS ENUM (
    'client',
    'partner',
    'courier',
    'admin'
);


ALTER TYPE "public"."user_role_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assert_profile_role"("p_user_id" "uuid", "p_expected_role" "public"."user_role_enum") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_actual_role public.user_role_enum;
begin
  select p.role into v_actual_role
  from public.profiles p
  where p.user_id = p_user_id;

  if v_actual_role is null then
    raise exception 'Profile % not found for expected role %', p_user_id, p_expected_role;
  end if;

  if v_actual_role <> p_expected_role then
    raise exception 'Profile % must have role %, got %', p_user_id, p_expected_role, v_actual_role;
  end if;
end;
$$;


ALTER FUNCTION "public"."assert_profile_role"("p_user_id" "uuid", "p_expected_role" "public"."user_role_enum") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "public"."user_role_enum"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.role
  from public.profiles p
  where p.user_id = auth.uid();
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."foodiz_bracket_from_partner_price_cents"("p_partner_price_cents" integer) RETURNS smallint
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when p_partner_price_cents between 50 and 350 then 1
    when p_partner_price_cents between 351 and 849 then 2
    when p_partner_price_cents >= 850 then 3
    else null
  end;
$$;


ALTER FUNCTION "public"."foodiz_bracket_from_partner_price_cents"("p_partner_price_cents" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."foodiz_courier_share_from_partner_price_cents"("p_partner_price_cents" integer) RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when p_partner_price_cents between 50 and 350 then 50
    when p_partner_price_cents between 351 and 849 then 100
    when p_partner_price_cents >= 850 then 100
    else null
  end;
$$;


ALTER FUNCTION "public"."foodiz_courier_share_from_partner_price_cents"("p_partner_price_cents" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."foodiz_foodiz_share_from_partner_price_cents"("p_partner_price_cents" integer) RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when p_partner_price_cents between 50 and 350 then 50
    when p_partner_price_cents between 351 and 849 then 100
    when p_partner_price_cents >= 850 then 150
    else null
  end;
$$;


ALTER FUNCTION "public"."foodiz_foodiz_share_from_partner_price_cents"("p_partner_price_cents" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."foodiz_loyalty_funding_from_partner_price_cents"("p_partner_price_cents" integer) RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when p_partner_price_cents between 50 and 350 then 0
    when p_partner_price_cents between 351 and 849 then 20
    when p_partner_price_cents >= 850 then 20
    else null
  end;
$$;


ALTER FUNCTION "public"."foodiz_loyalty_funding_from_partner_price_cents"("p_partner_price_cents" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."foodiz_markup_from_partner_price_cents"("p_partner_price_cents" integer) RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when p_partner_price_cents between 50 and 350 then 100
    when p_partner_price_cents between 351 and 849 then 250
    when p_partner_price_cents >= 850 then 300
    else null
  end;
$$;


ALTER FUNCTION "public"."foodiz_markup_from_partner_price_cents"("p_partner_price_cents" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."foodiz_referral_funding_from_partner_price_cents"("p_partner_price_cents" integer) RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when p_partner_price_cents between 50 and 350 then 0
    when p_partner_price_cents between 351 and 849 then 30
    when p_partner_price_cents >= 850 then 30
    else null
  end;
$$;


ALTER FUNCTION "public"."foodiz_referral_funding_from_partner_price_cents"("p_partner_price_cents" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."foodiz_service_fee_from_item_count"("p_item_count" integer) RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when p_item_count = 1 then 199
    when p_item_count = 2 then 149
    when p_item_count = 3 then 119
    when p_item_count >= 4 then 99
    else null
  end;
$$;


ALTER FUNCTION "public"."foodiz_service_fee_from_item_count"("p_item_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_referral_code"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
  v_seed text;
begin
  -- Take the first 8 hex chars of the uuid (no dashes) and prefix with `fdz-`.
  -- Combined with a small random suffix it gives a short, human-shareable code
  -- with negligible collision probability across realistic Foodiz scale.
  v_seed := replace(p_user_id::text, '-', '');
  return 'fdz-' || substr(v_seed, 1, 8) || '-' || substr(v_seed, 9, 4);
end;
$$;


ALTER FUNCTION "public"."generate_referral_code"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_couriers_protected_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if old.user_id <> auth.uid() then
    raise exception 'Not allowed to update this courier';
  end if;

  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.validation_status is distinct from old.validation_status
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by_admin_user_id is distinct from old.reviewed_by_admin_user_id then
    raise exception 'Protected courier fields cannot be updated directly';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."guard_couriers_protected_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_partner_documents_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_partner_user_id uuid;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  select p.user_id into v_partner_user_id
  from public.partners p
  where p.id = old.partner_id;

  if v_partner_user_id is null or v_partner_user_id <> auth.uid() then
    raise exception 'Not allowed to update this partner document';
  end if;

  if new.id is distinct from old.id
     or new.partner_id is distinct from old.partner_id
     or new.document_type is distinct from old.document_type then
    raise exception 'Partner document identity fields cannot be changed';
  end if;

  if new.storage_path is distinct from old.storage_path then
    new.verification_status = 'pending_review';
    new.reviewed_at = null;
    new.reviewed_by_admin_user_id = null;
    new.rejection_reason = null;
    new.submitted_at = now();
  else
    if new.verification_status is distinct from old.verification_status
       or new.reviewed_at is distinct from old.reviewed_at
       or new.reviewed_by_admin_user_id is distinct from old.reviewed_by_admin_user_id
       or new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'Partner cannot update document review fields directly';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."guard_partner_documents_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_partners_protected_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if old.user_id <> auth.uid() then
    raise exception 'Not allowed to update this partner';
  end if;

  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.validation_status is distinct from old.validation_status
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by_admin_user_id is distinct from old.reviewed_by_admin_user_id
     or new.rc_pro_due_at is distinct from old.rc_pro_due_at
     or new.rc_pro_received_at is distinct from old.rc_pro_received_at then
    raise exception 'Protected partner fields cannot be updated directly';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."guard_partners_protected_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_profile_role_fk"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_column_name text := tg_argv[0];
  v_expected_role public.user_role_enum := tg_argv[1]::public.user_role_enum;
  v_user_id_text text;
begin
  v_user_id_text := to_jsonb(new) ->> v_column_name;

  if v_user_id_text is null then
    return new;
  end if;

  perform public.assert_profile_role(v_user_id_text::uuid, v_expected_role);
  return new;
end;
$$;


ALTER FUNCTION "public"."guard_profile_role_fk"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_profiles_protected_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if old.user_id <> auth.uid() then
    raise exception 'Not allowed to update this profile';
  end if;

  if new.user_id is distinct from old.user_id
     or new.role is distinct from old.role
     or new.account_status is distinct from old.account_status
     or new.email is distinct from old.email
     or new.referral_code is distinct from old.referral_code
     or new.referred_by_user_id is distinct from old.referred_by_user_id
     or new.deleted_at is distinct from old.deleted_at then
    raise exception 'Protected profile fields cannot be updated directly';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."guard_profiles_protected_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_meta            jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_requested_role  text  := nullif(v_meta->>'requested_role', '');
  v_role            public.user_role_enum;
  v_first_name      text  := nullif(v_meta->>'first_name', '');
  v_last_name       text  := nullif(v_meta->>'last_name', '');
  v_phone           text  := nullif(v_meta->>'phone', '');
  v_referral_in     text  := nullif(v_meta->>'referred_by_code', '');
  v_referrer_id     uuid;
  v_referral_code   text;
begin
  -- Default to 'client' if the metadata didn't carry a requested_role
  -- (defensive: the auth UI always sets it, but a manual signup via the
  -- Supabase dashboard would otherwise fail the enum cast).
  if v_requested_role is null
     or v_requested_role not in ('client', 'partner', 'courier') then
    v_role := 'client';
  else
    v_role := v_requested_role::public.user_role_enum;
  end if;

  -- Resolve optional referrer (only meaningful for client signups but we
  -- accept it for any role — it stays null if the code does not exist).
  if v_referral_in is not null then
    select user_id
      into v_referrer_id
      from public.profiles
     where referral_code = v_referral_in
     limit 1;
  end if;

  v_referral_code := public.generate_referral_code(new.id);

  insert into public.profiles (
    user_id,
    role,
    account_status,
    email,
    first_name,
    last_name,
    phone,
    referral_code,
    referred_by_user_id
  ) values (
    new.id,
    v_role,
    'active',
    new.email,
    v_first_name,
    v_last_name,
    v_phone,
    v_referral_code,
    v_referrer_id
  )
  on conflict (user_id) do nothing;

  -- Bootstrap the loyalty account for clients only — partner/courier loyalty
  -- accounts are not in scope per FOODIZ_MASTER_SPEC §3 (loyalty = client side).
  if v_role = 'client' then
    insert into public.loyalty_accounts (client_user_id)
    values (new.id)
    on conflict (client_user_id) do nothing;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Post-signup trigger: creates the public.profiles row (role taken from raw_user_meta_data.requested_role) and, for clients, the matching loyalty_accounts row. Runs as SECURITY DEFINER because no profiles_insert RLS policy exists by design (see FOODIZ_TECHNICAL_BLUEPRINT §6.profiles).';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'admin'
      and p.account_status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_client"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'client'
      and p.account_status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_client"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_courier"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'courier'
      and p.account_status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_courier"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_partner"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'partner'
      and p.account_status = 'active'
  );
$$;


ALTER FUNCTION "public"."is_partner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_courier"("p_courier_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.couriers c
    where c.id = p_courier_id
      and c.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."owns_courier"("p_courier_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_order"("p_order_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and o.client_user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."owns_order"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."owns_partner"("p_partner_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.partners p
    where p.id = p_partner_id
      and p.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."owns_partner"("p_partner_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."storage_partner_document_path_is_valid"("p_name" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $_$
  select p_name ~* '^partners/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/(siret|identity_document|kbis|rc_pro)/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[A-Za-z0-9]+$';
$_$;


ALTER FUNCTION "public"."storage_partner_document_path_is_valid"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."storage_partner_id_from_object_name"("p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
  v_parts text[];
  v_candidate text;
begin
  v_parts := string_to_array(p_name, '/');

  if array_length(v_parts, 1) <> 4 then
    return null;
  end if;

  if v_parts[1] <> 'partners' then
    return null;
  end if;

  v_candidate := v_parts[2];

  if v_candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return v_candidate::uuid;
  end if;

  return null;
end;
$_$;


ALTER FUNCTION "public"."storage_partner_id_from_object_name"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_cart_delivery_address_ownership"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_address_owner uuid;
begin
  if new.delivery_address_id is null then
    return new;
  end if;

  select a.client_user_id into v_address_owner
  from public.client_addresses a
  where a.id = new.delivery_address_id;

  if v_address_owner is null then
    raise exception 'Delivery address not found';
  end if;

  if v_address_owner <> new.client_user_id then
    raise exception 'Cart delivery address must belong to the cart client';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_cart_delivery_address_ownership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_cart_item_partner_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_cart_partner_id uuid;
  v_product_partner_id uuid;
begin
  select c.partner_id into v_cart_partner_id
  from public.carts c
  where c.id = new.cart_id;

  select p.partner_id into v_product_partner_id
  from public.products p
  where p.id = new.product_id;

  if v_cart_partner_id is null then
    raise exception 'Cart not found';
  end if;

  if v_product_partner_id is null then
    raise exception 'Product not found';
  end if;

  if v_cart_partner_id <> v_product_partner_id then
    raise exception 'All cart items must belong to the cart partner';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_cart_item_partner_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_courier_review_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order public.orders%rowtype;
  v_delivery public.deliveries%rowtype;
begin
  select * into v_order
  from public.orders o
  where o.id = new.order_id;

  select * into v_delivery
  from public.deliveries d
  where d.order_id = new.order_id;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_delivery.id is null then
    raise exception 'Delivery not found';
  end if;

  if v_order.order_status <> 'delivered' then
    raise exception 'Courier review requires a delivered order';
  end if;

  if v_order.client_user_id <> new.client_user_id then
    raise exception 'Courier review client does not match order client';
  end if;

  if v_delivery.courier_id is null or v_delivery.courier_id <> new.courier_id then
    raise exception 'Courier review courier does not match delivery courier';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_courier_review_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_delivery_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.status = old.status then
    return new;
  end if;

  if (
    (old.status = 'pending_assignment' and new.status in ('courier_assigned', 'cancelled'))
    or (old.status = 'courier_assigned' and new.status in ('picked_up', 'cancelled'))
    or (old.status = 'picked_up' and new.status = 'delivered')
  ) then
    return new;
  end if;

  raise exception 'Invalid delivery status transition: % -> %', old.status, new.status;
end;
$$;


ALTER FUNCTION "public"."validate_delivery_status_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_loyalty_transaction_source"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_count integer := 0;
begin
  v_count :=
    (case when new.order_id is not null then 1 else 0 end)
    + (case when new.partner_review_id is not null then 1 else 0 end)
    + (case when new.courier_review_id is not null then 1 else 0 end)
    + (case when new.satisfaction_response_id is not null then 1 else 0 end);

  if v_count <> 1 then
    raise exception 'Exactly one loyalty source reference must be set';
  end if;

  case new.source
    when 'order' then
      if new.order_id is null then
        raise exception 'Order loyalty transaction requires order_id';
      end if;
    when 'partner_review' then
      if new.partner_review_id is null then
        raise exception 'Partner review loyalty transaction requires partner_review_id';
      end if;
    when 'courier_review' then
      if new.courier_review_id is null then
        raise exception 'Courier review loyalty transaction requires courier_review_id';
      end if;
    when 'satisfaction_response' then
      if new.satisfaction_response_id is null then
        raise exception 'Satisfaction response loyalty transaction requires satisfaction_response_id';
      end if;
  end case;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_loyalty_transaction_source"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_notification_credit_ledger_links"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  case new.source_type
    when 'pack_purchase' then
      if new.pack_purchase_id is null or new.campaign_id is not null then
        raise exception 'pack_purchase ledger entries require pack_purchase_id and no campaign_id';
      end if;
    when 'campaign_consumption' then
      if new.campaign_id is null or new.pack_purchase_id is not null then
        raise exception 'campaign_consumption ledger entries require campaign_id and no pack_purchase_id';
      end if;
  end case;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_notification_credit_ledger_links"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_notification_pack_purchase_values"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  case new.pack_type
    when 'discovery' then
      if new.campaigns_included <> 15 or new.amount_cents <> 999 then
        raise exception 'Pack discovery must map to Découverte: 15 campaigns / 9.99€';
      end if;
    when 'boost' then
      if new.campaigns_included <> 50 or new.amount_cents <> 2499 then
        raise exception 'Pack boost must map to Boost: 50 campaigns / 24.99€';
      end if;
    when 'performance' then
      if new.campaigns_included <> 150 or new.amount_cents <> 5999 then
        raise exception 'Pack performance must map to Performance: 150 campaigns / 59.99€';
      end if;
  end case;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_notification_pack_purchase_values"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_order_cart_and_address_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_address public.client_addresses%rowtype;
  v_cart public.carts%rowtype;
begin
  if tg_op = 'INSERT' then
    if new.delivery_address_id is null then
      raise exception 'Order creation requires delivery_address_id to populate the delivery snapshot';
    end if;

    select * into v_address
    from public.client_addresses a
    where a.id = new.delivery_address_id;

    if v_address.id is null then
      raise exception 'Order delivery address not found';
    end if;

    if v_address.client_user_id <> new.client_user_id then
      raise exception 'Order delivery address must belong to the order client';
    end if;

    new.delivery_address_line_1 := v_address.address_line_1;
    new.delivery_address_line_2 := v_address.address_line_2;
    new.delivery_postal_code := v_address.postal_code;
    new.delivery_city := v_address.city;
    new.delivery_country_code := v_address.country_code;
    new.delivery_latitude := v_address.latitude;
    new.delivery_longitude := v_address.longitude;
  elsif tg_op = 'UPDATE' then
    if new.delivery_address_id is distinct from old.delivery_address_id then
      if not (old.delivery_address_id is not null and new.delivery_address_id is null) then
        raise exception 'delivery_address_id cannot be modified after order creation';
      end if;
    end if;

    if new.delivery_address_line_1 is distinct from old.delivery_address_line_1
       or new.delivery_address_line_2 is distinct from old.delivery_address_line_2
       or new.delivery_postal_code is distinct from old.delivery_postal_code
       or new.delivery_city is distinct from old.delivery_city
       or new.delivery_country_code is distinct from old.delivery_country_code
       or new.delivery_latitude is distinct from old.delivery_latitude
       or new.delivery_longitude is distinct from old.delivery_longitude then
      raise exception 'Delivery address snapshot fields cannot be modified after order creation';
    end if;
  end if;

  if new.cart_id is not null then
    select * into v_cart
    from public.carts c
    where c.id = new.cart_id;

    if v_cart.id is null then
      raise exception 'Order cart not found';
    end if;

    if v_cart.client_user_id <> new.client_user_id then
      raise exception 'Order cart must belong to the same client as the order';
    end if;

    if v_cart.partner_id <> new.partner_id then
      raise exception 'Order cart must belong to the same partner as the order';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_order_cart_and_address_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_order_item_foodiz_pricing"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_expected_bracket smallint;
  v_expected_markup integer;
  v_expected_customer_price integer;
  v_expected_courier_share integer;
  v_expected_foodiz_share integer;
  v_expected_loyalty_funding integer;
  v_expected_referral_funding integer;
begin
  v_expected_bracket := public.foodiz_bracket_from_partner_price_cents(new.unit_partner_price_cents);
  v_expected_markup := public.foodiz_markup_from_partner_price_cents(new.unit_partner_price_cents);
  v_expected_customer_price := new.unit_partner_price_cents + v_expected_markup;
  v_expected_courier_share := public.foodiz_courier_share_from_partner_price_cents(new.unit_partner_price_cents);
  v_expected_foodiz_share := public.foodiz_foodiz_share_from_partner_price_cents(new.unit_partner_price_cents);
  v_expected_loyalty_funding := public.foodiz_loyalty_funding_from_partner_price_cents(new.unit_partner_price_cents);
  v_expected_referral_funding := public.foodiz_referral_funding_from_partner_price_cents(new.unit_partner_price_cents);

  if v_expected_bracket is null then
    raise exception 'Order item partner price is outside official Foodiz article pricing brackets';
  end if;

  if new.markup_bracket <> v_expected_bracket then
    raise exception 'Order item markup_bracket must match official Foodiz bracket';
  end if;

  if new.unit_markup_cents <> v_expected_markup then
    raise exception 'Order item unit_markup_cents must match official Foodiz markup';
  end if;

  if new.unit_customer_price_cents <> v_expected_customer_price then
    raise exception 'Order item unit_customer_price_cents must equal unit_partner_price_cents + unit_markup_cents';
  end if;

  if new.unit_courier_share_cents <> v_expected_courier_share then
    raise exception 'Order item unit_courier_share_cents must match official Foodiz share';
  end if;

  if new.unit_foodiz_share_cents <> v_expected_foodiz_share then
    raise exception 'Order item unit_foodiz_share_cents must match official Foodiz share';
  end if;

  if new.unit_loyalty_funding_cents <> v_expected_loyalty_funding then
    raise exception 'Order item unit_loyalty_funding_cents must match official Foodiz funding';
  end if;

  if new.unit_referral_funding_cents <> v_expected_referral_funding then
    raise exception 'Order item unit_referral_funding_cents must match official Foodiz funding';
  end if;

  if new.line_partner_subtotal_cents <> new.quantity * new.unit_partner_price_cents then
    raise exception 'Order item line_partner_subtotal_cents must equal quantity * unit_partner_price_cents';
  end if;

  if new.line_customer_subtotal_cents <> new.quantity * new.unit_customer_price_cents then
    raise exception 'Order item line_customer_subtotal_cents must equal quantity * unit_customer_price_cents';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_order_item_foodiz_pricing"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_order_item_partner_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order_partner_id uuid;
  v_product_partner_id uuid;
begin
  select o.partner_id into v_order_partner_id
  from public.orders o
  where o.id = new.order_id;

  select p.partner_id into v_product_partner_id
  from public.products p
  where p.id = new.product_id;

  if v_order_partner_id is null then
    raise exception 'Order not found for order item';
  end if;

  if v_product_partner_id is null then
    raise exception 'Product not found for order item';
  end if;

  if v_order_partner_id <> v_product_partner_id then
    raise exception 'Order item product must belong to the same partner as the order';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_order_item_partner_consistency"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_order_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.order_status = old.order_status then
    return new;
  end if;

  if (
    (old.order_status = 'pending_payment' and new.order_status in ('paid', 'cancelled'))
    or (old.order_status = 'paid' and new.order_status in ('in_preparation', 'cancelled'))
    or (old.order_status = 'in_preparation' and new.order_status in ('ready_for_pickup', 'cancelled'))
    or (old.order_status = 'ready_for_pickup' and new.order_status in ('courier_assigned', 'cancelled'))
    or (old.order_status = 'courier_assigned' and new.order_status in ('picked_up', 'cancelled'))
    or (old.order_status = 'picked_up' and new.order_status = 'delivered')
  ) then
    return new;
  end if;

  raise exception 'Invalid order status transition: % -> %', old.order_status, new.order_status;
end;
$$;


ALTER FUNCTION "public"."validate_order_status_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_order_totals_for_order_id"("p_order_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order public.orders%rowtype;
  v_item_count integer;
  v_subtotal_partner integer;
  v_subtotal_customer integer;
  v_total_markup integer;
  v_courier_share integer;
  v_foodiz_share integer;
  v_loyalty_funding integer;
  v_referral_funding integer;
  v_expected_service_fee integer;
begin
  select * into v_order
  from public.orders o
  where o.id = p_order_id;

  if v_order.id is null then
    return;
  end if;

  select
    coalesce(sum(oi.quantity), 0)::integer,
    coalesce(sum(oi.line_partner_subtotal_cents), 0)::integer,
    coalesce(sum(oi.line_customer_subtotal_cents), 0)::integer,
    coalesce(sum(oi.quantity * oi.unit_markup_cents), 0)::integer,
    coalesce(sum(oi.quantity * oi.unit_courier_share_cents), 0)::integer,
    coalesce(sum(oi.quantity * oi.unit_foodiz_share_cents), 0)::integer,
    coalesce(sum(oi.quantity * oi.unit_loyalty_funding_cents), 0)::integer,
    coalesce(sum(oi.quantity * oi.unit_referral_funding_cents), 0)::integer
  into
    v_item_count,
    v_subtotal_partner,
    v_subtotal_customer,
    v_total_markup,
    v_courier_share,
    v_foodiz_share,
    v_loyalty_funding,
    v_referral_funding
  from public.order_items oi
  where oi.order_id = p_order_id;

  if v_item_count <= 0 then
    raise exception 'Order % must contain at least one order item', p_order_id;
  end if;

  v_expected_service_fee := public.foodiz_service_fee_from_item_count(v_item_count);

  if v_order.item_count <> v_item_count then
    raise exception 'Order % item_count must equal the sum of order_items.quantity', p_order_id;
  end if;

  if v_order.subtotal_partner_cents <> v_subtotal_partner then
    raise exception 'Order % subtotal_partner_cents must equal the sum of order item partner subtotals', p_order_id;
  end if;

  if v_order.subtotal_customer_cents <> v_subtotal_customer then
    raise exception 'Order % subtotal_customer_cents must equal the sum of order item customer subtotals', p_order_id;
  end if;

  if v_order.total_markup_cents <> v_total_markup then
    raise exception 'Order % total_markup_cents must equal the sum of item markups', p_order_id;
  end if;

  if v_total_markup <> (v_courier_share + v_foodiz_share + v_loyalty_funding + v_referral_funding) then
    raise exception 'Order % total markup must equal courier + Foodiz + loyalty + referral funding', p_order_id;
  end if;

  if v_order.courier_share_cents <> v_courier_share then
    raise exception 'Order % courier_share_cents must equal the sum of item courier shares', p_order_id;
  end if;

  if v_order.foodiz_share_cents <> v_foodiz_share then
    raise exception 'Order % foodiz_share_cents must equal the sum of item Foodiz shares', p_order_id;
  end if;

  if v_order.loyalty_funding_cents <> v_loyalty_funding then
    raise exception 'Order % loyalty_funding_cents must equal the sum of item loyalty funding', p_order_id;
  end if;

  if v_order.referral_funding_cents <> v_referral_funding then
    raise exception 'Order % referral_funding_cents must equal the sum of item referral funding', p_order_id;
  end if;

  if v_order.service_fee_cents <> v_expected_service_fee then
    raise exception 'Order % service_fee_cents must match the official Foodiz service fee for item_count %', p_order_id, v_item_count;
  end if;

  if v_order.subtotal_customer_cents <> (v_order.subtotal_partner_cents + v_order.total_markup_cents) then
    raise exception 'Order % subtotal_customer_cents must equal subtotal_partner_cents + total_markup_cents', p_order_id;
  end if;

  if v_order.total_customer_cents <> (v_order.subtotal_customer_cents + v_order.service_fee_cents + v_order.delivery_fee_cents) then
    raise exception 'Order % total_customer_cents must equal subtotal_customer_cents + service_fee_cents + delivery_fee_cents', p_order_id;
  end if;
end;
$$;


ALTER FUNCTION "public"."validate_order_totals_for_order_id"("p_order_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_order_totals_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order_id uuid;
begin
  if tg_table_name = 'orders' then
    v_order_id := coalesce(new.id, old.id);
  else
    v_order_id := coalesce(new.order_id, old.order_id);
  end if;

  perform public.validate_order_totals_for_order_id(v_order_id);
  return null;
end;
$$;


ALTER FUNCTION "public"."validate_order_totals_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_partner_review_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders o
  where o.id = new.order_id;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.order_status <> 'delivered' then
    raise exception 'Partner review requires a delivered order';
  end if;

  if v_order.client_user_id <> new.client_user_id then
    raise exception 'Partner review client does not match order client';
  end if;

  if v_order.partner_id <> new.partner_id then
    raise exception 'Partner review partner does not match order partner';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_partner_review_order"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_product_category_partner_type"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_partner_type public.establishment_type_enum;
  v_category_type public.establishment_type_enum;
begin
  select p.establishment_type into v_partner_type
  from public.partners p
  where p.id = new.partner_id;

  select c.establishment_type into v_category_type
  from public.categories c
  where c.id = new.category_id;

  if v_partner_type is null then
    raise exception 'Partner not found for product';
  end if;

  if v_category_type is null then
    raise exception 'Category not found for product';
  end if;

  if v_partner_type <> v_category_type then
    raise exception 'Product category establishment_type must match partner establishment_type';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_product_category_partner_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_satisfaction_response_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders o
  where o.id = new.order_id;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.order_status <> 'delivered' then
    raise exception 'Satisfaction response requires a delivered order';
  end if;

  if v_order.client_user_id <> new.client_user_id then
    raise exception 'Satisfaction response client does not match order client';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_satisfaction_response_order"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."account_suspensions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "imposed_by_admin_user_id" "uuid",
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ends_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."account_suspensions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_action_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "target_table" "text" NOT NULL,
    "target_id" "uuid",
    "payload" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_action_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_user_id" "uuid" NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "delivery_address_id" "uuid",
    "delivery_address_line_1" "text" NOT NULL,
    "delivery_address_line_2" "text",
    "delivery_postal_code" "text" NOT NULL,
    "delivery_city" "text" NOT NULL,
    "delivery_country_code" "text" NOT NULL,
    "delivery_latitude" numeric(9,6) NOT NULL,
    "delivery_longitude" numeric(9,6) NOT NULL,
    "cart_id" "uuid",
    "delivery_zone_id" "uuid",
    "order_status" "public"."order_status_enum" DEFAULT 'pending_payment'::"public"."order_status_enum" NOT NULL,
    "item_count" integer NOT NULL,
    "subtotal_partner_cents" integer NOT NULL,
    "subtotal_customer_cents" integer NOT NULL,
    "total_markup_cents" integer NOT NULL,
    "courier_share_cents" integer NOT NULL,
    "foodiz_share_cents" integer NOT NULL,
    "loyalty_funding_cents" integer NOT NULL,
    "referral_funding_cents" integer NOT NULL,
    "service_fee_cents" integer NOT NULL,
    "delivery_fee_cents" integer NOT NULL,
    "total_customer_cents" integer NOT NULL,
    "distance_km" numeric(6,2),
    "placed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "orders_courier_share_cents_check" CHECK (("courier_share_cents" >= 0)),
    CONSTRAINT "orders_delivery_fee_cents_check" CHECK (("delivery_fee_cents" >= 0)),
    CONSTRAINT "orders_foodiz_share_cents_check" CHECK (("foodiz_share_cents" >= 0)),
    CONSTRAINT "orders_item_count_check" CHECK (("item_count" > 0)),
    CONSTRAINT "orders_loyalty_funding_cents_check" CHECK (("loyalty_funding_cents" >= 0)),
    CONSTRAINT "orders_referral_funding_cents_check" CHECK (("referral_funding_cents" >= 0)),
    CONSTRAINT "orders_service_fee_cents_check" CHECK (("service_fee_cents" >= 0)),
    CONSTRAINT "orders_subtotal_customer_cents_check" CHECK (("subtotal_customer_cents" >= 0)),
    CONSTRAINT "orders_subtotal_partner_cents_check" CHECK (("subtotal_partner_cents" >= 0)),
    CONSTRAINT "orders_total_customer_cents_check" CHECK (("total_customer_cents" >= 0)),
    CONSTRAINT "orders_total_markup_cents_check" CHECK (("total_markup_cents" >= 0))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."delivery_address_id" IS 'Nullable only to preserve historical order snapshots if the source client address is later deleted. Orders must be created from a real address snapshot.';



COMMENT ON COLUMN "public"."orders"."item_count" IS 'Sum of order_items.quantity. Service fee is calculated from this total item count.';



COMMENT ON COLUMN "public"."orders"."subtotal_partner_cents" IS 'Partner payout base. The partner gets the partner subtotal, not the client total.';



COMMENT ON COLUMN "public"."orders"."total_markup_cents" IS 'Foodiz keeps the cumulative markup according to the official article-based economic model.';



COMMENT ON COLUMN "public"."orders"."courier_share_cents" IS 'Courier article-based share only. Final courier earning = courier_share_cents + delivery_fee_cents.';



COMMENT ON COLUMN "public"."orders"."service_fee_cents" IS 'Foodiz keeps the service fee according to the official service-fee brackets.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "role" "public"."user_role_enum" NOT NULL,
    "account_status" "public"."account_status_enum" DEFAULT 'active'::"public"."account_status_enum" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "referral_code" "text",
    "referred_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_global_stats_view" WITH ("security_barrier"='true') AS
 SELECT ( SELECT "count"(*) AS "count"
           FROM "public"."profiles") AS "total_users",
    ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE ("profiles"."role" = 'client'::"public"."user_role_enum")) AS "total_clients",
    ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE ("profiles"."role" = 'partner'::"public"."user_role_enum")) AS "total_partners",
    ( SELECT "count"(*) AS "count"
           FROM "public"."profiles"
          WHERE ("profiles"."role" = 'courier'::"public"."user_role_enum")) AS "total_couriers",
    ( SELECT "count"(*) AS "count"
           FROM "public"."orders") AS "total_orders",
    ( SELECT "count"(*) AS "count"
           FROM "public"."orders"
          WHERE ("orders"."order_status" = 'paid'::"public"."order_status_enum")) AS "paid_orders",
    ( SELECT "count"(*) AS "count"
           FROM "public"."orders"
          WHERE ("orders"."order_status" = 'delivered'::"public"."order_status_enum")) AS "delivered_orders",
    ( SELECT "count"(*) AS "count"
           FROM "public"."orders"
          WHERE ("orders"."order_status" = 'cancelled'::"public"."order_status_enum")) AS "cancelled_orders"
   FROM ( SELECT 1 AS "gate") "s"
  WHERE "public"."is_admin"();


ALTER VIEW "public"."admin_global_stats_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "unit_partner_price_cents" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cart_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "cart_items_unit_partner_price_cents_check" CHECK (("unit_partner_price_cents" >= 0))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_user_id" "uuid" NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "delivery_address_id" "uuid",
    "status" "public"."cart_status_enum" DEFAULT 'active'::"public"."cart_status_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."carts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "establishment_type" "public"."establishment_type_enum" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_user_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "address_line_1" "text" NOT NULL,
    "address_line_2" "text",
    "postal_code" "text" NOT NULL,
    "city" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "latitude" numeric(9,6) NOT NULL,
    "longitude" numeric(9,6) NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."couriers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "validation_status" "public"."courier_validation_status_enum" DEFAULT 'pending'::"public"."courier_validation_status_enum" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by_admin_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."couriers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "courier_id" "uuid",
    "status" "public"."delivery_status_enum" DEFAULT 'pending_assignment'::"public"."delivery_status_enum" NOT NULL,
    "accepted_at" timestamp with time zone,
    "pickup_confirmed_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "client_confirmed_at" timestamp with time zone,
    "proof_image_url" "text",
    "delivery_notes" "text",
    "last_courier_lat" numeric(9,6),
    "last_courier_lng" numeric(9,6),
    "last_location_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."deliveries" OWNER TO "postgres";


COMMENT ON TABLE "public"."deliveries" IS 'Delivery lifecycle remains driven by courier assignment, pickup confirmation and delivery confirmation. Optional proof and client_confirmed_at do not change the official MVP lifecycle.';



CREATE TABLE IF NOT EXISTS "public"."partners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "establishment_type" "public"."establishment_type_enum" NOT NULL,
    "legal_name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "cover_image_url" "text",
    "opening_hours" "jsonb",
    "minimum_order_cents" integer DEFAULT 0 NOT NULL,
    "is_halal" boolean DEFAULT false NOT NULL,
    "siret" "text" NOT NULL,
    "address_line_1" "text" NOT NULL,
    "address_line_2" "text",
    "postal_code" "text" NOT NULL,
    "city" "text" NOT NULL,
    "country_code" "text" NOT NULL,
    "latitude" numeric(9,6) NOT NULL,
    "longitude" numeric(9,6) NOT NULL,
    "validation_status" "public"."partner_validation_status_enum" DEFAULT 'pending'::"public"."partner_validation_status_enum" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by_admin_user_id" "uuid",
    "rc_pro_due_at" timestamp with time zone NOT NULL,
    "rc_pro_received_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "partners_minimum_order_cents_check" CHECK (("minimum_order_cents" >= 0))
);


ALTER TABLE "public"."partners" OWNER TO "postgres";


COMMENT ON TABLE "public"."partners" IS 'Private source table. MVP: 1 partner = 1 establishment. Public client exposure must go through partner_public_view only.';



COMMENT ON COLUMN "public"."partners"."siret" IS 'SIRET number entered by the partner. This is distinct from partner_documents(document_type = siret), which stores the supporting proof file if required.';



CREATE OR REPLACE VIEW "public"."courier_assigned_delivery_view" WITH ("security_barrier"='true') AS
 SELECT "d"."id" AS "delivery_id",
    "d"."order_id",
    "d"."courier_id",
    "o"."partner_id",
    "p"."display_name" AS "partner_display_name",
    "p"."establishment_type",
    "p"."address_line_1" AS "pickup_address_line_1",
    "p"."address_line_2" AS "pickup_address_line_2",
    "p"."postal_code" AS "pickup_postal_code",
    "p"."city" AS "pickup_city",
    "p"."country_code" AS "pickup_country_code",
    "p"."latitude" AS "pickup_latitude",
    "p"."longitude" AS "pickup_longitude",
    "o"."delivery_address_line_1",
    "o"."delivery_address_line_2",
    "o"."delivery_postal_code",
    "o"."delivery_city",
    "o"."delivery_country_code",
    "o"."delivery_latitude",
    "o"."delivery_longitude",
    "d"."delivery_notes",
    "d"."proof_image_url",
    "d"."status" AS "delivery_status",
    "o"."order_status",
    "o"."item_count",
    "o"."distance_km",
    "d"."accepted_at",
    "d"."pickup_confirmed_at",
    "d"."delivered_at",
    "d"."client_confirmed_at",
    "o"."placed_at"
   FROM (("public"."deliveries" "d"
     JOIN "public"."orders" "o" ON (("o"."id" = "d"."order_id")))
     JOIN "public"."partners" "p" ON (("p"."id" = "o"."partner_id")))
  WHERE (EXISTS ( SELECT 1
           FROM ("public"."couriers" "c"
             JOIN "public"."profiles" "pr" ON (("pr"."user_id" = "c"."user_id")))
          WHERE (("c"."id" = "d"."courier_id") AND ("c"."user_id" = "auth"."uid"()) AND ("c"."validation_status" = 'approved'::"public"."courier_validation_status_enum") AND ("pr"."role" = 'courier'::"public"."user_role_enum") AND ("pr"."account_status" = 'active'::"public"."account_status_enum"))));


ALTER VIEW "public"."courier_assigned_delivery_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."courier_assigned_delivery_view" IS 'Detailed delivery view for the assigned courier only. Exposes the delivery snapshot address required to complete the mission.';



CREATE TABLE IF NOT EXISTS "public"."courier_availabilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "courier_availabilities_time_check" CHECK (("ends_at" > "starts_at"))
);


ALTER TABLE "public"."courier_availabilities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."courier_available_deliveries_view" WITH ("security_barrier"='true') AS
 SELECT "d"."id" AS "delivery_id",
    "o"."id" AS "order_id",
    "o"."partner_id",
    "p"."display_name" AS "partner_display_name",
    "p"."establishment_type",
    "o"."item_count",
    "o"."distance_km",
    "o"."delivery_zone_id",
    "p"."city" AS "pickup_city",
    "p"."postal_code" AS "pickup_postal_code",
    "o"."delivery_city",
    "o"."delivery_postal_code",
    "d"."status" AS "delivery_status",
    "o"."order_status",
    "o"."placed_at"
   FROM (("public"."deliveries" "d"
     JOIN "public"."orders" "o" ON (("o"."id" = "d"."order_id")))
     JOIN "public"."partners" "p" ON (("p"."id" = "o"."partner_id")))
  WHERE (("d"."status" = 'pending_assignment'::"public"."delivery_status_enum") AND (EXISTS ( SELECT 1
           FROM ("public"."couriers" "c"
             JOIN "public"."profiles" "pr" ON (("pr"."user_id" = "c"."user_id")))
          WHERE (("c"."user_id" = "auth"."uid"()) AND ("c"."validation_status" = 'approved'::"public"."courier_validation_status_enum") AND ("pr"."role" = 'courier'::"public"."user_role_enum") AND ("pr"."account_status" = 'active'::"public"."account_status_enum")))));


ALTER VIEW "public"."courier_available_deliveries_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."courier_available_deliveries_view" IS 'Available deliveries for approved couriers. Does not expose the exact client delivery address before assignment.';



CREATE OR REPLACE VIEW "public"."courier_payout_eligible_view" WITH ("security_invoker"='true') AS
 SELECT "o"."id" AS "order_id",
    "d"."courier_id",
    "o"."partner_id",
    "o"."order_status",
    "o"."courier_share_cents" AS "courier_article_share_cents",
    "o"."delivery_fee_cents",
    ("o"."courier_share_cents" + "o"."delivery_fee_cents") AS "courier_total_earning_cents",
    "o"."placed_at",
    "o"."paid_at",
    "o"."delivered_at"
   FROM ("public"."orders" "o"
     JOIN "public"."deliveries" "d" ON (("d"."order_id" = "o"."id")))
  WHERE (("d"."courier_id" IS NOT NULL) AND ("o"."order_status" <> 'cancelled'::"public"."order_status_enum") AND ("o"."cancelled_at" IS NULL));


ALTER VIEW "public"."courier_payout_eligible_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."courier_payout_eligible_view" IS 'Courier payout eligible orders only. Cancelled orders are excluded. Final courier earning = orders.courier_share_cents + orders.delivery_fee_cents.';



CREATE TABLE IF NOT EXISTS "public"."courier_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "status" "public"."payout_status_enum" DEFAULT 'pending'::"public"."payout_status_enum" NOT NULL,
    "external_reference" "text",
    "processed_by_admin_user_id" "uuid",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "courier_payouts_amount_cents_check" CHECK (("amount_cents" > 0)),
    CONSTRAINT "courier_payouts_period_check" CHECK (("period_end" >= "period_start"))
);


ALTER TABLE "public"."courier_payouts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."courier_revenue_raw_view" WITH ("security_invoker"='true') AS
 SELECT "o"."id" AS "order_id",
    "d"."courier_id",
    "o"."partner_id",
    "o"."order_status",
    "o"."courier_share_cents" AS "courier_article_share_cents",
    "o"."delivery_fee_cents",
    ("o"."courier_share_cents" + "o"."delivery_fee_cents") AS "courier_total_earning_cents",
    "o"."placed_at",
    "o"."paid_at",
    "o"."delivered_at",
    "o"."cancelled_at"
   FROM ("public"."orders" "o"
     JOIN "public"."deliveries" "d" ON (("d"."order_id" = "o"."id")))
  WHERE ("d"."courier_id" IS NOT NULL);


ALTER VIEW "public"."courier_revenue_raw_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."courier_revenue_raw_view" IS 'Raw courier revenue view. Final courier earning = orders.courier_share_cents + orders.delivery_fee_cents.';



CREATE TABLE IF NOT EXISTS "public"."courier_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "client_user_id" "uuid" NOT NULL,
    "courier_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "courier_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."courier_reviews" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."courier_stats_view" WITH ("security_invoker"='true') AS
 SELECT "d"."courier_id",
    "count"(*) AS "total_assigned_deliveries_raw",
    "count"(*) FILTER (WHERE ("d"."status" = 'delivered'::"public"."delivery_status_enum")) AS "delivered_deliveries",
    "count"(*) FILTER (WHERE ("d"."status" = 'cancelled'::"public"."delivery_status_enum")) AS "cancelled_deliveries",
    COALESCE("sum"(("o"."courier_share_cents" + "o"."delivery_fee_cents")), (0)::bigint) AS "total_courier_earning_cents_raw",
    COALESCE("sum"(("o"."courier_share_cents" + "o"."delivery_fee_cents")) FILTER (WHERE (("o"."order_status" <> 'cancelled'::"public"."order_status_enum") AND ("o"."cancelled_at" IS NULL))), (0)::bigint) AS "total_courier_earning_cents_payout_eligible"
   FROM ("public"."deliveries" "d"
     JOIN "public"."orders" "o" ON (("o"."id" = "d"."order_id")))
  WHERE ("d"."courier_id" IS NOT NULL)
  GROUP BY "d"."courier_id";


ALTER VIEW "public"."courier_stats_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."delivery_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "city" "text" NOT NULL,
    "geojson" "jsonb" NOT NULL,
    "pricing_mode" "public"."delivery_fee_model_enum" DEFAULT 'zone_fixed'::"public"."delivery_fee_model_enum" NOT NULL,
    "min_distance_km" numeric(6,2),
    "max_distance_km" numeric(6,2),
    "base_fee_cents" integer NOT NULL,
    "minimum_fee_cents" integer DEFAULT 0 NOT NULL,
    "per_km_cents" integer,
    "is_default" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "delivery_zones_base_fee_cents_check" CHECK (("base_fee_cents" >= 0)),
    CONSTRAINT "delivery_zones_distance_bounds_check" CHECK ((("max_distance_km" IS NULL) OR ("min_distance_km" IS NULL) OR ("max_distance_km" >= "min_distance_km"))),
    CONSTRAINT "delivery_zones_minimum_fee_cents_check" CHECK (("minimum_fee_cents" >= 0)),
    CONSTRAINT "delivery_zones_per_km_cents_check" CHECK ((("per_km_cents" IS NULL) OR ("per_km_cents" >= 0)))
);


ALTER TABLE "public"."delivery_zones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."domain_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_name" "text" NOT NULL,
    "aggregate_type" "text" NOT NULL,
    "aggregate_id" "uuid" NOT NULL,
    "source" "text" NOT NULL,
    "idempotency_key" "text",
    "payload" "jsonb" NOT NULL,
    "emitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_at" timestamp with time zone
);


ALTER TABLE "public"."domain_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_accounts" (
    "client_user_id" "uuid" NOT NULL,
    "points_balance" integer DEFAULT 0 NOT NULL,
    "total_points_earned" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."loyalty_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_user_id" "uuid" NOT NULL,
    "source" "public"."loyalty_source_enum" NOT NULL,
    "order_id" "uuid",
    "partner_review_id" "uuid",
    "courier_review_id" "uuid",
    "satisfaction_response_id" "uuid",
    "points" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "loyalty_transactions_points_check" CHECK (("points" > 0))
);


ALTER TABLE "public"."loyalty_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "platform" "public"."device_platform_enum" NOT NULL,
    "push_token" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "last_seen_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_dispatches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_user_id" "uuid" NOT NULL,
    "message_type" "public"."notification_message_type_enum" NOT NULL,
    "campaign_id" "uuid",
    "device_id" "uuid",
    "message_body" "text" NOT NULL,
    "status" "public"."notification_dispatch_status_enum" DEFAULT 'pending'::"public"."notification_dispatch_status_enum" NOT NULL,
    "provider_message_id" "text",
    "error_message" "text",
    "dispatched_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_dispatches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "product_name_snapshot" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "markup_bracket" smallint NOT NULL,
    "unit_partner_price_cents" integer NOT NULL,
    "unit_markup_cents" integer NOT NULL,
    "unit_customer_price_cents" integer NOT NULL,
    "unit_courier_share_cents" integer NOT NULL,
    "unit_foodiz_share_cents" integer NOT NULL,
    "unit_loyalty_funding_cents" integer NOT NULL,
    "unit_referral_funding_cents" integer NOT NULL,
    "line_partner_subtotal_cents" integer NOT NULL,
    "line_customer_subtotal_cents" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_items_line_customer_subtotal_cents_check" CHECK (("line_customer_subtotal_cents" >= 0)),
    CONSTRAINT "order_items_line_partner_subtotal_cents_check" CHECK (("line_partner_subtotal_cents" >= 0)),
    CONSTRAINT "order_items_markup_bracket_check" CHECK (("markup_bracket" = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT "order_items_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "order_items_unit_courier_share_cents_check" CHECK (("unit_courier_share_cents" >= 0)),
    CONSTRAINT "order_items_unit_customer_price_cents_check" CHECK (("unit_customer_price_cents" >= 0)),
    CONSTRAINT "order_items_unit_foodiz_share_cents_check" CHECK (("unit_foodiz_share_cents" >= 0)),
    CONSTRAINT "order_items_unit_loyalty_funding_cents_check" CHECK (("unit_loyalty_funding_cents" >= 0)),
    CONSTRAINT "order_items_unit_markup_cents_check" CHECK (("unit_markup_cents" >= 0)),
    CONSTRAINT "order_items_unit_partner_price_cents_check" CHECK (("unit_partner_price_cents" >= 0)),
    CONSTRAINT "order_items_unit_referral_funding_cents_check" CHECK (("unit_referral_funding_cents" >= 0))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "stripe_payment_intent_id" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency_code" character(3) DEFAULT 'EUR'::"bpchar" NOT NULL,
    "status" "public"."payment_status_enum" DEFAULT 'pending'::"public"."payment_status_enum" NOT NULL,
    "paid_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "order_payments_amount_cents_check" CHECK (("amount_cents" >= 0))
);


ALTER TABLE "public"."order_payments" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."order_read_model_view" WITH ("security_invoker"='true') AS
 SELECT "o"."id" AS "order_id",
    "o"."client_user_id",
    "o"."partner_id",
    "p"."display_name" AS "partner_display_name",
    "p"."establishment_type",
    "o"."order_status",
    "o"."item_count",
    "o"."subtotal_partner_cents",
    "o"."subtotal_customer_cents",
    "o"."total_markup_cents",
    "o"."courier_share_cents",
    "o"."delivery_fee_cents",
    ("o"."courier_share_cents" + "o"."delivery_fee_cents") AS "courier_total_earning_cents",
    "o"."service_fee_cents",
    "o"."total_customer_cents",
    "op"."status" AS "payment_status",
    "d"."courier_id",
    "d"."status" AS "delivery_status",
    "d"."proof_image_url",
    "d"."delivery_notes",
    "o"."placed_at",
    "o"."paid_at",
    "o"."delivered_at",
    "o"."cancelled_at"
   FROM ((("public"."orders" "o"
     JOIN "public"."partners" "p" ON (("p"."id" = "o"."partner_id")))
     LEFT JOIN "public"."order_payments" "op" ON (("op"."order_id" = "o"."id")))
     LEFT JOIN "public"."deliveries" "d" ON (("d"."order_id" = "o"."id")));


ALTER VIEW "public"."order_read_model_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "document_type" "public"."partner_document_type_enum" NOT NULL,
    "storage_path" "text" NOT NULL,
    "verification_status" "public"."partner_document_status_enum" DEFAULT 'pending_review'::"public"."partner_document_status_enum" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by_admin_user_id" "uuid",
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."partner_documents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."partner_documents"."document_type" IS 'document_type = siret stores a supporting proof file when required. It is not the textual SIRET number itself.';



COMMENT ON COLUMN "public"."partner_documents"."storage_path" IS 'Private storage path. Partner documents must stay private.';



CREATE TABLE IF NOT EXISTS "public"."partner_notification_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "status" "public"."notification_campaign_status_enum" DEFAULT 'draft'::"public"."notification_campaign_status_enum" NOT NULL,
    "generated_content" "text" NOT NULL,
    "tone_locked" boolean DEFAULT true NOT NULL,
    "credits_consumed" integer DEFAULT 1 NOT NULL,
    "ai_score" numeric(5,2),
    "gourmandise_score" numeric(5,2),
    "elegance_score" numeric(5,2),
    "clarity_score" numeric(5,2),
    "soft_conversion_score" numeric(5,2),
    "context_relevance_score" numeric(5,2),
    "brand_safety_score" numeric(5,2),
    "ai_score_details" "jsonb",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "partner_notification_campaign_scores_range_check" CHECK (((("ai_score" IS NULL) OR (("ai_score" >= (0)::numeric) AND ("ai_score" <= (100)::numeric))) AND (("gourmandise_score" IS NULL) OR (("gourmandise_score" >= (0)::numeric) AND ("gourmandise_score" <= (100)::numeric))) AND (("elegance_score" IS NULL) OR (("elegance_score" >= (0)::numeric) AND ("elegance_score" <= (100)::numeric))) AND (("clarity_score" IS NULL) OR (("clarity_score" >= (0)::numeric) AND ("clarity_score" <= (100)::numeric))) AND (("soft_conversion_score" IS NULL) OR (("soft_conversion_score" >= (0)::numeric) AND ("soft_conversion_score" <= (100)::numeric))) AND (("context_relevance_score" IS NULL) OR (("context_relevance_score" >= (0)::numeric) AND ("context_relevance_score" <= (100)::numeric))) AND (("brand_safety_score" IS NULL) OR (("brand_safety_score" >= (0)::numeric) AND ("brand_safety_score" <= (100)::numeric))))),
    CONSTRAINT "partner_notification_campaigns_credits_consumed_check" CHECK (("credits_consumed" = 1))
);


ALTER TABLE "public"."partner_notification_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_notification_credit_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "source_type" "public"."notification_credit_source_enum" NOT NULL,
    "pack_purchase_id" "uuid",
    "campaign_id" "uuid",
    "delta_credits" integer NOT NULL,
    "balance_after" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "partner_notification_credit_ledger_balance_after_check" CHECK (("balance_after" >= 0)),
    CONSTRAINT "partner_notification_credit_ledger_delta_credits_check" CHECK (("delta_credits" <> 0)),
    CONSTRAINT "partner_notification_credit_ledger_source_exclusive_check" CHECK (((("source_type" = 'pack_purchase'::"public"."notification_credit_source_enum") AND ("pack_purchase_id" IS NOT NULL) AND ("campaign_id" IS NULL)) OR (("source_type" = 'campaign_consumption'::"public"."notification_credit_source_enum") AND ("campaign_id" IS NOT NULL) AND ("pack_purchase_id" IS NULL))))
);


ALTER TABLE "public"."partner_notification_credit_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."partner_notification_pack_purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "pack_type" "public"."notification_pack_type_enum" NOT NULL,
    "campaigns_included" integer NOT NULL,
    "amount_cents" integer NOT NULL,
    "stripe_payment_intent_id" "text" NOT NULL,
    "payment_status" "public"."payment_status_enum" DEFAULT 'pending'::"public"."payment_status_enum" NOT NULL,
    "purchased_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "partner_notification_pack_purchases_amount_cents_check" CHECK (("amount_cents" >= 0)),
    CONSTRAINT "partner_notification_pack_purchases_campaigns_included_check" CHECK (("campaigns_included" > 0))
);


ALTER TABLE "public"."partner_notification_pack_purchases" OWNER TO "postgres";


COMMENT ON TABLE "public"."partner_notification_pack_purchases" IS 'Pack mapping: discovery = Découverte, boost = Boost, performance = Performance.';



CREATE OR REPLACE VIEW "public"."partner_payout_eligible_view" WITH ("security_invoker"='true') AS
 SELECT "id" AS "order_id",
    "partner_id",
    "client_user_id",
    "order_status",
    "subtotal_partner_cents" AS "partner_payout_base_cents",
    "total_markup_cents",
    "service_fee_cents",
    "total_customer_cents",
    "placed_at",
    "paid_at",
    "delivered_at"
   FROM "public"."orders" "o"
  WHERE (("order_status" <> 'cancelled'::"public"."order_status_enum") AND ("cancelled_at" IS NULL));


ALTER VIEW "public"."partner_payout_eligible_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."partner_payout_eligible_view" IS 'Partner payout eligible orders only. Cancelled orders are excluded. Payout base remains orders.subtotal_partner_cents.';



CREATE TABLE IF NOT EXISTS "public"."partner_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "amount_cents" integer NOT NULL,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "status" "public"."payout_status_enum" DEFAULT 'pending'::"public"."payout_status_enum" NOT NULL,
    "external_reference" "text",
    "processed_by_admin_user_id" "uuid",
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "partner_payouts_amount_cents_check" CHECK (("amount_cents" > 0)),
    CONSTRAINT "partner_payouts_period_check" CHECK (("period_end" >= "period_start"))
);


ALTER TABLE "public"."partner_payouts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."partner_public_view" WITH ("security_barrier"='true') AS
 SELECT "id" AS "partner_id",
    "establishment_type",
    "display_name",
    "description",
    "logo_url",
    "cover_image_url",
    "opening_hours",
    "minimum_order_cents",
    "is_halal",
    "address_line_1",
    "address_line_2",
    "postal_code",
    "city",
    "country_code",
    "latitude",
    "longitude",
    "created_at",
    "updated_at"
   FROM "public"."partners" "p"
  WHERE ("validation_status" = 'approved'::"public"."partner_validation_status_enum");


ALTER VIEW "public"."partner_public_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."partner_public_view" IS 'Public partner exposure for authenticated clients. Never exposes private partner compliance fields such as siret or rc_pro tracking.';



CREATE OR REPLACE VIEW "public"."partner_revenue_raw_view" WITH ("security_invoker"='true') AS
 SELECT "id" AS "order_id",
    "partner_id",
    "client_user_id",
    "order_status",
    "subtotal_partner_cents" AS "partner_payout_base_cents",
    "total_markup_cents",
    "service_fee_cents",
    "total_customer_cents",
    "placed_at",
    "paid_at",
    "delivered_at",
    "cancelled_at"
   FROM "public"."orders" "o";


ALTER VIEW "public"."partner_revenue_raw_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."partner_revenue_raw_view" IS 'Raw partner revenue view. Partner payout base is orders.subtotal_partner_cents.';



CREATE TABLE IF NOT EXISTS "public"."partner_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "client_user_id" "uuid" NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "rating" smallint NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "partner_reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."partner_reviews" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."partner_stats_view" WITH ("security_invoker"='true') AS
 SELECT "partner_id",
    "count"(*) AS "total_orders_raw",
    "count"(*) FILTER (WHERE ("order_status" = 'delivered'::"public"."order_status_enum")) AS "delivered_orders",
    "count"(*) FILTER (WHERE ("order_status" = 'cancelled'::"public"."order_status_enum")) AS "cancelled_orders",
    COALESCE("sum"("subtotal_partner_cents"), (0)::bigint) AS "total_partner_subtotal_cents_raw",
    COALESCE("sum"("total_customer_cents"), (0)::bigint) AS "total_customer_cents_raw",
    COALESCE("sum"("subtotal_partner_cents") FILTER (WHERE (("order_status" <> 'cancelled'::"public"."order_status_enum") AND ("cancelled_at" IS NULL))), (0)::bigint) AS "total_partner_subtotal_cents_payout_eligible",
    COALESCE("sum"("total_customer_cents") FILTER (WHERE (("order_status" <> 'cancelled'::"public"."order_status_enum") AND ("cancelled_at" IS NULL))), (0)::bigint) AS "total_customer_cents_payout_eligible"
   FROM "public"."orders" "o"
  GROUP BY "partner_id";


ALTER VIEW "public"."partner_stats_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "partner_price_cents" integer NOT NULL,
    "is_halal" boolean DEFAULT false NOT NULL,
    "is_bestseller" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "status" "public"."product_status_enum" DEFAULT 'active'::"public"."product_status_enum" NOT NULL,
    "is_available" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "products_partner_price_cents_check" CHECK (("partner_price_cents" >= 50))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referrals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_user_id" "uuid" NOT NULL,
    "referred_user_id" "uuid" NOT NULL,
    "status" "public"."referral_status_enum" DEFAULT 'pending'::"public"."referral_status_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "referrals_no_self_referral_check" CHECK (("referrer_user_id" <> "referred_user_id"))
);


ALTER TABLE "public"."referrals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."satisfaction_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "client_user_id" "uuid" NOT NULL,
    "response_payload" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."satisfaction_responses" OWNER TO "postgres";


ALTER TABLE ONLY "public"."account_suspensions"
    ADD CONSTRAINT "account_suspensions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_action_logs"
    ADD CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_addresses"
    ADD CONSTRAINT "client_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courier_availabilities"
    ADD CONSTRAINT "courier_availabilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courier_payouts"
    ADD CONSTRAINT "courier_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courier_reviews"
    ADD CONSTRAINT "courier_reviews_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."courier_reviews"
    ADD CONSTRAINT "courier_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."couriers"
    ADD CONSTRAINT "couriers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."couriers"
    ADD CONSTRAINT "couriers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."delivery_zones"
    ADD CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."domain_events"
    ADD CONSTRAINT "domain_events_idempotency_key_key" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."domain_events"
    ADD CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_accounts"
    ADD CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("client_user_id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_courier_review_id_key" UNIQUE ("courier_review_id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_partner_review_id_key" UNIQUE ("partner_review_id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_satisfaction_response_id_key" UNIQUE ("satisfaction_response_id");



ALTER TABLE ONLY "public"."notification_devices"
    ADD CONSTRAINT "notification_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_devices"
    ADD CONSTRAINT "notification_devices_push_token_key" UNIQUE ("push_token");



ALTER TABLE ONLY "public"."notification_dispatches"
    ADD CONSTRAINT "notification_dispatches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "order_payments_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "order_payments_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_cart_id_key" UNIQUE ("cart_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_documents"
    ADD CONSTRAINT "partner_documents_partner_type_unique" UNIQUE ("partner_id", "document_type");



ALTER TABLE ONLY "public"."partner_documents"
    ADD CONSTRAINT "partner_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_notification_campaigns"
    ADD CONSTRAINT "partner_notification_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_notification_credit_ledger"
    ADD CONSTRAINT "partner_notification_credit_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_notification_pack_purchases"
    ADD CONSTRAINT "partner_notification_pack_purchase_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."partner_notification_pack_purchases"
    ADD CONSTRAINT "partner_notification_pack_purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_payouts"
    ADD CONSTRAINT "partner_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_reviews"
    ADD CONSTRAINT "partner_reviews_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."partner_reviews"
    ADD CONSTRAINT "partner_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referral_code_key" UNIQUE ("referral_code");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_user_id_key" UNIQUE ("referred_user_id");



ALTER TABLE ONLY "public"."satisfaction_responses"
    ADD CONSTRAINT "satisfaction_responses_order_id_key" UNIQUE ("order_id");



ALTER TABLE ONLY "public"."satisfaction_responses"
    ADD CONSTRAINT "satisfaction_responses_pkey" PRIMARY KEY ("id");



CREATE INDEX "account_suspensions_user_id_active_partial_idx" ON "public"."account_suspensions" USING "btree" ("user_id") WHERE ("is_active" = true);



CREATE INDEX "admin_action_logs_admin_created_at_desc_idx" ON "public"."admin_action_logs" USING "btree" ("admin_user_id", "created_at" DESC);



CREATE INDEX "admin_action_logs_target_table_target_id_idx" ON "public"."admin_action_logs" USING "btree" ("target_table", "target_id");



CREATE INDEX "cart_items_cart_id_idx" ON "public"."cart_items" USING "btree" ("cart_id");



CREATE UNIQUE INDEX "cart_items_cart_product_unique_idx" ON "public"."cart_items" USING "btree" ("cart_id", "product_id");



CREATE UNIQUE INDEX "carts_active_client_partner_unique_idx" ON "public"."carts" USING "btree" ("client_user_id", "partner_id") WHERE ("status" = 'active'::"public"."cart_status_enum");



CREATE INDEX "categories_active_sort_idx" ON "public"."categories" USING "btree" ("establishment_type", "is_active", "sort_order");



CREATE UNIQUE INDEX "categories_unique_name_per_establishment_type_idx" ON "public"."categories" USING "btree" ("lower"("name"), "establishment_type");



CREATE INDEX "courier_availabilities_courier_time_idx" ON "public"."courier_availabilities" USING "btree" ("courier_id", "starts_at", "ends_at");



CREATE INDEX "courier_payouts_courier_status_created_at_desc_idx" ON "public"."courier_payouts" USING "btree" ("courier_id", "status", "created_at" DESC);



CREATE INDEX "courier_reviews_courier_created_at_desc_idx" ON "public"."courier_reviews" USING "btree" ("courier_id", "created_at" DESC);



CREATE INDEX "couriers_validation_status_idx" ON "public"."couriers" USING "btree" ("validation_status");



CREATE INDEX "deliveries_courier_status_idx" ON "public"."deliveries" USING "btree" ("courier_id", "status");



CREATE INDEX "deliveries_status_updated_at_desc_idx" ON "public"."deliveries" USING "btree" ("status", "updated_at" DESC);



CREATE INDEX "delivery_zones_city_is_active_idx" ON "public"."delivery_zones" USING "btree" ("city", "is_active");



CREATE INDEX "delivery_zones_city_is_default_idx" ON "public"."delivery_zones" USING "btree" ("city", "is_default");



CREATE INDEX "domain_events_aggregate_idx" ON "public"."domain_events" USING "btree" ("aggregate_type", "aggregate_id", "emitted_at" DESC);



CREATE INDEX "loyalty_transactions_client_created_at_desc_idx" ON "public"."loyalty_transactions" USING "btree" ("client_user_id", "created_at" DESC);



CREATE INDEX "notification_devices_user_is_active_idx" ON "public"."notification_devices" USING "btree" ("user_id", "is_active");



CREATE INDEX "notification_dispatches_recipient_created_at_desc_idx" ON "public"."notification_dispatches" USING "btree" ("recipient_user_id", "created_at" DESC);



CREATE INDEX "notification_dispatches_status_created_at_desc_idx" ON "public"."notification_dispatches" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "order_items_order_id_idx" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "order_payments_status_idx" ON "public"."order_payments" USING "btree" ("status");



CREATE INDEX "orders_client_created_at_desc_idx" ON "public"."orders" USING "btree" ("client_user_id", "created_at" DESC);



CREATE INDEX "orders_delivery_zone_id_idx" ON "public"."orders" USING "btree" ("delivery_zone_id");



CREATE INDEX "orders_partner_status_created_at_desc_idx" ON "public"."orders" USING "btree" ("partner_id", "order_status", "created_at" DESC);



CREATE INDEX "orders_status_created_at_desc_idx" ON "public"."orders" USING "btree" ("order_status", "created_at" DESC);



CREATE INDEX "partner_documents_submitted_at_desc_idx" ON "public"."partner_documents" USING "btree" ("submitted_at" DESC);



CREATE INDEX "partner_documents_verification_status_idx" ON "public"."partner_documents" USING "btree" ("verification_status");



CREATE INDEX "partner_notification_campaigns_partner_sent_at_desc_idx" ON "public"."partner_notification_campaigns" USING "btree" ("partner_id", "sent_at" DESC);



CREATE INDEX "partner_notification_campaigns_partner_status_created_at_desc_i" ON "public"."partner_notification_campaigns" USING "btree" ("partner_id", "status", "created_at" DESC);



CREATE INDEX "partner_notification_credit_ledger_partner_created_at_desc_idx" ON "public"."partner_notification_credit_ledger" USING "btree" ("partner_id", "created_at" DESC);



CREATE INDEX "partner_notification_pack_purchases_partner_created_at_desc_idx" ON "public"."partner_notification_pack_purchases" USING "btree" ("partner_id", "created_at" DESC);



CREATE INDEX "partner_payouts_partner_status_created_at_desc_idx" ON "public"."partner_payouts" USING "btree" ("partner_id", "status", "created_at" DESC);



CREATE INDEX "partner_reviews_partner_created_at_desc_idx" ON "public"."partner_reviews" USING "btree" ("partner_id", "created_at" DESC);



CREATE INDEX "partners_city_postal_code_idx" ON "public"."partners" USING "btree" ("city", "postal_code");



CREATE INDEX "partners_establishment_type_idx" ON "public"."partners" USING "btree" ("establishment_type");



CREATE INDEX "partners_siret_idx" ON "public"."partners" USING "btree" ("siret");



CREATE INDEX "partners_validation_status_idx" ON "public"."partners" USING "btree" ("validation_status");



CREATE INDEX "products_category_id_idx" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "products_name_trgm_idx" ON "public"."products" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "products_partner_is_bestseller_idx" ON "public"."products" USING "btree" ("partner_id", "is_bestseller");



CREATE INDEX "products_partner_is_halal_idx" ON "public"."products" USING "btree" ("partner_id", "is_halal");



CREATE INDEX "products_partner_sort_order_idx" ON "public"."products" USING "btree" ("partner_id", "sort_order");



CREATE INDEX "products_partner_status_available_idx" ON "public"."products" USING "btree" ("partner_id", "status", "is_available");



CREATE INDEX "profiles_account_status_idx" ON "public"."profiles" USING "btree" ("account_status");



CREATE INDEX "profiles_referred_by_user_id_idx" ON "public"."profiles" USING "btree" ("referred_by_user_id");



CREATE INDEX "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "referrals_referrer_user_id_idx" ON "public"."referrals" USING "btree" ("referrer_user_id");



CREATE INDEX "referrals_status_idx" ON "public"."referrals" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "account_suspensions_require_admin_actor_role" BEFORE INSERT OR UPDATE ON "public"."account_suspensions" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_role_fk"('imposed_by_admin_user_id', 'admin');



CREATE OR REPLACE TRIGGER "account_suspensions_set_updated_at" BEFORE UPDATE ON "public"."account_suspensions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "admin_action_logs_require_admin_role" BEFORE INSERT OR UPDATE ON "public"."admin_action_logs" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_role_fk"('admin_user_id', 'admin');



CREATE OR REPLACE TRIGGER "cart_items_set_updated_at" BEFORE UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "cart_items_validate_partner_consistency" BEFORE INSERT OR UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_cart_item_partner_consistency"();



CREATE OR REPLACE TRIGGER "carts_set_updated_at" BEFORE UPDATE ON "public"."carts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "carts_validate_delivery_address_ownership" BEFORE INSERT OR UPDATE ON "public"."carts" FOR EACH ROW EXECUTE FUNCTION "public"."validate_cart_delivery_address_ownership"();



CREATE OR REPLACE TRIGGER "categories_set_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "client_addresses_require_client_role" BEFORE INSERT OR UPDATE ON "public"."client_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_role_fk"('client_user_id', 'client');



CREATE OR REPLACE TRIGGER "client_addresses_set_updated_at" BEFORE UPDATE ON "public"."client_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "courier_availabilities_set_updated_at" BEFORE UPDATE ON "public"."courier_availabilities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "courier_payouts_require_admin_processor_role" BEFORE INSERT OR UPDATE ON "public"."courier_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_role_fk"('processed_by_admin_user_id', 'admin');



CREATE OR REPLACE TRIGGER "courier_payouts_set_updated_at" BEFORE UPDATE ON "public"."courier_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "courier_reviews_validate_order" BEFORE INSERT OR UPDATE ON "public"."courier_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."validate_courier_review_order"();



CREATE OR REPLACE TRIGGER "couriers_guard_protected_columns" BEFORE UPDATE ON "public"."couriers" FOR EACH ROW EXECUTE FUNCTION "public"."guard_couriers_protected_columns"();



CREATE OR REPLACE TRIGGER "couriers_require_admin_reviewer_role" BEFORE INSERT OR UPDATE ON "public"."couriers" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_role_fk"('reviewed_by_admin_user_id', 'admin');



CREATE OR REPLACE TRIGGER "couriers_require_courier_role" BEFORE INSERT OR UPDATE ON "public"."couriers" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_role_fk"('user_id', 'courier');



CREATE OR REPLACE TRIGGER "couriers_set_updated_at" BEFORE UPDATE ON "public"."couriers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "deliveries_set_updated_at" BEFORE UPDATE ON "public"."deliveries" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "deliveries_validate_status_transition" BEFORE UPDATE ON "public"."deliveries" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."validate_delivery_status_transition"();



CREATE OR REPLACE TRIGGER "delivery_zones_set_updated_at" BEFORE UPDATE ON "public"."delivery_zones" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "loyalty_accounts_require_client_role" BEFORE INSERT OR UPDATE ON "public"."loyalty_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_role_fk"('client_user_id', 'client');



CREATE OR REPLACE TRIGGER "loyalty_accounts_set_updated_at" BEFORE UPDATE ON "public"."loyalty_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "loyalty_transactions_validate_source" BEFORE INSERT OR UPDATE ON "public"."loyalty_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_loyalty_transaction_source"();



CREATE OR REPLACE TRIGGER "notification_devices_set_updated_at" BEFORE UPDATE ON "public"."notification_devices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "notification_dispatches_set_updated_at" BEFORE UPDATE ON "public"."notification_dispatches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "order_items_validate_foodiz_pricing" BEFORE INSERT OR UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_order_item_foodiz_pricing"();



CREATE CONSTRAINT TRIGGER "order_items_validate_order_totals_after_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."order_items" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."validate_order_totals_trigger"();



CREATE OR REPLACE TRIGGER "order_items_validate_partner_consistency" BEFORE INSERT OR UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_order_item_partner_consistency"();



CREATE OR REPLACE TRIGGER "order_payments_set_updated_at" BEFORE UPDATE ON "public"."order_payments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "orders_set_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "orders_validate_cart_and_address_consistency" BEFORE INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."validate_order_cart_and_address_consistency"();



CREATE CONSTRAINT TRIGGER "orders_validate_order_totals_after_change" AFTER INSERT OR UPDATE ON "public"."orders" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."validate_order_totals_trigger"();



CREATE OR REPLACE TRIGGER "orders_validate_status_transition" BEFORE UPDATE ON "public"."orders" FOR EACH ROW WHEN (("old"."order_status" IS DISTINCT FROM "new"."order_status")) EXECUTE FUNCTION "public"."validate_order_status_transition"();



CREATE OR REPLACE TRIGGER "partner_documents_guard_update" BEFORE UPDATE ON "public"."partner_documents" FOR EACH ROW EXECUTE FUNCTION "public"."guard_partner_documents_update"();



CREATE OR REPLACE TRIGGER "partner_documents_require_admin_reviewer_role" BEFORE INSERT OR UPDATE ON "public"."partner_documents" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_role_fk"('reviewed_by_admin_user_id', 'admin');



CREATE OR REPLACE TRIGGER "partner_documents_set_updated_at" BEFORE UPDATE ON "public"."partner_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "partner_notification_campaigns_set_updated_at" BEFORE UPDATE ON "public"."partner_notification_campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "partner_notification_credit_ledger_validate_links" BEFORE INSERT OR UPDATE ON "public"."partner_notification_credit_ledger" FOR EACH ROW EXECUTE FUNCTION "public"."validate_notification_credit_ledger_links"();



CREATE OR REPLACE TRIGGER "partner_notification_pack_purchases_set_updated_at" BEFORE UPDATE ON "public"."partner_notification_pack_purchases" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "partner_notification_pack_purchases_validate_values" BEFORE INSERT OR UPDATE ON "public"."partner_notification_pack_purchases" FOR EACH ROW EXECUTE FUNCTION "public"."validate_notification_pack_purchase_values"();



CREATE OR REPLACE TRIGGER "partner_payouts_require_admin_processor_role" BEFORE INSERT OR UPDATE ON "public"."partner_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_role_fk"('processed_by_admin_user_id', 'admin');



CREATE OR REPLACE TRIGGER "partner_payouts_set_updated_at" BEFORE UPDATE ON "public"."partner_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "partner_reviews_validate_order" BEFORE INSERT OR UPDATE ON "public"."partner_reviews" FOR EACH ROW EXECUTE FUNCTION "public"."validate_partner_review_order"();



CREATE OR REPLACE TRIGGER "partners_guard_protected_columns" BEFORE UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."guard_partners_protected_columns"();



CREATE OR REPLACE TRIGGER "partners_require_admin_reviewer_role" BEFORE INSERT OR UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_role_fk"('reviewed_by_admin_user_id', 'admin');



CREATE OR REPLACE TRIGGER "partners_require_partner_role" BEFORE INSERT OR UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profile_role_fk"('user_id', 'partner');



CREATE OR REPLACE TRIGGER "partners_set_updated_at" BEFORE UPDATE ON "public"."partners" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "products_set_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "products_validate_category_partner_type" BEFORE INSERT OR UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."validate_product_category_partner_type"();



CREATE OR REPLACE TRIGGER "profiles_guard_protected_columns" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."guard_profiles_protected_columns"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "referrals_set_updated_at" BEFORE UPDATE ON "public"."referrals" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "satisfaction_responses_validate_order" BEFORE INSERT OR UPDATE ON "public"."satisfaction_responses" FOR EACH ROW EXECUTE FUNCTION "public"."validate_satisfaction_response_order"();



ALTER TABLE ONLY "public"."account_suspensions"
    ADD CONSTRAINT "account_suspensions_imposed_by_admin_user_id_fkey" FOREIGN KEY ("imposed_by_admin_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."account_suspensions"
    ADD CONSTRAINT "account_suspensions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_action_logs"
    ADD CONSTRAINT "admin_action_logs_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_delivery_address_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "public"."client_addresses"("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_addresses"
    ADD CONSTRAINT "client_addresses_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courier_availabilities"
    ADD CONSTRAINT "courier_availabilities_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courier_payouts"
    ADD CONSTRAINT "courier_payouts_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courier_payouts"
    ADD CONSTRAINT "courier_payouts_processed_by_admin_user_id_fkey" FOREIGN KEY ("processed_by_admin_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."courier_reviews"
    ADD CONSTRAINT "courier_reviews_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."courier_reviews"
    ADD CONSTRAINT "courier_reviews_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("id");



ALTER TABLE ONLY "public"."courier_reviews"
    ADD CONSTRAINT "courier_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."couriers"
    ADD CONSTRAINT "couriers_reviewed_by_admin_user_id_fkey" FOREIGN KEY ("reviewed_by_admin_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."couriers"
    ADD CONSTRAINT "couriers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_courier_id_fkey" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("id");



ALTER TABLE ONLY "public"."deliveries"
    ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_accounts"
    ADD CONSTRAINT "loyalty_accounts_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_courier_review_id_fkey" FOREIGN KEY ("courier_review_id") REFERENCES "public"."courier_reviews"("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_partner_review_id_fkey" FOREIGN KEY ("partner_review_id") REFERENCES "public"."partner_reviews"("id");



ALTER TABLE ONLY "public"."loyalty_transactions"
    ADD CONSTRAINT "loyalty_transactions_satisfaction_response_id_fkey" FOREIGN KEY ("satisfaction_response_id") REFERENCES "public"."satisfaction_responses"("id");



ALTER TABLE ONLY "public"."notification_devices"
    ADD CONSTRAINT "notification_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_dispatches"
    ADD CONSTRAINT "notification_dispatches_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."partner_notification_campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_dispatches"
    ADD CONSTRAINT "notification_dispatches_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."notification_devices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_dispatches"
    ADD CONSTRAINT "notification_dispatches_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."order_payments"
    ADD CONSTRAINT "order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_delivery_address_id_fkey" FOREIGN KEY ("delivery_address_id") REFERENCES "public"."client_addresses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "public"."delivery_zones"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id");



ALTER TABLE ONLY "public"."partner_documents"
    ADD CONSTRAINT "partner_documents_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_documents"
    ADD CONSTRAINT "partner_documents_reviewed_by_admin_user_id_fkey" FOREIGN KEY ("reviewed_by_admin_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."partner_notification_campaigns"
    ADD CONSTRAINT "partner_notification_campaigns_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_notification_credit_ledger"
    ADD CONSTRAINT "partner_notification_credit_ledger_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."partner_notification_campaigns"("id");



ALTER TABLE ONLY "public"."partner_notification_credit_ledger"
    ADD CONSTRAINT "partner_notification_credit_ledger_pack_purchase_id_fkey" FOREIGN KEY ("pack_purchase_id") REFERENCES "public"."partner_notification_pack_purchases"("id");



ALTER TABLE ONLY "public"."partner_notification_credit_ledger"
    ADD CONSTRAINT "partner_notification_credit_ledger_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_notification_pack_purchases"
    ADD CONSTRAINT "partner_notification_pack_purchases_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_payouts"
    ADD CONSTRAINT "partner_payouts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_payouts"
    ADD CONSTRAINT "partner_payouts_processed_by_admin_user_id_fkey" FOREIGN KEY ("processed_by_admin_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."partner_reviews"
    ADD CONSTRAINT "partner_reviews_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."partner_reviews"
    ADD CONSTRAINT "partner_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_reviews"
    ADD CONSTRAINT "partner_reviews_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_reviewed_by_admin_user_id_fkey" FOREIGN KEY ("reviewed_by_admin_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."partners"
    ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_referred_by_user_id_fkey" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."referrals"
    ADD CONSTRAINT "referrals_referrer_user_id_fkey" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."satisfaction_responses"
    ADD CONSTRAINT "satisfaction_responses_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."satisfaction_responses"
    ADD CONSTRAINT "satisfaction_responses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE "public"."account_suspensions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "account_suspensions_select_owner_or_admin" ON "public"."account_suspensions" FOR SELECT USING (("public"."is_admin"() OR ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."admin_action_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_action_logs_select_admin" ON "public"."admin_action_logs" FOR SELECT USING ("public"."is_admin"());



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cart_items_delete_owner_or_admin" ON "public"."cart_items" FOR DELETE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."carts" "c"
  WHERE (("c"."id" = "cart_items"."cart_id") AND ("c"."client_user_id" = "auth"."uid"()))))));



CREATE POLICY "cart_items_insert_owner" ON "public"."cart_items" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."carts" "c"
  WHERE (("c"."id" = "cart_items"."cart_id") AND ("c"."client_user_id" = "auth"."uid"())))) AND "public"."is_client"()));



CREATE POLICY "cart_items_select_owner_or_admin" ON "public"."cart_items" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."carts" "c"
  WHERE (("c"."id" = "cart_items"."cart_id") AND ("c"."client_user_id" = "auth"."uid"()))))));



CREATE POLICY "cart_items_update_owner_or_admin" ON "public"."cart_items" FOR UPDATE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."carts" "c"
  WHERE (("c"."id" = "cart_items"."cart_id") AND ("c"."client_user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."carts" "c"
  WHERE (("c"."id" = "cart_items"."cart_id") AND ("c"."client_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "carts_delete_owner_or_admin" ON "public"."carts" FOR DELETE USING ((("auth"."uid"() = "client_user_id") OR "public"."is_admin"()));



CREATE POLICY "carts_insert_owner" ON "public"."carts" FOR INSERT WITH CHECK ((("auth"."uid"() = "client_user_id") AND "public"."is_client"()));



CREATE POLICY "carts_select_owner_or_admin" ON "public"."carts" FOR SELECT USING ((("auth"."uid"() = "client_user_id") OR "public"."is_admin"()));



CREATE POLICY "carts_update_owner_or_admin" ON "public"."carts" FOR UPDATE USING ((("auth"."uid"() = "client_user_id") OR "public"."is_admin"())) WITH CHECK ((("auth"."uid"() = "client_user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_admin_delete" ON "public"."categories" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "categories_admin_insert" ON "public"."categories" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "categories_admin_update" ON "public"."categories" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "categories_select_authenticated" ON "public"."categories" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



ALTER TABLE "public"."client_addresses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_addresses_delete_owner_or_admin" ON "public"."client_addresses" FOR DELETE USING ((("auth"."uid"() = "client_user_id") OR "public"."is_admin"()));



CREATE POLICY "client_addresses_insert_owner" ON "public"."client_addresses" FOR INSERT WITH CHECK ((("auth"."uid"() = "client_user_id") AND "public"."is_client"()));



CREATE POLICY "client_addresses_select_owner_or_admin" ON "public"."client_addresses" FOR SELECT USING ((("auth"."uid"() = "client_user_id") OR "public"."is_admin"()));



CREATE POLICY "client_addresses_update_owner_or_admin" ON "public"."client_addresses" FOR UPDATE USING ((("auth"."uid"() = "client_user_id") OR "public"."is_admin"())) WITH CHECK ((("auth"."uid"() = "client_user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."courier_availabilities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courier_availabilities_delete_owner_or_admin" ON "public"."courier_availabilities" FOR DELETE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."couriers" "c"
  WHERE (("c"."id" = "courier_availabilities"."courier_id") AND ("c"."user_id" = "auth"."uid"()))))));



CREATE POLICY "courier_availabilities_insert_owner" ON "public"."courier_availabilities" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."couriers" "c"
  WHERE (("c"."id" = "courier_availabilities"."courier_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "courier_availabilities_select_owner_or_admin" ON "public"."courier_availabilities" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."couriers" "c"
  WHERE (("c"."id" = "courier_availabilities"."courier_id") AND ("c"."user_id" = "auth"."uid"()))))));



CREATE POLICY "courier_availabilities_update_owner_or_admin" ON "public"."courier_availabilities" FOR UPDATE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."couriers" "c"
  WHERE (("c"."id" = "courier_availabilities"."courier_id") AND ("c"."user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."couriers" "c"
  WHERE (("c"."id" = "courier_availabilities"."courier_id") AND ("c"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."courier_payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courier_payouts_select_owner_or_admin" ON "public"."courier_payouts" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."couriers" "c"
  WHERE (("c"."id" = "courier_payouts"."courier_id") AND ("c"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."courier_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courier_reviews_admin_delete" ON "public"."courier_reviews" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "courier_reviews_admin_update" ON "public"."courier_reviews" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "courier_reviews_insert_client_owner" ON "public"."courier_reviews" FOR INSERT WITH CHECK (("public"."is_client"() AND ("client_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "courier_reviews"."order_id") AND ("o"."client_user_id" = "auth"."uid"()))))));



CREATE POLICY "courier_reviews_select_author_courier_or_admin" ON "public"."courier_reviews" FOR SELECT USING (("public"."is_admin"() OR ("client_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."couriers" "c"
  WHERE (("c"."id" = "courier_reviews"."courier_id") AND ("c"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."couriers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "couriers_insert_owner" ON "public"."couriers" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."is_courier"()));



CREATE POLICY "couriers_select_owner_or_admin" ON "public"."couriers" FOR SELECT USING (("public"."is_admin"() OR ("auth"."uid"() = "user_id")));



CREATE POLICY "couriers_update_owner_or_admin" ON "public"."couriers" FOR UPDATE USING (("public"."is_admin"() OR ("auth"."uid"() = "user_id"))) WITH CHECK (("public"."is_admin"() OR ("auth"."uid"() = "user_id")));



ALTER TABLE "public"."deliveries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deliveries_select_visible_roles" ON "public"."deliveries" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "deliveries"."order_id") AND (("o"."client_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."partners" "p"
          WHERE (("p"."id" = "o"."partner_id") AND ("p"."user_id" = "auth"."uid"())))))))) OR (EXISTS ( SELECT 1
   FROM "public"."couriers" "c"
  WHERE (("c"."id" = "deliveries"."courier_id") AND ("c"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."delivery_zones" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delivery_zones_delete_admin" ON "public"."delivery_zones" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "delivery_zones_insert_admin" ON "public"."delivery_zones" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "delivery_zones_select_admin" ON "public"."delivery_zones" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "delivery_zones_update_admin" ON "public"."delivery_zones" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."domain_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "domain_events_select_admin" ON "public"."domain_events" FOR SELECT USING ("public"."is_admin"());



ALTER TABLE "public"."loyalty_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loyalty_accounts_select_owner_or_admin" ON "public"."loyalty_accounts" FOR SELECT USING (("public"."is_admin"() OR ("client_user_id" = "auth"."uid"())));



ALTER TABLE "public"."loyalty_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loyalty_transactions_select_owner_or_admin" ON "public"."loyalty_transactions" FOR SELECT USING (("public"."is_admin"() OR ("client_user_id" = "auth"."uid"())));



ALTER TABLE "public"."notification_devices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_devices_delete_owner_or_admin" ON "public"."notification_devices" FOR DELETE USING (("public"."is_admin"() OR ("user_id" = "auth"."uid"())));



CREATE POLICY "notification_devices_insert_owner" ON "public"."notification_devices" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notification_devices_select_owner_or_admin" ON "public"."notification_devices" FOR SELECT USING (("public"."is_admin"() OR ("user_id" = "auth"."uid"())));



CREATE POLICY "notification_devices_update_owner_or_admin" ON "public"."notification_devices" FOR UPDATE USING (("public"."is_admin"() OR ("user_id" = "auth"."uid"()))) WITH CHECK (("public"."is_admin"() OR ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."notification_dispatches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_dispatches_select_admin" ON "public"."notification_dispatches" FOR SELECT USING ("public"."is_admin"());



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_select_visible_roles" ON "public"."order_items" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND (("o"."client_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."partners" "p"
          WHERE (("p"."id" = "o"."partner_id") AND ("p"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM ("public"."deliveries" "d"
             JOIN "public"."couriers" "c" ON (("c"."id" = "d"."courier_id")))
          WHERE (("d"."order_id" = "o"."id") AND ("c"."user_id" = "auth"."uid"()))))))))));



ALTER TABLE "public"."order_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_payments_select_owner_or_admin" ON "public"."order_payments" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_payments"."order_id") AND ("o"."client_user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_select_visible_roles" ON "public"."orders" FOR SELECT USING (("public"."is_admin"() OR ("client_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "orders"."partner_id") AND ("p"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM ("public"."deliveries" "d"
     JOIN "public"."couriers" "c" ON (("c"."id" = "d"."courier_id")))
  WHERE (("d"."order_id" = "orders"."id") AND ("c"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."partner_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_documents_delete_admin" ON "public"."partner_documents" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "partner_documents_insert_owner" ON "public"."partner_documents" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "partner_documents"."partner_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "partner_documents_select_owner_or_admin" ON "public"."partner_documents" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "partner_documents"."partner_id") AND ("p"."user_id" = "auth"."uid"()))))));



CREATE POLICY "partner_documents_update_owner_or_admin" ON "public"."partner_documents" FOR UPDATE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "partner_documents"."partner_id") AND ("p"."user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "partner_documents"."partner_id") AND ("p"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."partner_notification_campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_notification_campaigns_select_owner_or_admin" ON "public"."partner_notification_campaigns" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "partner_notification_campaigns"."partner_id") AND ("p"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."partner_notification_credit_ledger" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_notification_credit_ledger_select_owner_or_admin" ON "public"."partner_notification_credit_ledger" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "partner_notification_credit_ledger"."partner_id") AND ("p"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."partner_notification_pack_purchases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_notification_pack_purchases_select_owner_or_admin" ON "public"."partner_notification_pack_purchases" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "partner_notification_pack_purchases"."partner_id") AND ("p"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."partner_payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_payouts_select_owner_or_admin" ON "public"."partner_payouts" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "partner_payouts"."partner_id") AND ("p"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."partner_reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partner_reviews_admin_delete" ON "public"."partner_reviews" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "partner_reviews_admin_update" ON "public"."partner_reviews" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "partner_reviews_insert_client_owner" ON "public"."partner_reviews" FOR INSERT WITH CHECK (("public"."is_client"() AND ("client_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "partner_reviews"."order_id") AND ("o"."client_user_id" = "auth"."uid"()))))));



CREATE POLICY "partner_reviews_select_author_partner_or_admin" ON "public"."partner_reviews" FOR SELECT USING (("public"."is_admin"() OR ("client_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "partner_reviews"."partner_id") AND ("p"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."partners" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "partners_insert_owner" ON "public"."partners" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND "public"."is_partner"()));



CREATE POLICY "partners_select_owner_or_admin" ON "public"."partners" FOR SELECT USING (("public"."is_admin"() OR ("auth"."uid"() = "user_id")));



CREATE POLICY "partners_update_owner_or_admin" ON "public"."partners" FOR UPDATE USING (("public"."is_admin"() OR ("auth"."uid"() = "user_id"))) WITH CHECK (("public"."is_admin"() OR ("auth"."uid"() = "user_id")));



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete_owner_or_admin" ON "public"."products" FOR DELETE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "products"."partner_id") AND ("p"."user_id" = "auth"."uid"()))))));



CREATE POLICY "products_insert_owner_or_admin" ON "public"."products" FOR INSERT WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "products"."partner_id") AND ("p"."user_id" = "auth"."uid"()))))));



CREATE POLICY "products_select_visible_owner_or_admin" ON "public"."products" FOR SELECT USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."partners" "own_p"
  WHERE (("own_p"."id" = "products"."partner_id") AND ("own_p"."user_id" = "auth"."uid"())))) OR (("auth"."role"() = 'authenticated'::"text") AND ("status" = 'active'::"public"."product_status_enum") AND ("is_available" = true) AND (EXISTS ( SELECT 1
   FROM "public"."partners" "visible_p"
  WHERE (("visible_p"."id" = "products"."partner_id") AND ("visible_p"."validation_status" = 'approved'::"public"."partner_validation_status_enum")))))));



CREATE POLICY "products_update_owner_or_admin" ON "public"."products" FOR UPDATE USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "products"."partner_id") AND ("p"."user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."partners" "p"
  WHERE (("p"."id" = "products"."partner_id") AND ("p"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own_or_admin" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



CREATE POLICY "profiles_update_own_or_admin" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR "public"."is_admin"())) WITH CHECK ((("auth"."uid"() = "user_id") OR "public"."is_admin"()));



ALTER TABLE "public"."referrals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "referrals_select_participants_or_admin" ON "public"."referrals" FOR SELECT USING (("public"."is_admin"() OR ("referrer_user_id" = "auth"."uid"()) OR ("referred_user_id" = "auth"."uid"())));



ALTER TABLE "public"."satisfaction_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "satisfaction_responses_admin_delete" ON "public"."satisfaction_responses" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "satisfaction_responses_admin_update" ON "public"."satisfaction_responses" FOR UPDATE USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "satisfaction_responses_insert_client_owner" ON "public"."satisfaction_responses" FOR INSERT WITH CHECK (("public"."is_client"() AND ("client_user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "satisfaction_responses"."order_id") AND ("o"."client_user_id" = "auth"."uid"()))))));



CREATE POLICY "satisfaction_responses_select_owner_or_admin" ON "public"."satisfaction_responses" FOR SELECT USING (("public"."is_admin"() OR ("client_user_id" = "auth"."uid"())));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."account_suspensions" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."account_suspensions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."account_suspensions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_action_logs" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_action_logs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_action_logs" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."orders" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_global_stats_view" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."admin_global_stats_view" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."cart_items" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."cart_items" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."cart_items" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."carts" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."carts" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."carts" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."categories" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."categories" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."categories" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."client_addresses" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."client_addresses" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."client_addresses" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."couriers" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."couriers" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."couriers" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."deliveries" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."deliveries" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."deliveries" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partners" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partners" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partners" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_assigned_delivery_view" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_assigned_delivery_view" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_availabilities" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_availabilities" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_availabilities" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_available_deliveries_view" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_available_deliveries_view" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_payout_eligible_view" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_payout_eligible_view" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_payouts" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_payouts" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_payouts" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_revenue_raw_view" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_revenue_raw_view" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_reviews" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_reviews" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_reviews" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_stats_view" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."courier_stats_view" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."delivery_zones" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."delivery_zones" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."delivery_zones" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."domain_events" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."domain_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."domain_events" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."loyalty_accounts" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."loyalty_accounts" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."loyalty_accounts" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."loyalty_transactions" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."loyalty_transactions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."loyalty_transactions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notification_devices" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notification_devices" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notification_devices" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notification_dispatches" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notification_dispatches" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."notification_dispatches" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_items" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_items" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_items" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_payments" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_payments" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_payments" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_read_model_view" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."order_read_model_view" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_documents" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_documents" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_documents" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_notification_campaigns" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_notification_campaigns" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_notification_campaigns" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_notification_credit_ledger" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_notification_credit_ledger" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_notification_credit_ledger" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_notification_pack_purchases" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_notification_pack_purchases" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_notification_pack_purchases" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_payout_eligible_view" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_payout_eligible_view" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_payouts" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_payouts" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_payouts" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_public_view" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_public_view" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_revenue_raw_view" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_revenue_raw_view" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_reviews" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_reviews" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_reviews" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_stats_view" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."partner_stats_view" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."products" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."products" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."products" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."referrals" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."referrals" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."referrals" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."satisfaction_responses" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."satisfaction_responses" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."satisfaction_responses" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";































