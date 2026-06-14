import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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

      case "payment_intent.succeeded": {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          const { error: advantageError } = await supabase.rpc("apply_order_advantage", { target_order_id: orderId });
          if (advantageError) throw advantageError;
          await supabase
            .from("orders")
            .update({
              status: "preparing",
              payment_status: "completed",
              stripe_payment_intent_id: paymentIntent.id,
            })
            .eq("id", orderId);

          await supabase
            .from("order_payments")
            .update({ status: "succeeded", stripe_payment_intent_id: paymentIntent.id })
            .eq("order_id", orderId);

          const { data: order } = await supabase
            .from("orders")
            .select("client_id, restaurant_id, loyalty_fund_cents, restaurants(owner_id)")
            .eq("id", orderId)
            .single();

          if (order) {
            const ownerId = (order.restaurants as any)?.owner_id;
            const pointsEarned = Math.max(0, order.loyalty_fund_cents || 0);

            const { data: wallet } = await supabase
              .from("client_wallets")
              .select("points_balance")
              .eq("user_id", order.client_id)
              .single();

            if (wallet) {
              await supabase
                .from("client_wallets")
                .update({ points_balance: (wallet.points_balance || 0) + pointsEarned })
                .eq("user_id", order.client_id);
            }

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
              message: `Votre commande #${orderId.slice(0, 8)} est en préparation. ${pointsEarned} point(s) Foodiz ont été ajoutés à votre compte.`,
              type: "order",
              related_order_id: orderId,
            });
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
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
