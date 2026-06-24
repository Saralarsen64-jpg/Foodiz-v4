import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_LOGIN_LOCK_MS,
  ADMIN_LOGIN_MAX_ATTEMPTS,
  ADMIN_LOGIN_WINDOW_MS,
  clearAdminLoginThrottle,
  getAdminLoginThrottle,
  recordAdminLoginFailure,
} from "../../src/utils/adminLoginThrottle.ts";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

test("le portail admin se verrouille après trop de tentatives locales", () => {
  const sessionStorage = storage();
  const now = 10_000;

  for (let attempt = 1; attempt < ADMIN_LOGIN_MAX_ATTEMPTS; attempt += 1) {
    const throttle = recordAdminLoginFailure(now + attempt, sessionStorage);
    assert.equal(throttle.locked, false);
  }

  const locked = recordAdminLoginFailure(now + ADMIN_LOGIN_MAX_ATTEMPTS, sessionStorage);
  assert.equal(locked.locked, true);
  assert.equal(locked.remainingLockMs, ADMIN_LOGIN_LOCK_MS);
});

test("le verrouillage admin expire sans bloquer durablement l'accès légitime", () => {
  const sessionStorage = storage();
  const now = 20_000;

  for (let attempt = 1; attempt <= ADMIN_LOGIN_MAX_ATTEMPTS; attempt += 1) {
    recordAdminLoginFailure(now + attempt, sessionStorage);
  }

  assert.equal(getAdminLoginThrottle(now + ADMIN_LOGIN_MAX_ATTEMPTS, sessionStorage).locked, true);
  assert.equal(
    getAdminLoginThrottle(now + ADMIN_LOGIN_MAX_ATTEMPTS + ADMIN_LOGIN_LOCK_MS, sessionStorage).locked,
    false,
  );
});

test("les tentatives admin anciennes sont oubliées et une réussite nettoie le compteur", () => {
  const sessionStorage = storage();
  const now = 30_000;

  recordAdminLoginFailure(now, sessionStorage);
  recordAdminLoginFailure(now + 1_000, sessionStorage);
  assert.equal(getAdminLoginThrottle(now + 2_000, sessionStorage).attempts, 2);

  assert.equal(
    getAdminLoginThrottle(now + ADMIN_LOGIN_WINDOW_MS + 1, sessionStorage).attempts,
    0,
  );

  recordAdminLoginFailure(now + ADMIN_LOGIN_WINDOW_MS + 2, sessionStorage);
  clearAdminLoginThrottle(sessionStorage);
  assert.equal(getAdminLoginThrottle(now + ADMIN_LOGIN_WINDOW_MS + 3, sessionStorage).attempts, 0);
});
