import type { Handler } from "@netlify/functions";

import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const contactTimes = new Set(["morning", "afternoon", "evening", "indifferent"]);

const handler: Handler = async (event) => {
  const user = await authenticatedUser(event.headers);
  if (!user) return reply(401, { error: "Unauthorized" });

  if (event.httpMethod === "GET") {
    const { data, error } = await adminSupabase
      .from("courier_insurance_referrals")
      .select("id,status,phone,preferred_contact_time,consented_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return reply(500, { error: "INSURANCE_REFERRAL_LOAD_FAILED" });
    return reply(200, { referral: data || null });
  }

  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "Requête invalide." });
  }

  const phone = String(body.phone || "").replace(/[^+0-9]/g, "").slice(0, 20);
  const preferredContactTime = String(body.preferredContactTime || "indifferent");
  if (!/^\+?[0-9]{8,15}$/.test(phone)) {
    return reply(400, { error: "Renseignez un numéro de téléphone valide." });
  }
  if (!contactTimes.has(preferredContactTime)) {
    return reply(400, { error: "Créneau de rappel invalide." });
  }
  if (body.consentPartnerContact !== true) {
    return reply(400, { error: "Votre accord est nécessaire pour demander un rappel." });
  }

  const now = new Date().toISOString();
  const { data: existing, error: existingError } = await adminSupabase
    .from("courier_insurance_referrals")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();
  if (existingError) return reply(500, { error: "INSURANCE_REFERRAL_SAVE_FAILED" });

  const operation = existing
    ? adminSupabase
        .from("courier_insurance_referrals")
        .update({
          phone,
          preferred_contact_time: preferredContactTime,
          consent_partner_contact: true,
          consented_at: now,
          updated_at: now,
        })
        .eq("id", existing.id)
        .select("id,status,created_at")
        .single()
    : adminSupabase
        .from("courier_insurance_referrals")
        .insert({
          user_id: user.id,
          phone,
          preferred_contact_time: preferredContactTime,
          consent_partner_contact: true,
          consented_at: now,
        })
        .select("id,status,created_at")
        .single();

  const { data, error } = await operation;
  if (error) {
    console.error("Courier insurance referral save failed", error);
    return reply(500, { error: "INSURANCE_REFERRAL_SAVE_FAILED" });
  }
  return reply(existing ? 200 : 201, { referral: data });
};

export { handler };
