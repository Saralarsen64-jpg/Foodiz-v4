import type { Handler } from "@netlify/functions";

import { adminSupabase, authenticatedUser, userRole } from "./_lib/auth.js";
import {
  geocodeAddress,
  RoutingProviderError,
} from "./_lib/routingProvider.js";

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return reply(405, { error: "Method Not Allowed" });
  }

  try {
    const user = await authenticatedUser(event.headers);
    if (!user) return reply(401, { error: "Unauthorized" });

    const role = await userRole(user.id);
    const body = JSON.parse(event.body || "{}") as Record<string, unknown>;
    const action = clean(body.action) || "save";

    if (role === "client") {
      if (action === "set_default") {
        const addressId = clean(body.addressId);
        if (!addressId) return reply(400, { error: "Adresse manquante" });
        const { error } = await adminSupabase.rpc("set_client_default_address_server", {
          target_user_id: user.id,
          target_address_id: addressId,
        });
        if (error) throw error;
        return reply(200, { saved: true });
      }

      if (action === "delete") {
        const addressId = clean(body.addressId);
        if (!addressId) return reply(400, { error: "Adresse manquante" });
        const { error } = await adminSupabase.rpc("delete_client_address_server", {
          target_user_id: user.id,
          target_address_id: addressId,
        });
        if (error) {
          if (error.message.includes("default address")) {
            return reply(409, {
              error: "Choisissez d'abord une autre adresse de livraison.",
            });
          }
          throw error;
        }
        return reply(200, { deleted: true });
      }

      const address = clean(body.address);
      const postalCode = clean(body.postalCode);
      const city = clean(body.city);
      const label = clean(body.label) || "Maison";
      if (!address || !postalCode || !city) {
        return reply(400, {
          error: "Adresse, code postal et ville sont obligatoires.",
        });
      }

      const geocoded = await geocodeAddress(
        `${address}, ${postalCode} ${city}, France`,
      );
      const { data: addressId, error } = await adminSupabase.rpc(
        "save_client_delivery_address_server",
        {
          target_user_id: user.id,
          target_address_id: clean(body.addressId) || null,
          target_label: label,
          target_address: address,
          target_postal_code: postalCode,
          target_city: city,
          target_latitude: geocoded.latitude,
          target_longitude: geocoded.longitude,
          make_default: body.makeDefault !== false,
        },
      );
      if (error) throw error;
      return reply(200, {
        saved: true,
        addressId,
        coordinates: {
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
        },
        normalizedAddress: geocoded.label,
      });
    }

    if (role === "partner") {
      if (action !== "save") {
        return reply(400, { error: "Action partenaire invalide" });
      }
      const name = clean(body.name);
      const siret = clean(body.siret).replace(/\s/g, "");
      const phone = clean(body.phone);
      const address = clean(body.address);
      const postalCode = clean(body.postalCode);
      const city = clean(body.city);
      const description = clean(body.description);
      if (
        !name
        || !/^\d{14}$/.test(siret)
        || !phone
        || !address
        || !postalCode
        || !city
      ) {
        return reply(400, {
          error: "Dossier incomplet ou SIRET invalide.",
        });
      }

      const geocoded = await geocodeAddress(
        `${address}, ${postalCode} ${city}, France`,
      );
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
      const { data: restaurantId, error } = await adminSupabase.rpc(
        "save_partner_establishment_server",
        {
          target_user_id: user.id,
          target_name: name,
          target_siret: siret,
          target_phone: phone,
          target_address: address,
          target_postal_code: postalCode,
          target_city: city,
          target_description: description,
          target_latitude: geocoded.latitude,
          target_longitude: geocoded.longitude,
        },
      );
      if (error) throw error;
      const [{ error: restaurantAreaError }, { error: applicationAreaError }] = await Promise.all([
        adminSupabase
          .from("restaurants")
          .update({ service_area_id: serviceAreaId })
          .eq("id", restaurantId),
        adminSupabase
          .from("partner_applications")
          .update({ service_area_id: serviceAreaId })
          .eq("user_id", user.id),
      ]);
      if (restaurantAreaError || applicationAreaError) {
        throw restaurantAreaError || applicationAreaError;
      }
      return reply(200, {
        saved: true,
        restaurantId,
        serviceAreaId,
        coordinates: {
          latitude: geocoded.latitude,
          longitude: geocoded.longitude,
        },
        normalizedAddress: geocoded.label,
      });
    }

    return reply(403, { error: "Ce rôle ne peut pas modifier cette adresse." });
  } catch (error) {
    console.error("Address management failed", error);
    if (error instanceof RoutingProviderError) {
      return reply(error.retryable ? 503 : 422, {
        error: error.message,
        code: error.code,
      });
    }
    return reply(500, { error: "Impossible d'enregistrer l'adresse." });
  }
};

export { handler };
