import { Resend } from "resend";
import { adminSupabase } from "./auth.js";

export type WeelloEmailType =
  | "prelaunch_confirmation"
  | "launch_access"
  | "professional_signup_confirmation"
  | "professional_documents_received"
  | "professional_approved"
  | "professional_replacement_requested"
  | "professional_rejected"
  | "support_ticket_received"
  | "support_ticket_resolved"
  | "financial_document"
  | "security";

type WeelloEmailAction = {
  label: string;
  url: string;
};

type WeelloEmailInput = {
  to: string;
  subject: string;
  headline: string;
  body: string | string[];
  emailType: WeelloEmailType;
  recipientUserId?: string | null;
  eyebrow?: string;
  action?: WeelloEmailAction | null;
  secondaryAction?: WeelloEmailAction | null;
  metadata?: Record<string, unknown>;
  required?: boolean;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function bodyParagraphs(body: string | string[]) {
  const paragraphs = Array.isArray(body) ? body : [body];
  return paragraphs
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => `<p style="margin:0 0 16px;color:#d8d0c2;line-height:1.75;font-size:16px">${escapeHtml(paragraph)}</p>`)
    .join("");
}

function actionHtml(action?: WeelloEmailAction | null, secondaryAction?: WeelloEmailAction | null) {
  const primary = action
    ? `<p style="margin:30px 0 12px"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#d8a84f;color:#050505;text-decoration:none;padding:15px 25px;border-radius:14px;font-weight:800">${escapeHtml(action.label)}</a></p>`
    : "";
  const secondary = secondaryAction
    ? `<p style="margin:10px 0 0"><a href="${escapeHtml(secondaryAction.url)}" style="color:#d8a84f;text-decoration:none;font-size:14px;font-weight:700">${escapeHtml(secondaryAction.label)}</a></p>`
    : "";
  return primary + secondary;
}

function emailHtml(input: WeelloEmailInput) {
  const eyebrow = input.eyebrow || "Weello";
  return `
    <div style="margin:0;padding:0;background:#050505;font-family:Arial,Helvetica,sans-serif;color:#fff8ea">
      <div style="padding:38px 18px">
        <div style="max-width:660px;margin:0 auto;border:1px solid rgba(216,168,79,.38);border-radius:28px;overflow:hidden;background:#0b0b0b;box-shadow:0 24px 80px rgba(0,0,0,.45)">
          <div style="background:linear-gradient(135deg,#d8b98f,#b98d45);padding:26px 26px 22px;color:#050505">
            <p style="margin:0;font-family:Georgia,serif;font-size:36px;font-style:italic;font-weight:700;letter-spacing:-.03em">Weello</p>
            <p style="margin:10px 0 0;font-size:11px;letter-spacing:.24em;text-transform:uppercase;font-weight:800">${escapeHtml(eyebrow)}</p>
          </div>
          <div style="padding:34px 28px 30px;background:radial-gradient(circle at top right,rgba(216,168,79,.16),transparent 34%),#0b0b0b">
            <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:32px;line-height:1.12;color:#fff8ea">${escapeHtml(input.headline)}</h1>
            ${bodyParagraphs(input.body)}
            ${actionHtml(input.action, input.secondaryAction)}
            <div style="margin-top:32px;padding-top:18px;border-top:1px solid rgba(216,168,79,.16)">
              <p style="margin:0;color:#8d877e;font-size:12px;line-height:1.6">Weello — l’app qui régale clients, livreurs et partenaires.</p>
              <p style="margin:8px 0 0;color:#8d877e;font-size:11px;line-height:1.6">Si vous n’êtes pas à l’origine de cette action, contactez Weello : contact@weello.co.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function logEmailEvent(input: WeelloEmailInput, status: "sent" | "failed" | "skipped", details: {
  providerMessageId?: string | null;
  errorMessage?: string | null;
}) {
  try {
    await adminSupabase.from("foodiz_email_events").insert({
      recipient_user_id: input.recipientUserId || null,
      recipient_email: input.to,
      email_type: input.emailType,
      subject: input.subject,
      status,
      provider: "resend",
      provider_message_id: details.providerMessageId || null,
      metadata: input.metadata || {},
      error_message: details.errorMessage || null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      failed_at: status === "failed" ? new Date().toISOString() : null,
    });
  } catch (error) {
    // The email must not fail only because the audit table is not deployed yet.
    console.error("Weello email event logging failed", error);
  }
}

export async function sendWeelloEmail(input: WeelloEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WEELLO_EMAIL_FROM
    || process.env.EMAIL_FROM
    || process.env.FOODIZ_EMAIL_FROM
    || "Weello <contact@weello.co>";
  if (!apiKey) {
    await logEmailEvent(input, "skipped", { errorMessage: "Missing Resend environment variables" });
    if (input.required) throw new Error("Missing Resend environment variables");
    return { sent: false, skipped: true };
  }

  try {
    const result = await new Resend(apiKey).emails.send({
      from,
      to: input.to,
      replyTo: "contact@weello.co",
      subject: input.subject,
      html: emailHtml(input),
    });
    if (result.error) throw new Error(result.error.message);
    await logEmailEvent(input, "sent", { providerMessageId: result.data?.id || null });
    return { sent: true, providerMessageId: result.data?.id || null };
  } catch (error: any) {
    const message = error?.message || "Email delivery failed";
    await logEmailEvent(input, "failed", { errorMessage: message });
    if (input.required) throw error;
    return { sent: false, error: message };
  }
}
