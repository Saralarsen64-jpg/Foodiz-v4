import type { Handler } from "@netlify/functions";
import Stripe from "stripe";

import { adminSupabase, authenticatedUser, userRole } from "./_lib/auth.js";

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
    if (!user || await userRole(user.id) !== "admin") {
      return reply(403, { error: "Admin required" });
    }
    const { orderId, action, reason } = JSON.parse(event.body || "{}") as {
      orderId?: string;
      action?: "cancel_and_refund";
      reason?: string;
    };
    const cancellationReason = String(reason || "").trim().slice(0, 240);
    if (!orderId || action !== "cancel_and_refund" || !cancellationReason) {
      return reply(400, { error: "Commande, action et motif obligatoires." });
    }
    if (
      process.env.ALLOW_LIVE_PAYMENTS !== "true"
      && process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
    ) {
      return reply(503, {
        error: "Les opérations Stripe Live sont désactivées.",
        code: "LIVE_PAYMENTS_DISABLED",
      });
    }

    const { data: order } = await adminSupabase
      .from("orders")
      .select("id,status,payment_status,client_id,stripe_payment_intent_id")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return reply(404, { error: "Commande introuvable." });
    if (order.status !== "pending" || order.payment_status !== "completed") {
      return reply(409, {
        error: "Seules les commandes payées qui n'ont pas encore été acceptées peuvent être annulées ici.",
        code: "ORDER_NOT_ADMIN_REFUNDABLE",
      });
    }

    let paymentIntentId = order.stripe_payment_intent_id;
    if (!paymentIntentId) {
      const { data: payment } = await adminSupabase
        .from("order_payments")
        .select("stripe_payment_intent_id")
        .eq("order_id", orderId)
        .maybeSingle();
      paymentIntentId = payment?.stripe_payment_intent_id || null;
    }

    const now = new Date().toISOString();
    const { data: claimed, error: claimError } = await adminSupabase
      .from("orders")
      .update({
        status: "cancelled",
        cancellation_reason: cancellationReason,
        cancelled_at: now,
        updated_at: now,
      })
      .eq("id", orderId)
      .eq("status", "pending")
      .eq("payment_status", "completed")
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return reply(409, { error: "Commande déjà modifiée." });

    try {
      if (paymentIntentId) {
        await stripe.refunds.create(
          {
            payment_intent: paymentIntentId,
            reason: "requested_by_customer",
            metadata: {
              orderId,
              source: "foodiz_admin",
              adminId: user.id,
            },
          },
          { idempotencyKey: `foodiz-admin-refund-${orderId}` },
        );
      }
    } catch (error) {
      await adminSupabase
        .from("orders")
        .update({
          status: "pending",
          cancellation_reason: null,
          cancelled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("status", "cancelled");
      throw error;
    }

    const [{ error: advantageError }, { error: loyaltyError }] = await Promise.all([
      adminSupabase.rpc("reverse_applied_order_advantage", { target_order_id: orderId }),
      adminSupabase.rpc("reverse_order_loyalty", { target_order_id: orderId }),
    ]);
    if (advantageError) throw advantageError;
    if (loyaltyError) throw loyaltyError;

    await Promise.all([
      adminSupabase
        .from("orders")
        .update({
          payment_status: paymentIntentId ? "refunded" : "completed",
          refunded_at: paymentIntentId ? now : null,
          updated_at: now,
        })
        .eq("id", orderId),
      paymentIntentId
        ? adminSupabase.from("order_payments").update({ status: "refunded", updated_at: now }).eq("order_id", orderId)
        : Promise.resolve(),
      adminSupabase.from("client_delivery_codes").delete().eq("order_id", orderId),
      adminSupabase.from("delivery_code_verifications").delete().eq("order_id", orderId),
      adminSupabase.from("notifications").insert({
        user_id: order.client_id,
        title: paymentIntentId ? "Commande annulée et remboursée" : "Commande annulée",
        message: paymentIntentId
          ? `La commande #${orderId.slice(0, 8)} a été annulée par Foodiz. Stripe traite le remboursement.`
          : `La commande #${orderId.slice(0, 8)} a été annulée et vos avantages ont été restitués.`,
        type: "payment",
        related_order_id: orderId,
      }),
    ]);

    await adminSupabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "order_cancelled_and_refunded",
      entity_type: "order",
      entity_id: orderId,
      reason: cancellationReason,
      previous_data: {
        status: order.status,
        payment_status: order.payment_status,
      },
      new_data: {
        status: "cancelled",
        payment_status: paymentIntentId ? "refunded" : "completed",
      },
    });
    return reply(200, { cancelled: true, refunded: Boolean(paymentIntentId) });
  } catch (error) {
    console.error("Admin order action failed", error);
    return reply(500, { error: "L'annulation n'a pas pu être finalisée." });
  }
};

export { handler };
