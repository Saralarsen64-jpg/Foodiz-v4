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
    const { returnUrl } = JSON.parse(event.body || "{}");
    const auth = event.headers["authorization"];
    const token = auth?.split(" ")[1];

    if (!token || !returnUrl) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing token or returnUrl" }),
      };
    }

    // Récupérer l'utilisateur depuis le token
    const { data } = await supabase.auth.getUser(token);
    if (!data.user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    // Récupérer l'email pour retrouver le customer Stripe
    const customers = await stripe.customers.list({
      email: data.user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No Stripe customer found" }),
      };
    }

    // Créer une session du portail de facturation
    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: returnUrl,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: session.url,
      }),
    };
  } catch (error: any) {
    console.error("Error creating billing portal session:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
