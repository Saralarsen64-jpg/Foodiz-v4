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
    const { userId, amountCents, currency } = JSON.parse(event.body || "{}");

    if (!userId || !amountCents) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // Récupérer les infos utilisateur (pour account Stripe)
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (!profile?.email) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    // Récupérer le compte Stripe de l'utilisateur
    const customers = await stripe.customers.list({
      email: profile.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: {
          userId,
        },
      });
      customerId = customer.id;
    }

    // Créer le payout
    const payout = await stripe.payouts.create({
      amount: amountCents,
      currency: (currency || "eur").toLowerCase(),
      destination: customerId, // Cette destination devrait être un connected account
      metadata: {
        userId,
      },
      description: `Foodiz Payout for ${userId}`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        payout,
      }),
    };
  } catch (error: any) {
    console.error("Error creating payout:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
