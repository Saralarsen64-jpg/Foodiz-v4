import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";
import { calculateClientUnitPriceCents } from "../../src/lib/engines/weelloEconomicEngine.js";
import { effectivePartnerPriceCents } from "../../src/lib/productOffers.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

type Action = "propose_replacement" | "refund_unavailable" | "accept_replacement" | "reject_replacement";

async function paymentIntentForOrder(orderId: string, directId?: string | null) {
  if (directId) return directId;
  const { data } = await adminSupabase
    .from("order_payments")
    .select("stripe_payment_intent_id")
    .eq("order_id", orderId)
    .maybeSingle();
  return data?.stripe_payment_intent_id || null;
}

async function refundResolution(resolutionId: string, order: any, item: any) {
  const { data: claimed, error: claimError } = await adminSupabase
    .from("order_item_resolutions")
    .update({ status: "refund_processing", client_decided_at: new Date().toISOString() })
    .eq("id", resolutionId)
    .eq("status", "proposed")
    .select("id,order_id,original_client_total_cents")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return reply(409, { error: "ITEM_ALREADY_RESOLVED" });

  try {
    const { data: orderItems, error: itemsError } = await adminSupabase
      .from("order_items")
      .select("total_price_cents")
      .eq("order_id", order.id);
    if (itemsError) throw itemsError;
    const itemSubtotal = (orderItems || []).reduce((sum, row) => sum + Number(row.total_price_cents || 0), 0);
    const advantageShare = itemSubtotal > 0
      ? Math.floor(Number(order.advantage_discount_cents || 0) * Number(item.total_price_cents || 0) / itemSubtotal)
      : 0;
    const refundAmount = Math.max(0, Number(item.total_price_cents || 0) - advantageShare);
    const paymentIntentId = await paymentIntentForOrder(order.id, order.stripe_payment_intent_id);
    let stripeRefundId: string | null = null;

    if (refundAmount > 0) {
      if (!paymentIntentId) throw new Error("PAID_PAYMENT_NOT_FOUND");
      const refunds = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 });
      const alreadyRefunded = refunds.data
        .filter((refund) => ["pending", "requires_action", "succeeded"].includes(refund.status || ""))
        .reduce((sum, refund) => sum + refund.amount, 0);
      const paidAmount = Number(order.final_client_total_cents || 0);
      if (refundAmount > Math.max(0, paidAmount - alreadyRefunded)) {
        throw new Error("REFUND_EXCEEDS_REMAINING_PAYMENT");
      }
      const refund = await stripe.refunds.create(
        {
          payment_intent: paymentIntentId,
          amount: refundAmount,
          reason: "requested_by_customer",
          metadata: { orderId: order.id, orderItemId: item.id, source: "unavailable_item" },
        },
        { idempotencyKey: `weello-unavailable-item-${item.id}` },
      );
      stripeRefundId = refund.id;
    }

    const { error: finalizeError } = await adminSupabase.rpc("finalize_order_item_refund", {
      target_resolution_id: resolutionId,
      refund_cents: refundAmount,
      stripe_refund_reference: stripeRefundId,
    });
    if (finalizeError) throw finalizeError;
    if (paymentIntentId && refundAmount > 0) {
      await adminSupabase.from("order_payments").update({ status: "partially_refunded", updated_at: new Date().toISOString() }).eq("order_id", order.id);
    }
    await adminSupabase.from("notifications").insert({
      user_id: order.client_id,
      type: "payment",
      title: "Article indisponible remboursé",
      message: refundAmount > 0
        ? `L’article indisponible de la commande #${order.id.slice(0, 8)} est remboursé (${(refundAmount / 100).toFixed(2).replace(".", ",")} €).`
        : `L’article indisponible de la commande #${order.id.slice(0, 8)} a été retiré sans montant à rembourser.`,
      related_order_id: order.id,
    });
    return reply(200, { status: "refunded", refundAmountCents: refundAmount });
  } catch (error) {
    await adminSupabase.from("order_item_resolutions").update({ status: "proposed" }).eq("id", resolutionId).eq("status", "refund_processing");
    throw error;
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return reply(405, { error: "Method Not Allowed" });
  try {
    const user = await authenticatedUser(event.headers);
    if (!user) return reply(401, { error: "Unauthorized" });
    const { orderId, orderItemId, action, replacementProductId, note } = JSON.parse(event.body || "{}") as {
      orderId?: string; orderItemId?: string; action?: Action; replacementProductId?: string; note?: string;
    };
    if (!orderId || !orderItemId || !action) return reply(400, { error: "Missing resolution data" });

    const { data: order } = await adminSupabase
      .from("orders")
      .select("id,status,payment_status,client_id,restaurant_id,stripe_payment_intent_id,final_client_total_cents,advantage_discount_cents,missing_item_preference,restaurant:restaurants!inner(owner_id)")
      .eq("id", orderId)
      .maybeSingle();
    if (!order || order.payment_status !== "completed" || !["pending", "preparing"].includes(order.status)) return reply(409, { error: "ORDER_NOT_EDITABLE" });

    const isPartner = (order.restaurant as any)?.owner_id === user.id;
    const isClient = order.client_id === user.id;
    if (!isPartner && !isClient) return reply(404, { error: "Order not found" });

    const { data: item, error: itemError } = await adminSupabase
      .from("order_items")
      .select("id,order_id,product_id,quantity,total_price_cents,partner_total_price_cents,fulfillment_status")
      .eq("id", orderItemId).eq("order_id", orderId).maybeSingle();
    if (itemError) throw itemError;
    if (!item) return reply(404, { error: "Order item not found" });

    const { data: existing } = await adminSupabase.from("order_item_resolutions").select("*").eq("order_item_id", orderItemId).maybeSingle();

    if (action === "propose_replacement") {
      if (!isPartner || !replacementProductId || item.fulfillment_status !== "available" || existing) return reply(409, { error: "REPLACEMENT_NOT_AVAILABLE" });
      if (order.missing_item_preference === "refund_unavailable") return reply(409, { error: "CLIENT_REQUESTED_REFUND" });
      const { data: replacement } = await adminSupabase
        .from("products")
        .select("id,name,restaurant_id,is_active,partner_price_cents,promotion_partner_price_cents,promotion_starts_at,promotion_ends_at")
        .eq("id", replacementProductId).maybeSingle();
      if (!replacement || replacement.restaurant_id !== order.restaurant_id || !replacement.is_active) return reply(400, { error: "INVALID_REPLACEMENT_PRODUCT" });
      const replacementClientUnit = calculateClientUnitPriceCents(effectivePartnerPriceCents(replacement));
      const originalClientUnit = Math.floor(Number(item.total_price_cents) / Number(item.quantity));
      if (replacementClientUnit > originalClientUnit) return reply(400, { error: "REPLACEMENT_PRICE_TOO_HIGH" });
      const { error } = await adminSupabase.from("order_item_resolutions").insert({
        order_id: orderId, order_item_id: item.id, original_product_id: item.product_id,
        proposed_product_id: replacement.id, original_client_total_cents: item.total_price_cents,
        original_partner_total_cents: item.partner_total_price_cents, partner_note: (note || "").slice(0, 240),
      });
      if (error) throw error;
      await adminSupabase.from("order_items").update({ fulfillment_status: "replacement_proposed", replacement_product_id: replacement.id }).eq("id", item.id);
      await adminSupabase.from("notifications").insert({ user_id: order.client_id, type: "order", title: "Remplacement à valider", message: `${replacement.name} est proposé pour un article indisponible. Choisissez dans le détail de votre commande.`, related_order_id: orderId });
      return reply(200, { status: "proposed" });
    }

    if (action === "refund_unavailable") {
      if (!isPartner || item.fulfillment_status !== "available" || existing) return reply(409, { error: "REFUND_NOT_AVAILABLE" });
      const { data: resolution, error } = await adminSupabase.from("order_item_resolutions").insert({
        order_id: orderId, order_item_id: item.id, original_product_id: item.product_id,
        original_client_total_cents: item.total_price_cents, original_partner_total_cents: item.partner_total_price_cents,
        partner_note: (note || "Article indisponible").slice(0, 240),
      }).select("id").single();
      if (error || !resolution) throw error || new Error("Resolution creation failed");
      return refundResolution(resolution.id, order, item);
    }

    if (action === "accept_replacement") {
      if (!isClient || !existing || existing.status !== "proposed" || !existing.proposed_product_id) return reply(409, { error: "REPLACEMENT_NOT_PENDING" });
      const { error } = await adminSupabase.from("order_item_resolutions").update({ status: "replaced", client_decided_at: new Date().toISOString(), resolved_at: new Date().toISOString() }).eq("id", existing.id).eq("status", "proposed");
      if (error) throw error;
      await adminSupabase.from("order_items").update({ fulfillment_status: "replaced" }).eq("id", item.id).eq("fulfillment_status", "replacement_proposed");
      await adminSupabase.from("notifications").insert({ user_id: (order.restaurant as any).owner_id, type: "order", title: "Remplacement accepté", message: `Le client a accepté le remplacement pour la commande #${orderId.slice(0, 8)}.`, related_order_id: orderId });
      return reply(200, { status: "replaced" });
    }

    if (!isClient || !existing || existing.status !== "proposed") return reply(409, { error: "REFUND_NOT_PENDING" });
    return refundResolution(existing.id, order, item);
  } catch (error) {
    console.error("Order item resolution failed", error);
    return reply(500, { error: "ORDER_ITEM_RESOLUTION_FAILED" });
  }
};

export { handler };
