import type { Handler } from "@netlify/functions";

import { adminSupabase, authenticatedUser, userRole } from "./_lib/auth.js";

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function validCoordinate(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
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

    const body = JSON.parse(event.body || "{}") as {
      online?: boolean;
      latitude?: number;
      longitude?: number;
      accuracyMeters?: number;
    };
    const online = body.online === true;
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const accuracyMeters = Number(body.accuracyMeters);

    if (
      online
      && (
        !validCoordinate(latitude, -90, 90)
        || !validCoordinate(longitude, -180, 180)
        || !Number.isFinite(accuracyMeters)
        || accuracyMeters < 0
        || accuracyMeters > 200
      )
    ) {
      return reply(422, {
        error: "Une position GPS précise à moins de 200 mètres est nécessaire.",
        code: "PRECISE_LOCATION_REQUIRED",
      });
    }

    const { error } = await adminSupabase.rpc("update_courier_presence_server", {
      target_user_id: user.id,
      target_online: online,
      target_latitude: online ? latitude : null,
      target_longitude: online ? longitude : null,
      target_accuracy_meters: online ? accuracyMeters : null,
    });
    if (error) {
      if (error.message.includes("not approved")) {
        return reply(403, {
          error: "Votre dossier et vos documents doivent être validés.",
          code: "COURIER_NOT_APPROVED",
        });
      }
      throw error;
    }

    return reply(200, {
      online,
      locationUpdatedAt: online ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error("Courier presence failed", error);
    return reply(500, { error: "Impossible de mettre à jour votre disponibilité." });
  }
};

export { handler };
