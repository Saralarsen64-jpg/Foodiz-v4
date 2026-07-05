import type { Handler } from "@netlify/functions";

import { adminSupabase, authenticatedUser, userRole } from "./_lib/auth.js";
import { sendWeelloEmail } from "./_lib/weello-email.js";

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const supportPathByRole: Record<string, string> = {
  partner: "/partner/support",
  courier: "/courier/support",
  client: "/client/help-center",
};

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });

  try {
    const user = await authenticatedUser(event.headers);
    if (!user || await userRole(user.id) !== "admin") {
      return reply(403, { error: "Admin required" });
    }

    const { ticketId, action, response, summary } = JSON.parse(event.body || "{}") as {
      ticketId?: string;
      action?: "resolve";
      response?: string;
      summary?: string;
    };
    const finalResponse = String(response || "").trim();
    if (!ticketId || action !== "resolve" || finalResponse.length < 2) {
      return reply(400, { error: "Ticket et réponse obligatoires." });
    }

    const { data: ticketBefore } = await adminSupabase
      .from("support_tickets")
      .select("id,user_id,user_email,user_role,subject,status")
      .eq("id", ticketId)
      .maybeSingle();
    if (!ticketBefore) return reply(404, { error: "Ticket introuvable." });

    const { error: resolveError } = await adminSupabase.rpc("admin_resolve_support_ticket", {
      target_ticket_id: ticketId,
      target_response: finalResponse,
      target_summary: String(summary || finalResponse).trim(),
    });
    if (resolveError) throw resolveError;

    let recipientEmail = ticketBefore.user_email || "";
    let recipientName = "Weelloer";
    if (ticketBefore.user_id) {
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("email,first_name,full_name")
        .eq("id", ticketBefore.user_id)
        .maybeSingle();
      recipientEmail = recipientEmail || profile?.email || "";
      recipientName = profile?.first_name || profile?.full_name || recipientName;
    }

    let emailSent = false;
    if (recipientEmail) {
      const publicUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || "https://weello.app").replace(/\/$/, "");
      const role = ticketBefore.user_role || "client";
      const supportPath = supportPathByRole[role] || supportPathByRole.client;
      const emailResult = await sendWeelloEmail({
        to: recipientEmail,
        subject: "Votre demande Weello a été traitée",
        headline: `Votre demande a été traitée, ${recipientName}`,
        body: [
          `Nous avons traité votre demande “${ticketBefore.subject || "Support Weello"}”. Voici la réponse de l’équipe Weello :`,
          finalResponse,
          "Merci de faire confiance à Weello. Si le sujet n’est pas totalement résolu, vous pouvez rouvrir une demande depuis votre espace.",
        ],
        emailType: "support_ticket_resolved",
        recipientUserId: ticketBefore.user_id || null,
        required: false,
        action: {
          label: "Ouvrir mon espace Weello",
          url: `${publicUrl}${supportPath}`,
        },
        metadata: {
          ticketId,
          previousStatus: ticketBefore.status,
          adminId: user.id,
        },
      });
      emailSent = emailResult.sent === true;
    }

    return reply(200, { resolved: true, emailSent });
  } catch (error) {
    console.error("Admin support ticket action failed", error);
    return reply(500, { error: "Le ticket n’a pas pu être traité." });
  }
};

export { handler };
