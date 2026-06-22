import type { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";
import {
  calculateRoute,
  calculateStraightLineDistanceMeters,
  type RouteResult,
} from "./_lib/routingProvider.js";

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
};

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

function validCoordinate(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });
  const user = await authenticatedUser(event.headers);
  if (!user) return reply(401, { error: "Unauthorized" });

  let body: Record<string, any>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { error: "Requête invalide." });
  }

  const orderId = String(body.orderId || "");
  const action = String(body.action || "");
  if (!orderId || !["location", "at_restaurant", "picked_up", "in_transit", "at_customer"].includes(action)) {
    return reply(400, { error: "Action de livraison invalide." });
  }

  const [{ data: application }, { data: order }] = await Promise.all([
    adminSupabase
      .from("courier_applications")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle(),
    adminSupabase
      .from("orders")
      .select("id,status,courier_id,client_latitude,client_longitude,restaurant:restaurants(latitude,longitude)")
      .eq("id", orderId)
      .maybeSingle(),
  ]);
  if (application?.status !== "validated") return reply(403, { error: "COURIER_NOT_VALIDATED" });
  if (!order || order.courier_id !== user.id || !["pickup", "picked_up", "delivering"].includes(order.status)) {
    return reply(404, { error: "DELIVERY_NOT_FOUND" });
  }

  const latitude = typeof body.latitude === "number" ? body.latitude : Number.NaN;
  const longitude = typeof body.longitude === "number" ? body.longitude : Number.NaN;
  const accuracyMeters = typeof body.accuracyMeters === "number" ? body.accuracyMeters : Number.NaN;
  const hasLocation = validCoordinate(latitude, -90, 90) && validCoordinate(longitude, -180, 180);

  if (action === "location") {
    if (!hasLocation) return reply(400, { error: "Position GPS invalide." });
    const { error } = await adminSupabase
      .from("delivery_tracking")
      .update({
        current_latitude: latitude,
        current_longitude: longitude,
        current_location_name: "Position GPS du livreur",
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", order.id)
      .eq("courier_id", user.id);
    if (error) return reply(500, { error: "La position n’a pas pu être enregistrée." });
    return reply(200, { updated: true });
  }

  if (action === "at_restaurant") {
    if (order.status !== "pickup") return reply(409, { error: "INVALID_DELIVERY_TRANSITION" });
    const { error } = await adminSupabase.rpc("record_courier_delivery_step", {
      target_order_id: order.id,
      target_courier_id: user.id,
      target_step: "at_restaurant",
      target_latitude: null,
      target_longitude: null,
    });
    if (error) return reply(500, { error: "Étape non enregistrée." });
    return reply(200, { step: "at_restaurant" });
  }

  if (action === "picked_up") {
    if (order.status !== "pickup") return reply(409, { error: "INVALID_DELIVERY_TRANSITION" });
    if (!hasLocation || !Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 200) {
      return reply(422, { error: "Une position GPS précise est obligatoire pour confirmer la récupération." });
    }
    const restaurant = Array.isArray(order.restaurant) ? order.restaurant[0] : order.restaurant;
    const restaurantCoordinates = {
      latitude: Number(restaurant?.latitude),
      longitude: Number(restaurant?.longitude),
    };
    const clientCoordinates = {
      latitude: Number(order.client_latitude),
      longitude: Number(order.client_longitude),
    };
    if (
      !validCoordinate(restaurantCoordinates.latitude, -90, 90)
      || !validCoordinate(restaurantCoordinates.longitude, -180, 180)
      || !validCoordinate(clientCoordinates.latitude, -90, 90)
      || !validCoordinate(clientCoordinates.longitude, -180, 180)
    ) {
      return reply(422, { error: "Les coordonnées de la course sont incomplètes. Contactez le support." });
    }
    const pickupCoordinates = { latitude, longitude, accuracyMeters };
    if (
      calculateStraightLineDistanceMeters(
        pickupCoordinates,
        restaurantCoordinates,
      ) > 500
    ) {
      return reply(422, { error: "Vous devez être à proximité du partenaire pour confirmer la récupération." });
    }

    let estimate: RouteResult | null = null;
    try {
      estimate = await calculateRoute(pickupCoordinates, clientCoordinates);
    } catch (routingError) {
      console.error("Pickup route estimate unavailable", order.id, routingError);
    }

    const pickupAt = new Date();
    const expectedArrivalAt = estimate?.durationSeconds
      ? new Date(pickupAt.getTime() + estimate.durationSeconds * 1000).toISOString()
      : null;

    const { data: pickupResult, error: pickupError } = await adminSupabase
      .rpc("record_courier_pickup", {
        target_order_id: order.id,
        target_courier_id: user.id,
        target_pickup_latitude: latitude,
        target_pickup_longitude: longitude,
        target_gps_accuracy_meters: accuracyMeters,
        target_route_duration_seconds: estimate?.durationSeconds || null,
        target_route_distance_meters: estimate?.distanceMeters || null,
        target_expected_arrival_at: expectedArrivalAt,
        target_eta_provider: expectedArrivalAt ? estimate?.provider || null : null,
      });
    if (pickupError) {
      console.error("Atomic pickup recording failed", pickupError);
      return reply(409, { error: "La récupération n’a pas pu être confirmée." });
    }

    return reply(200, {
      step: "picked_up",
      etaAvailable: Boolean(expectedArrivalAt),
      expectedArrivalAt,
      routeDurationSeconds: estimate?.durationSeconds || null,
      routingProvider: estimate?.provider || null,
      routingFallback: estimate?.isFallback || false,
      pickup: pickupResult,
    });
  }

  if (action === "in_transit") {
    if (order.status !== "picked_up") return reply(409, { error: "INVALID_DELIVERY_TRANSITION" });
    const { error } = await adminSupabase.rpc("record_courier_delivery_step", {
      target_order_id: order.id,
      target_courier_id: user.id,
      target_step: "in_transit",
      target_latitude: null,
      target_longitude: null,
    });
    if (error) return reply(409, { error: "Étape non enregistrée." });
    return reply(200, { step: "in_transit" });
  }

  if (order.status !== "delivering") return reply(409, { error: "INVALID_DELIVERY_TRANSITION" });
  const { error } = await adminSupabase.rpc("record_courier_delivery_step", {
    target_order_id: order.id,
    target_courier_id: user.id,
    target_step: "at_customer",
    target_latitude: hasLocation ? latitude : null,
    target_longitude: hasLocation ? longitude : null,
  });
  if (error) return reply(500, { error: "Étape non enregistrée." });
  return reply(200, { step: "at_customer" });
};

export { handler };
