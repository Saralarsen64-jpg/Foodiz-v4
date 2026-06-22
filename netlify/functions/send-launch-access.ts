import type { Handler } from "@netlify/functions";
import {
  adminSupabase,
  appIsLaunched,
  authenticatedUser,
  userRole,
} from "./_lib/auth.js";
import { createLaunchToken, sendPrelaunchEmail } from "./_lib/prelaunch.js";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const user = await authenticatedUser(event.headers);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }
  if (await userRole(user.id) !== "admin") {
    return { statusCode: 403, body: JSON.stringify({ error: "Admin required" }) };
  }
  if (!(await appIsLaunched())) {
    return {
      statusCode: 409,
      body: JSON.stringify({
        error: "Passez d’abord app_settings.launch_status.launched à true avant d’envoyer les accès.",
      }),
    };
  }

  const { data: profiles, error } = await adminSupabase
    .from("prelaunch_profiles")
    .select("id,user_id,email,first_name,status,role")
    .eq("status", "prelaunch_pending")
    .order("created_at")
    .limit(100);
  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "Impossible de préparer les accès." }) };
  }

  const appUrl = (process.env.APP_URL || "https://www.foodiz.co").replace(/\/$/, "");
  let sent = 0;
  let skippedUnvalidatedCouriers = 0;
  const failed: string[] = [];

  for (const profile of profiles || []) {
    if (profile.role === "livreur") {
      const { data: courierApplication } = await adminSupabase
        .from("courier_applications")
        .select("status,document_review_status")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      if (courierApplication?.status !== "validated" || courierApplication.document_review_status !== "approved") {
        skippedUnvalidatedCouriers += 1;
        continue;
      }
    }

    const token = createLaunchToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const activationUrl = `${appUrl}/activate?token=${encodeURIComponent(token.raw)}`;

    try {
      await sendPrelaunchEmail({
        to: profile.email,
        subject: "Votre accès Foodiz est ouvert",
        headline: `Foodiz est lancé, ${profile.first_name}`,
        body: "Votre compte est prêt. Activez maintenant votre accès sécurisé pour rejoindre Foodiz.",
        actionLabel: "Activer mon accès",
        actionUrl: activationUrl,
      });

      const notifiedAt = new Date().toISOString();
      const { error: updateError } = await adminSupabase
        .from("prelaunch_profiles")
        .update({
          status: "launch_email_sent",
          launch_token: token.hash,
          launch_token_expires_at: expiresAt,
          launch_notified_at: notifiedAt,
        })
        .eq("id", profile.id);
      if (updateError) throw updateError;
      sent += 1;
    } catch (sendError) {
      console.error("Launch access email failed:", profile.id, sendError);
      failed.push(profile.id);
    }
  }

  return {
    statusCode: failed.length ? 207 : 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sent,
      skippedUnvalidatedCouriers,
      failed: failed.length,
      failedProfileIds: failed,
    }),
  };
};

export { handler };
