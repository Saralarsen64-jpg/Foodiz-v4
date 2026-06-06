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
    const { restaurantId, planId, billingPeriod } = JSON.parse(event.body || "{}");

    if (!restaurantId || !planId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // Récupérer le propriétaire du restaurant
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("owner_id")
      .eq("id", restaurantId)
      .single();

    if (!restaurant) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Restaurant not found" }),
      };
    }

    // Récupérer l'email du propriétaire
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", restaurant.owner_id)
      .single();

    if (!profile?.email) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Owner email not found" }),
      };
    }

    // Créer ou récupérer le customer Stripe
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
          restaurantId,
          type: "partner",
        },
      });
      customerId = customer.id;
    }

    // Plan IDs (à configurer dans votre compte Stripe)
    const planPrices: Record<string, string> = {
      basic_monthly: process.env.STRIPE_PLAN_BASIC_MONTHLY || "price_basic_monthly",
      basic_yearly: process.env.STRIPE_PLAN_BASIC_YEARLY || "price_basic_yearly",
      pro_monthly: process.env.STRIPE_PLAN_PRO_MONTHLY || "price_pro_monthly",
      pro_yearly: process.env.STRIPE_PLAN_PRO_YEARLY || "price_pro_yearly",
    };

    const priceId = planPrices[`${planId}_${billingPeriod}`];
    if (!priceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid plan or billing period" }),
      };
    }

    // Créer la souscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        restaurantId,
        planId,
      },
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        subscription,
      }),
    };
  } catch (error: any) {
    console.error("Error creating subscription:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
