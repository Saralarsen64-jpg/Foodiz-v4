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

    const { restaurantId, planId, billingPeriod } = JSON.parse(event.body || "{}");

    if (!restaurantId || !planId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // Récupérer le propriétaire du restaurant
    const { data: restaurant } = await adminSupabase
      .from("restaurants")
      .select("owner_id")
      .eq("id", restaurantId)
      .single();

    if (!restaurant || restaurant.owner_id !== user.id) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Restaurant not found" }),
      };
    }

    // Récupérer l'email du propriétaire
    const { data: profile } = await adminSupabase
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
    const planPrices: Record<string, string | undefined> = {
      basic_monthly: process.env.STRIPE_PLAN_BASIC_MONTHLY,
      basic_yearly: process.env.STRIPE_PLAN_BASIC_YEARLY,
      pro_monthly: process.env.STRIPE_PLAN_PRO_MONTHLY,
      pro_yearly: process.env.STRIPE_PLAN_PRO_YEARLY,
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

    await adminSupabase.from("partner_subscriptions").upsert({
      restaurant_id: restaurantId,
      stripe_subscription_id: subscription.id,
      plan_id: planId,
      billing_period: billingPeriod,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    }, { onConflict: "stripe_subscription_id" });

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
