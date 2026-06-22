import { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";
import { calculateRoute, type RouteResult } from "./_lib/routingProvider.js";

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function validNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

async function dispatchRoute(order: any): Promise<RouteResult | null> {
  if (validNumber(order.delivery_route_distance_meters)) {
    const durationSeconds = validNumber(order.delivery_route_duration_seconds)
      ? order.delivery_route_duration_seconds
      : null;
    return {
      distanceMeters: order.delivery_route_distance_meters,
      distanceKm: order.delivery_route_distance_meters / 1_000,
      durationSeconds,
      durationMinutes: durationSeconds === null ? null : Math.ceil(durationSeconds / 60),
      geometry: null,
      provider: order.delivery_route_provider || "stored",
      requestedProvider: order.delivery_route_provider || "stored",
      isFallback: order.delivery_route_is_fallback === true,
    };
  }

  const restaurant = Array.isArray(order.restaurant)
    ? order.restaurant[0]
    : order.restaurant;
  const coordinates = [
    restaurant?.latitude,
    restaurant?.longitude,
    order.client_latitude,
    order.client_longitude,
  ].map(Number);
  if (!coordinates.every(Number.isFinite)) return null;

  const route = await calculateRoute(
    { latitude: coordinates[0], longitude: coordinates[1] },
    { latitude: coordinates[2], longitude: coordinates[3] },
  );

  const { error } = await adminSupabase
    .from("orders")
    .update({
      estimated_time_mins: route.durationMinutes,
      delivery_route_distance_meters: route.distanceMeters,
      delivery_route_duration_seconds: route.durationSeconds,
      delivery_route_provider: route.provider,
      delivery_route_is_fallback: route.isFallback,
      delivery_route_calculated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .is("delivery_route_distance_meters", null);
  if (error) {
    console.error("[routing] Dispatch route snapshot could not be stored", {
      orderId: order.id,
      message: error.message,
    });
  }
  return route;
}

async function eligibleCourier(userId: string) {
  const [{ data: profile }, { data: application }] = await Promise.all([
    adminSupabase.from("profiles").select("courier_online").eq("id", userId).maybeSingle(),
    adminSupabase.from("courier_applications").select("status,document_review_status,dispatch_priority_score").eq("user_id", userId).maybeSingle(),
  ]);
  if (
    application?.status !== "validated"
    || application.document_review_status !== "approved"
    || profile?.courier_online !== true
  ) return null;
  return { priorityScore: Number(application.dispatch_priority_score ?? 100) };
}

const handler: Handler = async (event) => {
  try {
    const user = await authenticatedUser(event.headers);
    if (!user) return reply(401, { error: "Unauthorized" });
    const eligibility = await eligibleCourier(user.id);
    if (!eligibility) return reply(403, { error: "COURIER_NOT_AVAILABLE" });

    if (event.httpMethod === "GET") {
      const deliveryLimit = eligibility.priorityScore >= 90 ? 20 : eligibility.priorityScore >= 70 ? 12 : 6;
      const { data: orders, error } = await adminSupabase
        .from("orders")
        .select("id,delivery_fee_cents,courier_earnings_cents,courier_prime_fund_cents,estimated_time_mins,client_latitude,client_longitude,delivery_route_distance_meters,delivery_route_duration_seconds,delivery_route_provider,delivery_route_is_fallback,restaurant:restaurants(name,address,postal_code,city,latitude,longitude),order_items(quantity)")
        .eq("status", "ready")
        .is("courier_id", null)
        .eq("payment_status", "completed")
        .order("created_at", { ascending: true })
        .limit(deliveryLimit);
      if (error) throw error;
      const deliveries = await Promise.all((orders || []).map(async (order: any) => {
        const route = await dispatchRoute(order);
        const restaurant = Array.isArray(order.restaurant)
          ? order.restaurant[0]
          : order.restaurant;
        return {
          id: order.id,
          delivery_fee_cents: order.delivery_fee_cents,
          courier_earnings_cents: order.courier_earnings_cents,
          courier_prime_fund_cents: order.courier_prime_fund_cents,
          estimated_time_mins: route?.durationMinutes ?? order.estimated_time_mins ?? null,
          item_count: (order.order_items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0),
          distance_km: route?.distanceKm ?? null,
          routing_provider: route?.provider ?? null,
          routing_fallback: route?.isFallback ?? false,
          restaurant: {
            name: restaurant?.name,
            address: restaurant?.address,
            postal_code: restaurant?.postal_code,
            city: restaurant?.city,
          },
        };
      }));
      return reply(200, {
        dispatchPriorityScore: eligibility.priorityScore,
        deliveries,
      });
    }

    if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });
    const { orderId } = JSON.parse(event.body || "{}") as { orderId?: string };
    if (!orderId) return reply(400, { error: "Missing order" });

    const { data: active } = await adminSupabase
      .from("orders")
      .select("id")
      .eq("courier_id", user.id)
      .in("status", ["pickup", "picked_up", "delivering"])
      .limit(1)
      .maybeSingle();
    if (active) return reply(409, { error: "ACTIVE_DELIVERY_EXISTS", orderId: active.id });

    const { data: claimedId, error: claimError } = await adminSupabase.rpc("claim_courier_delivery", { target_order_id: orderId, target_courier_id: user.id });
    if (claimError) throw claimError;
    if (!claimedId) return reply(409, { error: "DELIVERY_UNAVAILABLE" });

    const { data: order, error } = await adminSupabase
      .from("orders")
      .select("id,client_id,client_latitude,client_longitude,restaurant:restaurants(latitude,longitude)")
      .eq("id", claimedId)
      .single();
    if (error || !order) throw error || new Error("Claimed delivery not found");

    const restaurant = order.restaurant as any;
    await Promise.all([
      adminSupabase.from("delivery_tracking").upsert({
        order_id: order.id,
        courier_id: user.id,
        pickup_latitude: restaurant?.latitude,
        pickup_longitude: restaurant?.longitude,
        dropoff_latitude: order.client_latitude,
        dropoff_longitude: order.client_longitude,
        status: "accepted",
      }, { onConflict: "order_id" }),
      adminSupabase.from("notifications").insert({
        user_id: order.client_id,
        title: "Livreur assigné",
        message: `Un livreur a accepté la commande #${order.id.slice(0, 8)} et se rend au restaurant.`,
        type: "order",
        related_order_id: order.id,
      }),
    ]);

    return reply(200, { orderId: order.id });
  } catch (error) {
    console.error("Courier deliveries failed", error);
    return reply(500, { error: "COURIER_DELIVERY_FAILED" });
  }
};

export { handler };
