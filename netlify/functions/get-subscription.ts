import { Handler } from "@netlify/functions";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { id } = event.queryStringParameters || {};

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing subscription ID" }),
      };
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
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
