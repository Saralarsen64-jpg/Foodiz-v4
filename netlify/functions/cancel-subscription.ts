import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { subscriptionId } = JSON.parse(event.body || "{}");

    if (!subscriptionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing subscriptionId" }),
      };
    }

    // Annuler la souscription
    const canceledSubscription = await stripe.subscriptions.del(subscriptionId);

    // Mettre à jour dans Supabase
    await supabase
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
