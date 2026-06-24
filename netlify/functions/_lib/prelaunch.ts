import { createHash, randomBytes } from "node:crypto";
import { sendFoodizEmail } from "./foodiz-email.js";

export function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeFoodizPhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^0[1-9]\d{8}$/.test(digits)) return `+33${digits.slice(1)}`;
  if (/^33[1-9]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^0033[1-9]\d{8}$/.test(digits)) return `+${digits.slice(2)}`;
  if (/^[1-9]\d{7,14}$/.test(digits)) return `+${digits}`;
  return null;
}

export function cleanText(value: unknown, maxLength = 120) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createLaunchToken() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: sha256(raw) };
}

export function requestFingerprint(headers: Record<string, string | undefined>) {
  const forwarded = headers["x-forwarded-for"] || headers["client-ip"] || "unknown";
  const ip = forwarded.split(",")[0]?.trim() || "unknown";
  return sha256(`${ip}|${headers["user-agent"] || "unknown"}`);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendPrelaunchEmail({
  to,
  subject,
  headline,
  body,
  actionLabel,
  actionUrl,
  recipientUserId,
  emailType = "launch_access",
  required = true,
}: {
  to: string;
  subject: string;
  headline: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  recipientUserId?: string | null;
  emailType?: "prelaunch_confirmation" | "launch_access" | "professional_documents_received" | "professional_approved" | "professional_replacement_requested" | "professional_rejected";
  required?: boolean;
}) {
  return sendFoodizEmail({
    to,
    subject,
    headline,
    body,
    emailType,
    recipientUserId,
    required,
    action: actionLabel && actionUrl ? { label: actionLabel, url: actionUrl } : null,
  });
}
