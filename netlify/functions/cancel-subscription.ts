import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { adminSupabase, authenticatedUser } from "./_lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const user = await authenticatedUser(event.headers);
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const { subscriptionId } = JSON.parse(event.body || "{}");

    if (!subscriptionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing subscriptionId" }),
      };
    }

    const { data: storedSubscription } = await adminSupabase
      .from("partner_subscriptions")
      .select("restaurant_id, restaurants(owner_id)")
      .eq("stripe_subscription_id", subscriptionId)
      .single();

    if (!storedSubscription || (storedSubscription.restaurants as any)?.owner_id !== user.id) {
      return { statusCode: 404, body: JSON.stringify({ error: "Subscription not found" }) };
    }

    // Annuler la souscription
    const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);

    // Mettre à jour dans Supabase
    await adminSupabase
      .from("partner_subscriptions")
      .update({ status: "canceled", canceled_at: new Date() })
      .eq("stripe_subscription_id", subscriptionId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        subscription: canceledSubscription,
      }),
    };
  } catch (error: any) {
    console.error("Error canceling subscription:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
