import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_ACCESS_TTL_MS,
  clearAdminAccess,
  grantAdminAccess,
  hasValidAdminAccess,
} from "../../src/utils/adminAccess.ts";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test("un accès admin exige une authentification dédiée récente", () => {
  const sessionStorage = storage();
  assert.equal(hasValidAdminAccess("admin-1", 1_000, sessionStorage), false);

  grantAdminAccess("admin-1", 1_000, sessionStorage);
  assert.equal(hasValidAdminAccess("admin-1", 1_001, sessionStorage), true);
  assert.equal(hasValidAdminAccess("another-admin", 1_001, sessionStorage), false);
});

test("l'autorisation admin expire strictement après trente minutes", () => {
  const sessionStorage = storage();
  grantAdminAccess("admin-1", 10_000, sessionStorage);

  assert.equal(
    hasValidAdminAccess("admin-1", 10_000 + ADMIN_ACCESS_TTL_MS - 1, sessionStorage),
    true,
  );
  assert.equal(
    hasValidAdminAccess("admin-1", 10_000 + ADMIN_ACCESS_TTL_MS, sessionStorage),
    false,
  );
});

test("la déconnexion supprime l'autorisation locale admin", () => {
  const sessionStorage = storage();
  grantAdminAccess("admin-1", 1_000, sessionStorage);
  clearAdminAccess(sessionStorage);
  assert.equal(hasValidAdminAccess("admin-1", 1_001, sessionStorage), false);
});
