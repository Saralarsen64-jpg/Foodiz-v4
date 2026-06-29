import type { Handler } from "@netlify/functions";

import { adminSupabase, authenticatedUser, userRole } from "./_lib/auth.js";
import { loadClientCoverage } from "./_lib/clientCoverage.js";
import { geocodeAddress, RoutingProviderError } from "./_lib/routingProvider.js";

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

const handler: Handler = async (event) => {
  const user = await authenticatedUser(event.headers);
  if (!user) return reply(401, { error: "Unauthorized" });
  if (await userRole(user.id) !== "client") {
    return reply(403, { error: "Client required" });
  }

  if (event.httpMethod === "GET") {
    const { data, error } = await adminSupabase
      .from("city_expansion_requests")
      .select("id,city,postal_code,status,created_at,service_area:service_areas(city,status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return reply(200, { requests: data || [] });
  }

  if (event.httpMethod !== "POST") {
    return reply(405, { error: "Method Not Allowed" });
  }

  try {
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("address,postal_code,city,latitude,longitude")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const address = String(profile?.address || "").trim();
    const postalCode = String(profile?.postal_code || "").trim();
    const city = String(profile?.city || "").trim();
    if (!address || !/^[0-9]{5}$/.test(postalCode) || !city) {
      return reply(422, {
        error: "Ajoutez d’abord une adresse française complète à votre compte.",
        code: "ADDRESS_REQUIRED",
      });
    }

    const geocoded = await geocodeAddress(`${address}, ${postalCode} ${city}, France`);
    const { error: profileUpdateError } = await adminSupabase
      .from("profiles")
      .update({
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (profileUpdateError) throw profileUpdateError;

    const coverage = await loadClientCoverage(user.id);
    if (coverage.coverage.status === "available") {
      return reply(409, {
        error: "Foodiz est déjà disponible autour de votre adresse.",
        code: "AREA_ALREADY_AVAILABLE",
      });
    }

    const { data: serviceAreaId, error: serviceAreaError } = await adminSupabase.rpc(
      "ensure_service_area_server",
      {
        target_city: city,
        target_postal_code: postalCode,
        target_latitude: geocoded.latitude,
        target_longitude: geocoded.longitude,
      },
    );
    if (serviceAreaError || !serviceAreaId) {
      throw serviceAreaError || new Error("Service area creation failed");
    }

    const source = event.headers["x-foodiz-client"] === "mobile"
      ? "client_app"
      : "client_web";
    const { data: request, error } = await adminSupabase
      .from("city_expansion_requests")
      .upsert(
        {
          user_id: user.id,
          service_area_id: serviceAreaId,
          city,
          postal_code: postalCode,
          source,
          status: "requested",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,service_area_id" },
      )
      .select("id,city,postal_code,status,created_at")
      .single();
    if (error) throw error;

    return reply(200, {
      requested: true,
      request,
      message: `Merci ! Votre intérêt pour Foodiz à ${city} est enregistré.`,
    });
  } catch (error) {
    console.error("City expansion request failed", error);
    if (error instanceof RoutingProviderError) {
      return reply(error.retryable ? 503 : 422, {
        error: error.retryable
          ? "La vérification de l’adresse est momentanément indisponible."
          : "Cette adresse française n’a pas pu être vérifiée.",
        code: error.code,
      });
    }
    return reply(500, {
      error: "La demande n’a pas pu être enregistrée. Réessayez dans un instant.",
    });
  }
};

export { handler };
