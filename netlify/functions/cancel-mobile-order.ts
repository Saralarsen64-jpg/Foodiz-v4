import type { Handler } from "@netlify/functions";
import Stripe from "stripe";

import { adminSupabase, authenticatedUser } from "./_lib/auth.js";
import { stripeOperationGuard } from "./_lib/stripe-server.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });
  const stripeGuard = stripeOperationGuard();
  if (stripeGuard) return stripeGuard;

  try {
    const user = await authenticatedUser(event.headers);
    if (!user) return reply(401, { error: "Unauthorized" });

    const { orderId } = JSON.parse(event.body || "{}") as { orderId?: string };
    if (!orderId) return reply(400, { error: "Missing order" });

    const { data: order } = await adminSupabase
      .from("orders")
      .select("id,client_id,status,payment_status")
      .eq("id", orderId)
      .maybeSingle();
    if (!order || order.client_id !== user.id) return reply(404, { error: "Order not found" });
    if (order.payment_status !== "pending" || order.status !== "pending") {
      return reply(409, { error: "ORDER_NOT_CANCELLABLE" });
    }

    const { data: payment } = await adminSupabase
      .from("order_payments")
      .select("stripe_payment_intent_id,stripe_checkout_session_id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (payment?.stripe_payment_intent_id) {
      const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
      if (!["succeeded", "canceled"].includes(intent.status)) {
        await stripe.paymentIntents.cancel(intent.id);
      }
    }
    if (payment?.stripe_checkout_session_id) {
      const checkout = await stripe.checkout.sessions.retrieve(payment.stripe_checkout_session_id);
      if (checkout.status === "open") {
        await stripe.checkout.sessions.expire(checkout.id);
      }
    }

    await Promise.all([
      adminSupabase.rpc("release_order_advantage", { target_order_id: orderId }),
      adminSupabase.from("client_delivery_codes").delete().eq("order_id", orderId),
      adminSupabase.from("delivery_code_verifications").delete().eq("order_id", orderId),
      adminSupabase
        .from("order_payments")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("order_id", orderId),
    ]);

    await adminSupabase
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: "failed",
        cancellation_reason: "Paiement annulé par le client",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("client_id", user.id)
      .eq("payment_status", "pending");

    return reply(200, { cancelled: true });
  } catch (error) {
    console.error("Cancel mobile order failed", error);
    return reply(500, { error: "ORDER_CANCELLATION_FAILED" });
  }
};

export { handler };
