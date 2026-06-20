export type PublicSignupRole = "client" | "partner" | "courier";

export function normalizePublicSignupRole(value: string | null | undefined): PublicSignupRole {
  return value === "partner" || value === "courier" ? value : "client";
}
