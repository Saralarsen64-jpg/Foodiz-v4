import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });
  try {
    const user = await authenticatedUser(event.headers);
    if (!user) return reply(401, { error: "Unauthorized" });
    const { orderId, action, reason } = JSON.parse(event.body || "{}") as {
      orderId?: string;
      action?: "accept" | "ready" | "refuse";
      reason?: string;
    };
    if (!orderId || !action) return reply(400, { error: "Missing order action" });

    const { data: order } = await adminSupabase
      .from("orders")
      .select("id,status,payment_status,client_id,stripe_payment_intent_id,restaurant:restaurants!inner(owner_id)")
      .eq("id", orderId)
      .maybeSingle();
    if (!order || (order.restaurant as any)?.owner_id !== user.id) return reply(404, { error: "Order not found" });

    if (action === "accept") {
      if (order.status !== "pending" || order.payment_status !== "completed") return reply(409, { error: "ORDER_NOT_ACCEPTABLE" });
      const { data: updated, error } = await adminSupabase.from("orders").update({ status: "preparing", updated_at: new Date().toISOString() }).eq("id", orderId).eq("status", "pending").eq("payment_status", "completed").select("id").maybeSingle();
      if (error) throw error;
      if (!updated) return reply(409, { error: "ORDER_NOT_ACCEPTABLE" });
      const { error: referralError } = await adminSupabase.rpc("complete_first_paid_referral", {
        target_order_id: orderId,
      });
      if (referralError) throw referralError;
      await adminSupabase.from("notifications").insert({ user_id: order.client_id, title: "Commande acceptée", message: `Votre commande #${orderId.slice(0, 8)} est en préparation.`, type: "order", related_order_id: orderId });
      return reply(200, { status: "preparing" });
    }

    if (action === "ready") {
      if (order.status !== "preparing") return reply(409, { error: "ORDER_NOT_PREPARING" });
      const { data: updated, error } = await adminSupabase.from("orders").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", orderId).eq("status", "preparing").select("id").maybeSingle();
      if (error) throw error;
      if (!updated) return reply(409, { error: "ORDER_NOT_PREPARING" });
      await adminSupabase.from("notifications").insert({ user_id: order.client_id, title: "Commande prête", message: `Votre commande #${orderId.slice(0, 8)} attend maintenant un livreur.`, type: "order", related_order_id: orderId });
      return reply(200, { status: "ready" });
    }

    if (order.status !== "pending" || order.payment_status !== "completed") return reply(409, { error: "ORDER_NOT_REFUSABLE" });
    let paymentIntentId = order.stripe_payment_intent_id;
    if (!paymentIntentId) {
      const { data: payment } = await adminSupabase.from("order_payments").select("stripe_payment_intent_id").eq("order_id", orderId).maybeSingle();
      paymentIntentId = payment?.stripe_payment_intent_id || null;
    }

    const now = new Date().toISOString();
    const refusalReason = (reason || "Refusée par l'établissement").slice(0, 240);
    const { data: claimedOrder, error: claimError } = await adminSupabase.from("orders").update({ status: "cancelled", cancellation_reason: refusalReason, cancelled_at: now, updated_at: now }).eq("id", orderId).eq("status", "pending").eq("payment_status", "completed").select("id").maybeSingle();
    if (claimError) throw claimError;
    if (!claimedOrder) return reply(409, { error: "ORDER_NOT_REFUSABLE" });

    try {
      if (paymentIntentId) {
        await stripe.refunds.create({ payment_intent: paymentIntentId, reason: "requested_by_customer", metadata: { orderId, source: "restaurant_refusal" } }, { idempotencyKey: `foodiz-refund-${orderId}` });
      }
    } catch (error) {
      await adminSupabase.from("orders").update({ status: "pending", cancellation_reason: null, cancelled_at: null, updated_at: new Date().toISOString() }).eq("id", orderId).eq("status", "cancelled").eq("payment_status", "completed");
      throw error;
    }

    const { error: reverseError } = await adminSupabase.rpc("reverse_applied_order_advantage", { target_order_id: orderId });
    if (reverseError) throw reverseError;
    const { error: loyaltyError } = await adminSupabase.rpc("reverse_order_loyalty", { target_order_id: orderId });
    if (loyaltyError) throw loyaltyError;
    const { error: updateError } = await adminSupabase.from("orders").update({ payment_status: paymentIntentId ? "refunded" : "completed", refunded_at: paymentIntentId ? now : null, updated_at: now }).eq("id", orderId).eq("status", "cancelled");
    if (updateError) throw updateError;
    if (paymentIntentId) await adminSupabase.from("order_payments").update({ status: "refunded", updated_at: now }).eq("order_id", orderId);
    await Promise.all([
      adminSupabase.from("client_delivery_codes").delete().eq("order_id", orderId),
      adminSupabase.from("delivery_code_verifications").delete().eq("order_id", orderId),
    ]);
    await adminSupabase.from("notifications").insert({ user_id: order.client_id, title: paymentIntentId ? "Commande refusée et remboursée" : "Commande refusée", message: paymentIntentId ? `La commande #${orderId.slice(0, 8)} a été refusée. Stripe traite son remboursement.` : `La commande #${orderId.slice(0, 8)} a été refusée et vos points ont été restitués.`, type: "payment", related_order_id: orderId });
    return reply(200, { status: "cancelled", refunded: Boolean(paymentIntentId) });
  } catch (error) {
    console.error("Partner order action failed", error);
    return reply(500, { error: "ORDER_ACTION_FAILED" });
  }
};

export { handler };
