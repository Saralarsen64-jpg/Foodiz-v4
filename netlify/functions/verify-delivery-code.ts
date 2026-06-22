import { Handler } from "@netlify/functions";
import { createHash, timingSafeEqual } from "node:crypto";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const user = await authenticatedUser(event.headers);
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const { orderId, code } = JSON.parse(event.body || "{}");
  if (!orderId || !/^[0-9]{6}$/.test(code || "")) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid delivery code" }) };
  }

  const { data: order } = await adminSupabase
    .from("orders")
    .select("client_id, courier_id, status")
    .eq("id", orderId)
    .single();

  if (!order || order.courier_id !== user.id || order.status !== "delivering") {
    return { statusCode: 404, body: JSON.stringify({ error: "Delivery not found" }) };
  }

  const { data: verification } = await adminSupabase
    .from("delivery_code_verifications")
    .select("code_hash,failed_attempts,locked_until")
    .eq("order_id", orderId)
    .single();
  if (!verification?.code_hash) {
    return { statusCode: 404, body: JSON.stringify({ error: "Delivery code not found" }) };
  }

  const now = Date.now();
  if (verification.locked_until && new Date(verification.locked_until).getTime() > now) {
    return {
      statusCode: 429,
      body: JSON.stringify({
        error: "TOO_MANY_ATTEMPTS",
        retryAfterSeconds: Math.ceil((new Date(verification.locked_until).getTime() - now) / 1000),
      }),
    };
  }

  const suppliedHash = createHash("sha256").update(code).digest("hex");
  const expected = Buffer.from(verification.code_hash, "hex");
  const supplied = Buffer.from(suppliedHash, "hex");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    const { data: failure, error: failureError } = await adminSupabase.rpc("register_delivery_code_failure", { target_order_id: orderId });
    if (failureError) return { statusCode: 500, body: JSON.stringify({ error: "Attempt registration failed" }) };
    const lockAccount = Boolean(failure?.locked);
    return {
      statusCode: lockAccount ? 429 : 422,
      body: JSON.stringify(lockAccount
        ? { error: "TOO_MANY_ATTEMPTS", retryAfterSeconds: failure?.retryAfterSeconds || 900 }
        : { error: "INCORRECT_CODE", remainingAttempts: failure?.remainingAttempts ?? 0 }),
    };
  }

  const { data: completionResult, error: completionError } = await adminSupabase
    .rpc("complete_courier_delivery", {
      target_order_id: orderId,
      target_courier_id: user.id,
    });
  if (completionError) {
    console.error("Atomic delivery completion failed", orderId, completionError);
    return { statusCode: 500, body: JSON.stringify({ error: "Delivery update failed" }) };
  }

  await Promise.all([
    adminSupabase.from("client_delivery_codes").delete().eq("order_id", orderId),
    adminSupabase.from("delivery_code_verifications").delete().eq("order_id", orderId),
    adminSupabase.from("notifications").insert({
      user_id: order.client_id,
      title: "Commande livrée",
      message: `La remise de votre commande #${orderId.slice(0, 8)} a été confirmée.`,
      type: "order",
      related_order_id: orderId,
    }),
  ]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      delivered: true,
      delayAdjustment: completionResult?.delayAdjustment || null,
    }),
  };
};

export { handler };
