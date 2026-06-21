import type { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser, userRole } from "./_lib/auth.js";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const user = await authenticatedUser(event.headers);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }
  if (await userRole(user.id) !== "admin") {
    return { statusCode: 403, body: JSON.stringify({ error: "Admin required" }) };
  }

  const { data, error } = await adminSupabase
    .from("prelaunch_profiles")
    .select(`
      id,user_id,role,first_name,last_name,email,phone,city,status,
      marketing_consent,created_at,launch_notified_at,activated_at,
      partner:prelaunch_partner_details(establishment_name,establishment_type,siret),
      driver:prelaunch_driver_details(siret,vehicle_type,availability)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: "Impossible de charger les pré-inscriptions." }) };
  }

  const profiles = data || [];
  const counts = profiles.reduce(
    (summary, profile) => {
      summary.total += 1;
      if (profile.role === "client") summary.clients += 1;
      if (profile.role === "livreur") summary.drivers += 1;
      if (profile.role === "partenaire") summary.partners += 1;
      return summary;
    },
    { total: 0, clients: 0, drivers: 0, partners: 0 },
  );

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ profiles, counts }),
  };
};

export { handler };
