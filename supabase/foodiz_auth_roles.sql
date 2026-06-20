-- DEPRECATED AND INTENTIONALLY NON-EXECUTABLE.
--
-- This former bootstrap script accepted a role directly from auth metadata and
-- could coexist with the authoritative migration trigger. It must never be run
-- against Foodiz.
--
-- Use the ordered files in supabase/migrations instead. Phase 1 security is
-- consolidated by 28_phase1_auth_and_profile_security.sql.

DO $$
BEGIN
  RAISE EXCEPTION
    'Deprecated Foodiz auth bootstrap. Apply supabase/migrations through the Supabase CLI.';
END;
$$;
