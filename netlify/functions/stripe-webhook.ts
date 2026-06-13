import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

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
      case "payment_intent.succeeded": {
        const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
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

      case "customer.subscription.updated": {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const restaurantId = subscription.metadata?.restaurantId;

        if (restaurantId) {
          await supabase
            .from("partner_subscriptions")
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000),
              current_period_end: new Date(subscription.current_period_end * 1000),
            })
            .eq("stripe_subscription_id", subscription.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        
        await supabase
          .from("partner_subscriptions")
          .update({
            status: "canceled",
            canceled_at: new Date(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          // Renouvellement de souscription confirmé
          await supabase
            .from("partner_subscriptions")
            .update({
              status: "active",
              last_payment_date: new Date(),
            })
            .eq("stripe_subscription_id", subscriptionId);
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
