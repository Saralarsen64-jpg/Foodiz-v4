import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendFinancialDocumentEmail } from "./_lib/financial-documents.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

function stripeId(value: string | Stripe.Customer | Stripe.DeletedCustomer | Stripe.Subscription | null) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function syncPartnerSubscription(subscription: Stripe.Subscription, checkoutSessionId?: string | null) {
  const restaurantId = subscription.metadata?.restaurantId;
  const planId = subscription.metadata?.planId;
  const billingPeriod = subscription.metadata?.billingPeriod;
  if (!restaurantId || !planId || !billingPeriod) return;

  const subscriptionData = subscription as any;
  const firstItem = subscriptionData.items?.data?.[0];
  const periodStart = subscriptionData.current_period_start ?? firstItem?.current_period_start;
  const periodEnd = subscriptionData.current_period_end ?? firstItem?.current_period_end;
  if (!periodStart || !periodEnd) throw new Error(`Missing billing period for subscription ${subscription.id}`);

  const payload = {
    restaurant_id: restaurantId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: stripeId(subscription.customer),
    stripe_checkout_session_id: checkoutSessionId || undefined,
    plan_id: planId,
    billing_period: billingPeriod,
    status: subscription.status,
    current_period_start: new Date(periodStart * 1000).toISOString(),
    current_period_end: new Date(periodEnd * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  await supabase.from("partner_subscriptions").upsert(payload, { onConflict: "stripe_subscription_id" });
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const invoiceData = invoice as any;
  return stripeId(invoiceData.subscription || invoiceData.parent?.subscription_details?.subscription || null);
}

async function attributeCampaignConversion(orderId: string, clientId: string, restaurantId: string) {
  const attributionStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: campaigns } = await supabase
    .from("marketing_campaigns")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("status", "sent")
    .gte("sent_at", attributionStart);
  const campaignIds = (campaigns || []).map((campaign) => campaign.id);
  if (!campaignIds.length) return;

  const { data: delivery } = await supabase
    .from("marketing_campaign_deliveries")
    .select("id,campaign_id")
    .eq("user_id", clientId)
    .in("campaign_id", campaignIds)
    .not("clicked_at", "is", null)
    .is("converted_order_id", null)
    .order("clicked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!delivery) return;

  const { data: attributed } = await supabase
    .from("marketing_campaign_deliveries")
    .update({ converted_order_id: orderId })
    .eq("id", delivery.id)
    .is("converted_order_id", null)
    .select("id")
    .maybeSingle();
  if (!attributed) return;

  const { count } = await supabase
    .from("marketing_campaign_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", delivery.campaign_id)
    .not("converted_order_id", "is", null);
  await supabase.from("marketing_campaigns").update({ converted_orders_count: count || 0 }).eq("id", delivery.campaign_id);
}

async function cancelUnpaidOrder(orderId: string, paymentStatus: string) {
  const { data: order } = await supabase
    .from("orders")
    .select("id,client_id,status,payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "pending" || order.payment_status !== "pending") return;

  await Promise.all([
    supabase.rpc("release_order_advantage", { target_order_id: orderId }),
    supabase.from("client_delivery_codes").delete().eq("order_id", orderId),
    supabase.from("delivery_code_verifications").delete().eq("order_id", orderId),
    supabase.from("order_payments").update({ status: paymentStatus, updated_at: new Date().toISOString() }).eq("order_id", orderId),
  ]);
  await supabase
    .from("orders")
    .update({
      status: "cancelled",
      payment_status: "failed",
      cancellation_reason: "Paiement non finalisé",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("payment_status", "pending");
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const signature = event.headers["stripe-signature"];
  if (!signature) {
    return { statusCode: 400, body: "No signature" };
  }

  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body || "",
      signature,
      webhookSecret
    );

    // Gérer les événements
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(stripeId(session.subscription) || "");
          await syncPartnerSubscription(subscription, session.id);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        if (session.metadata?.orderId) {
          await cancelUnpaidOrder(session.metadata.orderId, "checkout_expired");
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          const { error: advantageError } = await supabase.rpc("apply_order_advantage", { target_order_id: orderId });
          if (advantageError) throw advantageError;
          const { data: order, error: orderError } = await supabase
            .from("orders")
            .update({
              status: "pending",
              payment_status: "completed",
              stripe_payment_intent_id: paymentIntent.id,
            })
            .eq("id", orderId)
            .eq("payment_status", "pending")
            .select("client_id, restaurant_id, restaurants(owner_id)")
            .maybeSingle();
          if (orderError) throw orderError;
          if (!order) break;

          await supabase
            .from("order_payments")
            .update({ status: "succeeded", stripe_payment_intent_id: paymentIntent.id })
            .eq("order_id", orderId);

          const { data: pointsEarned, error: loyaltyError } = await supabase.rpc("credit_order_loyalty", { target_order_id: orderId });
          if (loyaltyError) throw loyaltyError;
          const ownerId = (order.restaurants as any)?.owner_id;
          await attributeCampaignConversion(orderId, order.client_id, order.restaurant_id);

          if (ownerId) {
            await supabase.from("notifications").insert({
              user_id: ownerId,
              title: "Paiement reçu",
              message: `Commande #${orderId.slice(0, 8)} - Paiement confirmé`,
              type: "payment",
              related_order_id: orderId,
            });
          }

          await supabase.from("notifications").insert({
            user_id: order.client_id,
            title: "Commande confirmée",
            message: `Votre commande #${orderId.slice(0, 8)} est payée et attend la confirmation du restaurant. ${pointsEarned || 0} point(s) Weello ont été ajoutés à votre compte.`,
            type: "order",
            related_order_id: orderId,
          });

          // The payment must remain confirmed even if transactional email delivery fails.
          try {
            const { data: receipt } = await supabase
              .from("financial_documents")
              .select("*")
              .eq("order_id", orderId)
              .eq("document_type", "client_payment_receipt")
              .single();
            if (receipt) await sendFinancialDocumentEmail(receipt as any);
          } catch (emailError) {
            console.error("Receipt email failed:", emailError);
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          const { error: releaseError } = await supabase.rpc("release_order_advantage", { target_order_id: orderId });
          if (releaseError) throw releaseError;
          const { data: order } = await supabase
            .from("orders")
            .select("client_id, points_redeemed_cents")
            .eq("id", orderId)
            .single();

          await supabase
            .from("orders")
            .update({
              status: "cancelled",
              payment_status: "failed",
            })
            .eq("id", orderId);

          await supabase
            .from("order_payments")
            .update({ status: "failed" })
            .eq("order_id", orderId);

          await Promise.all([
            supabase.from("client_delivery_codes").delete().eq("order_id", orderId),
            supabase.from("delivery_code_verifications").delete().eq("order_id", orderId),
          ]);

          if (order?.points_redeemed_cents) {
            const { data: wallet } = await supabase
              .from("client_wallets")
              .select("points_balance")
              .eq("user_id", order.client_id)
              .single();

            if (wallet) {
              await supabase
                .from("client_wallets")
                .update({ points_balance: (wallet.points_balance || 0) + order.points_redeemed_cents })
                .eq("user_id", order.client_id);
            }
          }
        }
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        if (paymentIntent.metadata?.orderId) {
          await cancelUnpaidOrder(paymentIntent.metadata.orderId, "cancelled");
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        await syncPartnerSubscription(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        
        await supabase
          .from("partner_subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date().toISOString(),
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);

        if (subscriptionId) {
          // Renouvellement de souscription confirmé
          await supabase
            .from("partner_subscriptions")
            .update({
              status: "active",
              last_payment_date: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const subscriptionId = invoiceSubscriptionId(invoice);
        if (subscriptionId) {
          await supabase.from("partner_subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() }).eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error: any) {
    console.error("Webhook error:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Webhook Stripe invalide." }),
    };
  }
};

export { handler };
