const ADMIN_LOGIN_THROTTLE_KEY = "weello_admin_login_throttle_v1";

export const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
export const ADMIN_LOGIN_WINDOW_MS = 10 * 60 * 1000;
export const ADMIN_LOGIN_LOCK_MS = 5 * 60 * 1000;

type AdminLoginThrottle = {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
};

type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserSessionStorage(): SessionStorageLike | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

function emptyThrottle(now: number): AdminLoginThrottle {
  return { attempts: 0, firstAttemptAt: now };
}

function readThrottle(
  now = Date.now(),
  storage = browserSessionStorage(),
): AdminLoginThrottle {
  if (!storage) return emptyThrottle(now);

  try {
    const raw = storage.getItem(ADMIN_LOGIN_THROTTLE_KEY);
    if (!raw) return emptyThrottle(now);

    const throttle = JSON.parse(raw) as Partial<AdminLoginThrottle>;
    const attempts = Number(throttle.attempts);
    const firstAttemptAt = Number(throttle.firstAttemptAt);
    const lockedUntil = Number(throttle.lockedUntil);

    if (!Number.isFinite(attempts) || !Number.isFinite(firstAttemptAt)) {
      storage.removeItem(ADMIN_LOGIN_THROTTLE_KEY);
      return emptyThrottle(now);
    }

    if (Number.isFinite(lockedUntil) && lockedUntil > now) {
      return { attempts, firstAttemptAt, lockedUntil };
    }

    if (now - firstAttemptAt >= ADMIN_LOGIN_WINDOW_MS) {
      storage.removeItem(ADMIN_LOGIN_THROTTLE_KEY);
      return emptyThrottle(now);
    }

    return {
      attempts: Math.max(0, attempts),
      firstAttemptAt,
      lockedUntil: Number.isFinite(lockedUntil) ? lockedUntil : undefined,
    };
  } catch {
    storage.removeItem(ADMIN_LOGIN_THROTTLE_KEY);
    return emptyThrottle(now);
  }
}

function writeThrottle(
  throttle: AdminLoginThrottle,
  storage = browserSessionStorage(),
) {
  storage?.setItem(ADMIN_LOGIN_THROTTLE_KEY, JSON.stringify(throttle));
}

export function getAdminLoginThrottle(
  now = Date.now(),
  storage = browserSessionStorage(),
) {
  const throttle = readThrottle(now, storage);
  const remainingLockMs = Math.max(0, Number(throttle.lockedUntil || 0) - now);

  return {
    attempts: throttle.attempts,
    locked: remainingLockMs > 0,
    remainingLockMs,
  };
}

export function recordAdminLoginFailure(
  now = Date.now(),
  storage = browserSessionStorage(),
) {
  const throttle = readThrottle(now, storage);
  const attempts = throttle.attempts + 1;
  const nextThrottle: AdminLoginThrottle = {
    attempts,
    firstAttemptAt: throttle.attempts > 0 ? throttle.firstAttemptAt : now,
    lockedUntil: attempts >= ADMIN_LOGIN_MAX_ATTEMPTS ? now + ADMIN_LOGIN_LOCK_MS : undefined,
  };

  writeThrottle(nextThrottle, storage);
  return getAdminLoginThrottle(now, storage);
}

export function clearAdminLoginThrottle(storage = browserSessionStorage()) {
  storage?.removeItem(ADMIN_LOGIN_THROTTLE_KEY);
}
