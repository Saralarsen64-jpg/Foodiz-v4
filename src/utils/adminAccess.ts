const ADMIN_ACCESS_KEY = "foodiz_admin_access_v1";
export const ADMIN_ACCESS_TTL_MS = 30 * 60 * 1000;

type AdminAccessGrant = {
  userId: string;
  authenticatedAt: number;
  expiresAt: number;
};

type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserSessionStorage(): SessionStorageLike | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function grantAdminAccess(
  userId: string,
  now = Date.now(),
  storage = browserSessionStorage(),
) {
  if (!storage || !userId) return;
  const grant: AdminAccessGrant = {
    userId,
    authenticatedAt: now,
    expiresAt: now + ADMIN_ACCESS_TTL_MS,
  };
  storage.setItem(ADMIN_ACCESS_KEY, JSON.stringify(grant));
}

export function clearAdminAccess(storage = browserSessionStorage()) {
  storage?.removeItem(ADMIN_ACCESS_KEY);
}

export function hasValidAdminAccess(
  userId: string,
  now = Date.now(),
  storage = browserSessionStorage(),
) {
  if (!storage || !userId) return false;

  try {
    const rawGrant = storage.getItem(ADMIN_ACCESS_KEY);
    if (!rawGrant) return false;

    const grant = JSON.parse(rawGrant) as Partial<AdminAccessGrant>;
    const valid =
      grant.userId === userId
      && Number.isFinite(grant.authenticatedAt)
      && Number.isFinite(grant.expiresAt)
      && Number(grant.authenticatedAt) <= now
      && Number(grant.expiresAt) > now
      && Number(grant.expiresAt) - Number(grant.authenticatedAt) === ADMIN_ACCESS_TTL_MS;

    if (!valid) clearAdminAccess(storage);
    return valid;
  } catch {
    clearAdminAccess(storage);
    return false;
  }
}
