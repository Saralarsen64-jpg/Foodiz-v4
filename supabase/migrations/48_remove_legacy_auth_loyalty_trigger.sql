-- A legacy trigger still existed in production outside the current migration
-- chain. It duplicates an obsolete loyalty table write on every auth signup
-- and can abort the whole Auth transaction. The authoritative bootstrap is
-- public.handle_new_foodiz_user (migration 28).
DROP TRIGGER IF EXISTS on_user_created_loyalty ON auth.users;
DROP FUNCTION IF EXISTS public.create_loyalty_balance();
