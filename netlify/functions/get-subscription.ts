import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const user = await authenticatedUser(event.headers);
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const { id } = event.queryStringParameters || {};

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing subscription ID" }),
      };
    }

    const { data: storedSubscription } = await adminSupabase
      .from("partner_subscriptions")
      .select("restaurants(owner_id)")
      .eq("stripe_subscription_id", id)
      .single();

    if (!storedSubscription || (storedSubscription.restaurants as any)?.owner_id !== user.id) {
      return { statusCode: 404, body: JSON.stringify({ error: "Subscription not found" }) };
    }

    // Récupérer la souscription
    const subscription = await stripe.subscriptions.retrieve(id, {
      expand: ["customer", "latest_invoice.payment_intent"],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        subscription,
      }),
    };
  } catch (error: any) {
    console.error("Error retrieving subscription:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "L’abonnement n’a pas pu être récupéré." }),
    };
  }
};

export { handler };
