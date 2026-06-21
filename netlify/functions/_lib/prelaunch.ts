import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";

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
}: {
  to: string;
  subject: string;
  headline: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FOODIZ_EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Missing Resend environment variables");

  const action = actionLabel && actionUrl
    ? `<p style="margin:30px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#d8a84f;color:#050505;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:700">${escapeHtml(actionLabel)}</a></p>`
    : "";

  await new Resend(apiKey).emails.send({
    from,
    to,
    subject,
    html: `
      <div style="background:#050505;padding:36px 18px;font-family:Arial,sans-serif;color:#fff8ea">
        <div style="max-width:620px;margin:0 auto;border:1px solid rgba(216,168,79,.35);border-radius:24px;padding:34px;background:#111">
          <p style="color:#d8a84f;font-size:13px;letter-spacing:.2em;text-transform:uppercase;margin:0 0 18px">Foodiz</p>
          <h1 style="font-family:Georgia,serif;font-size:32px;margin:0 0 18px">${escapeHtml(headline)}</h1>
          <p style="color:#d8d0c2;line-height:1.7;font-size:16px">${escapeHtml(body)}</p>
          ${action}
          <p style="color:#8d877e;font-size:12px;margin-top:30px">Foodiz — l’app qui régale clients, livreurs et partenaires.</p>
        </div>
      </div>
    `,
  });
}
