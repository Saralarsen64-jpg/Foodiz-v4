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
          // Mettre à jour la commande comme payée
          await supabase
            .from("orders")
            .update({
              status: "preparing",
              payment_status: "completed",
            })
            .eq("id", orderId);

          // Créer une notification
          const { data: order } = await supabase
            .from("orders")
            .select("client_id, restaurant_id")
            .eq("id", orderId)
            .single();

          if (order) {
            await supabase.from("notifications").insert({
              user_id: order.restaurant_id,
              title: "Paiement reçu",
              message: `Commande #${orderId.slice(0, 8)} - Paiement confirmé`,
              type: "payment",
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
          // Mettre à jour la commande comme échouée
          await supabase
            .from("orders")
            .update({
              status: "cancelled",
              payment_status: "failed",
            })
            .eq("id", orderId);
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
