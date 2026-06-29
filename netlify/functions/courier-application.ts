import type { Handler } from "@netlify/functions";

import { adminSupabase, authenticatedUser, userRole } from "./_lib/auth.js";
import { geocodeAddress, RoutingProviderError } from "./_lib/routingProvider.js";

const validSlots = new Set(["matin", "midi", "apres_midi", "soiree", "nuit", "week_end"]);
const validDays = new Set(["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]);
const validVehicles = new Set(["bike", "velo", "scooter", "motorcycle", "moto", "car", "voiture", "autre"]);

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

function clean(value: unknown, max = 180) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanList(value: unknown, allowed: Set<string>, max: number) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => clean(item, 30)).filter((item) => allowed.has(item)))).slice(0, max);
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return reply(405, { error: "Method Not Allowed" });
  }

  try {
    const user = await authenticatedUser(event.headers);
    if (!user) return reply(401, { error: "Unauthorized" });
    if (await userRole(user.id) !== "courier") {
      return reply(403, { error: "Courier required" });
    }

    const body = JSON.parse(event.body || "{}") as Record<string, unknown>;
    const fullName = clean(body.name, 120);
    const phone = clean(body.phone, 30);
    const legalName = clean(body.legalName, 160);
    const siret = clean(body.siret, 32).replace(/\D/g, "");
    const address = clean(body.address);
    const postalCode = clean(body.postalCode, 5);
    const city = clean(body.city, 100);
    const vehicleType = clean(body.vehicle, 30);
    const availabilitySlots = cleanList(body.availabilitySlots, validSlots, 6);
    const availabilityDays = cleanList(body.availabilityDays, validDays, 7);
    const availabilityFlexible = body.availabilityFlexible === true;

    if (
      !fullName
      || !phone
      || !legalName
      || !/^[0-9]{14}$/.test(siret)
      || !address
      || !/^[0-9]{5}$/.test(postalCode)
      || !city
      || !validVehicles.has(vehicleType)
      || (!availabilityFlexible && (!availabilitySlots.length || !availabilityDays.length))
    ) {
      return reply(400, {
        error: "Complétez votre identité, votre SIRET, votre adresse française, votre véhicule et vos disponibilités.",
      });
    }

    const geocoded = await geocodeAddress(`${address}, ${postalCode} ${city}, France`);
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

    const [{ error: profileError }, { data: existing, error: existingError }] = await Promise.all([
      adminSupabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          address,
          postal_code: postalCode,
          city,
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id),
      adminSupabase
        .from("courier_applications")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (profileError || existingError) throw profileError || existingError;

    const values = {
      city,
      vehicle_type: vehicleType,
      legal_name: legalName,
      siret,
      address,
      postal_code: postalCode,
      service_area_id: serviceAreaId,
      availability_slots: availabilitySlots,
      availability_days: availabilityDays,
      availability_flexible: availabilityFlexible,
      status: "pending",
      document_review_status: "pending_review",
      updated_at: new Date().toISOString(),
    };
    const applicationResult = existing
      ? await adminSupabase
          .from("courier_applications")
          .update(values)
          .eq("id", existing.id)
      : await adminSupabase
          .from("courier_applications")
          .insert({ user_id: user.id, ...values });
    if (applicationResult.error) throw applicationResult.error;

    return reply(200, {
      saved: true,
      serviceAreaId,
      normalizedAddress: geocoded.label,
    });
  } catch (error) {
    console.error("Courier application save failed", error);
    if (error instanceof RoutingProviderError) {
      return reply(error.retryable ? 503 : 422, {
        error: error.retryable
          ? "La vérification de l’adresse est momentanément indisponible."
          : "Cette adresse professionnelle française n’a pas pu être vérifiée.",
        code: error.code,
      });
    }
    return reply(500, { error: "Le dossier livreur n’a pas pu être enregistré." });
  }
};

export { handler };
