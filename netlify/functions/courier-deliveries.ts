import { Handler } from "@netlify/functions";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function distanceKm(lat1?: number | null, lon1?: number | null, lat2?: number | null, lon2?: number | null) {
  if (![lat1, lon1, lat2, lon2].every((value) => typeof value === "number")) return null;
  const radius = 6371;
  const dLat = (((lat2 as number) - (lat1 as number)) * Math.PI) / 180;
  const dLon = (((lon2 as number) - (lon1 as number)) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(((lat1 as number) * Math.PI) / 180) * Math.cos(((lat2 as number) * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function eligibleCourier(userId: string) {
  const [{ data: profile }, { data: application }] = await Promise.all([
    adminSupabase.from("profiles").select("courier_online").eq("id", userId).maybeSingle(),
    adminSupabase.from("courier_applications").select("status").eq("user_id", userId).maybeSingle(),
  ]);
  return application?.status === "validated" && profile?.courier_online === true;
}

const handler: Handler = async (event) => {
  try {
    const user = await authenticatedUser(event.headers);
    if (!user) return reply(401, { error: "Unauthorized" });
    if (!(await eligibleCourier(user.id))) return reply(403, { error: "COURIER_NOT_AVAILABLE" });

    if (event.httpMethod === "GET") {
      const { data: orders, error } = await adminSupabase
        .from("orders")
        .select("id,delivery_fee_cents,courier_earnings_cents,courier_prime_fund_cents,estimated_time_mins,client_latitude,client_longitude,restaurant:restaurants(name,address,postal_code,city,latitude,longitude),order_items(quantity)")
        .eq("status", "ready")
        .is("courier_id", null)
        .eq("payment_status", "completed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return reply(200, {
        deliveries: (orders || []).map((order: any) => ({
          id: order.id,
          delivery_fee_cents: order.delivery_fee_cents,
          courier_earnings_cents: order.courier_earnings_cents,
          courier_prime_fund_cents: order.courier_prime_fund_cents,
          estimated_time_mins: order.estimated_time_mins,
          item_count: (order.order_items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0),
          distance_km: distanceKm(order.restaurant?.latitude, order.restaurant?.longitude, order.client_latitude, order.client_longitude),
          restaurant: {
            name: order.restaurant?.name,
            address: order.restaurant?.address,
            postal_code: order.restaurant?.postal_code,
            city: order.restaurant?.city,
          },
        })),
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
