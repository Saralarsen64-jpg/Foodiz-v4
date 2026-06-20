import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { normalizePublicSignupRole } from "../../src/utils/authRoles.ts";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/28_phase1_auth_and_profile_security.sql"),
  "utf8",
);
const deprecatedBootstrap = readFileSync(
  join(root, "supabase/foodiz_auth_roles.sql"),
  "utf8",
);
const authProfile = readFileSync(join(root, "src/utils/authProfile.ts"), "utf8");

test("public signup roles never include admin", () => {
  assert.equal(normalizePublicSignupRole("client"), "client");
  assert.equal(normalizePublicSignupRole("partner"), "partner");
  assert.equal(normalizePublicSignupRole("courier"), "courier");
  assert.equal(normalizePublicSignupRole("admin"), "client");
  assert.equal(normalizePublicSignupRole("ADMIN"), "client");
  assert.equal(normalizePublicSignupRole(null), "client");
  assert.equal(normalizePublicSignupRole(undefined), "client");
});

test("the phase 1 migration removes both legacy auth triggers", () => {
  assert.match(migration, /DROP TRIGGER IF EXISTS on_auth_user_created ON auth\.users;/);
  assert.match(migration, /DROP TRIGGER IF EXISTS on_auth_user_created_foodiz ON auth\.users;/);
  assert.match(migration, /DROP FUNCTION IF EXISTS public\.handle_new_user\(\);/);
  assert.equal(
    (migration.match(/CREATE TRIGGER on_auth_user_created_foodiz/g) || []).length,
    1,
  );
});

test("the authoritative database trigger whitelists only public roles", () => {
  assert.match(
    migration,
    /IN \('client', 'partner', 'courier'\)[\s\S]*ELSE 'client'/,
  );
  assert.doesNotMatch(
    migration,
    /raw_user_meta_data ->> 'role' IN \([^)]*'admin'/,
  );
});

test("admin promotion is restricted to trusted database roles", () => {
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.promote_user_to_admin\(target_user_id uuid\)/,
  );
  assert.match(
    migration,
    /current_user NOT IN \('postgres', 'service_role', 'supabase_admin'\)/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.promote_user_to_admin\(uuid\) FROM authenticated;/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.promote_user_to_admin\(uuid\) TO service_role;/,
  );
});

test("migration repairs known production schema drift", () => {
  assert.match(
    migration,
    /ALTER TABLE public\.partner_applications[\s\S]*ADD COLUMN IF NOT EXISTS rejection_reason text/,
  );
  assert.match(
    migration,
    /ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public\.profiles\(id\)/,
  );
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.create_order_delivery_code/,
  );
  assert.match(migration, /extensions\.gen_random_bytes\(4\)/);
  assert.match(migration, /extensions\.digest\(candidate, 'sha256'\)/);
});

test("signup referral creation is pending and does not credit points", () => {
  assert.match(
    migration,
    /sponsor_id, NEW\.id, supplied_ref_code, 'pending', 500, NULL/,
  );
  assert.doesNotMatch(migration, /points_balance\s*=\s*points_balance\s*\+\s*500/);
  assert.doesNotMatch(migration, /referral_count\s*=\s*referral_count\s*\+\s*1/);
});

test("authenticated users cannot directly create profile rows", () => {
  assert.match(migration, /DROP POLICY IF EXISTS "profiles_insert_own_mvp"/);
  assert.doesNotMatch(migration, /CREATE POLICY[^;]+ON public\.profiles[^;]+FOR INSERT/);
  assert.doesNotMatch(authProfile, /\.from\("profiles"\)[\s\S]{0,300}\.upsert\(/);
});

test("profile reads are self/admin only and cross-role access uses narrow RPCs", () => {
  assert.match(migration, /CREATE POLICY "profiles_select_self_or_admin_phase1"/);
  assert.match(
    migration,
    /auth\.uid\(\) = id\s+OR public\.current_user_has_role\('admin'\)/,
  );
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_partner_order_customers\(\)/);
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.get_courier_order_client_contact\(target_order_id uuid\)/,
  );
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.get_client_order_courier_contact\(target_order_id uuid\)/,
  );
});

test("the standalone legacy auth bootstrap cannot be executed accidentally", () => {
  assert.match(deprecatedBootstrap, /DEPRECATED AND INTENTIONALLY NON-EXECUTABLE/);
  assert.match(deprecatedBootstrap, /RAISE EXCEPTION/);
  assert.doesNotMatch(deprecatedBootstrap, /CREATE TRIGGER/i);
});
