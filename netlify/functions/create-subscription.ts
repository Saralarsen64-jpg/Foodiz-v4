import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";
import { stripeOperationGuard } from "./_lib/stripe-server.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function appOrigin(event: Parameters<Handler>[0]) {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const origin = event.headers.origin?.replace(/\/$/, "");
  if (origin) return origin;
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return productionUrl ? `https://${productionUrl}` : "http://localhost:5173";
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const stripeGuard = stripeOperationGuard();
  if (stripeGuard) return stripeGuard;

  try {
    const user = await authenticatedUser(event.headers);
    if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };

    const { restaurantId, planId, billingPeriod } = JSON.parse(event.body || "{}") as {
      restaurantId?: string;
      planId?: "discovery" | "boost" | "domination";
      billingPeriod?: "monthly" | "yearly";
    };
    if (!restaurantId || !planId || !billingPeriod) return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };

    const [{ data: restaurant }, { data: plan }] = await Promise.all([
      adminSupabase.from("restaurants").select("id,name,owner_id").eq("id", restaurantId).maybeSingle(),
      adminSupabase.from("foodiz_plus_plans").select("id,name,is_active").eq("id", planId).eq("is_active", true).maybeSingle(),
    ]);
    if (!restaurant || restaurant.owner_id !== user.id) return { statusCode: 404, body: JSON.stringify({ error: "Restaurant not found" }) };
    if (!plan) return { statusCode: 400, body: JSON.stringify({ error: "Invalid plan" }) };

    const { data: activeSubscription } = await adminSupabase
      .from("partner_subscriptions")
      .select("id,stripe_subscription_id")
      .eq("restaurant_id", restaurantId)
      .in("status", ["active", "trialing", "past_due"])
      .limit(1)
      .maybeSingle();
    if (activeSubscription) return { statusCode: 409, body: JSON.stringify({ error: "SUBSCRIPTION_ALREADY_EXISTS" }) };

    const prices: Record<string, string | undefined> = {
      discovery_monthly: process.env.STRIPE_PLAN_DISCOVERY_MONTHLY,
      discovery_yearly: process.env.STRIPE_PLAN_DISCOVERY_YEARLY,
      boost_monthly: process.env.STRIPE_PLAN_BOOST_MONTHLY,
      boost_yearly: process.env.STRIPE_PLAN_BOOST_YEARLY,
      domination_monthly: process.env.STRIPE_PLAN_DOMINATION_MONTHLY,
      domination_yearly: process.env.STRIPE_PLAN_DOMINATION_YEARLY,
    };
    const priceId = prices[`${planId}_${billingPeriod}`];
    if (!priceId) return { statusCode: 503, body: JSON.stringify({ error: "PRICE_NOT_CONFIGURED" }) };

    const { data: previousSubscription } = await adminSupabase
      .from("partner_subscriptions")
      .select("stripe_customer_id")
      .eq("restaurant_id", restaurantId)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let customerId = previousSubscription?.stripe_customer_id || null;
    if (!customerId && user.email) {
      const existingCustomers = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = existingCustomers.data[0]?.id || null;
    }
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: restaurant.name, metadata: { restaurantId, ownerId: user.id, type: "foodiz_plus" } });
      customerId = customer.id;
    }

    const origin = appOrigin(event);
    const metadata = { restaurantId, planId, billingPeriod, ownerId: user.id };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/partner/marketing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/partner/marketing?checkout=cancelled`,
      allow_promotion_codes: false,
      billing_address_collection: "auto",
      metadata,
      subscription_data: { metadata },
    });

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkoutUrl: session.url }) };
  } catch (error: any) {
    console.error("Foodiz+ Checkout creation failed", error);
    return { statusCode: 500, body: JSON.stringify({ error: "CHECKOUT_CREATION_FAILED" }) };
  }
};

export { handler };
