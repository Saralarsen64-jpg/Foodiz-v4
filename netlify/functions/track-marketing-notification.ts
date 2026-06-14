import { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const user = await authenticatedUser(event.headers);
  if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  const { notificationId } = JSON.parse(event.body || "{}");
  if (!notificationId) return { statusCode: 400, body: JSON.stringify({ error: "Missing notification" }) };

  const { data: delivery } = await adminSupabase.from("marketing_campaign_deliveries").select("id,campaign_id,opened_at").eq("notification_id", notificationId).eq("user_id", user.id).maybeSingle();
  if (!delivery) return { statusCode: 200, body: JSON.stringify({ tracked: false }) };
  if (!delivery.opened_at) {
    await adminSupabase.from("marketing_campaign_deliveries").update({ opened_at: new Date().toISOString(), clicked_at: new Date().toISOString() }).eq("id", delivery.id);
    const { count } = await adminSupabase.from("marketing_campaign_deliveries").select("id", { count: "exact", head: true }).eq("campaign_id", delivery.campaign_id).not("opened_at", "is", null);
    await adminSupabase.from("marketing_campaigns").update({ opened_count: count || 0, clicked_count: count || 0 }).eq("id", delivery.campaign_id);
  }
  return { statusCode: 200, body: JSON.stringify({ tracked: true }) };
};

export { handler };
