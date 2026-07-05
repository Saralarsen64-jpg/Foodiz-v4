import type { Handler } from "@netlify/functions";

import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(body),
});

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return reply(405, { error: "Method Not Allowed" });
  }

  const user = await authenticatedUser(event.headers);
  if (!user) return reply(401, { error: "Unauthorized" });

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role,city,postal_code,latitude,longitude")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "client") {
    return reply(403, { error: "Cette demande est réservée aux clients." });
  }
  if (!profile.city?.trim()) {
    return reply(422, {
      error: "Ajoutez d’abord votre ville et votre adresse de livraison.",
    });
  }

  const { data, error } = await adminSupabase
    .from("service_area_requests")
    .upsert(
      {
        user_id: user.id,
        city: profile.city.trim(),
        postal_code: profile.postal_code || null,
        latitude: profile.latitude,
        longitude: profile.longitude,
        status: "requested",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,city" },
    )
    .select("id,status,city")
    .single();
  if (error) {
    console.error("Service area request failed", error);
    return reply(500, { error: "La demande n’a pas pu être enregistrée." });
  }

  return reply(200, { request: data });
};

export { handler };
