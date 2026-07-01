import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";
import { stripeOperationGuard } from "./_lib/stripe-server.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const stripeGuard = stripeOperationGuard();
  if (stripeGuard) return stripeGuard;
  try {
    const user = await authenticatedUser(event.headers);
    if (!user) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    const { returnUrl } = JSON.parse(event.body || "{}");
    if (!returnUrl) return { statusCode: 400, body: JSON.stringify({ error: "Missing returnUrl" }) };

    const configuredOrigin = process.env.APP_URL
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);
    if (configuredOrigin && new URL(returnUrl).origin !== new URL(configuredOrigin).origin) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid returnUrl" }) };
    }

    const { data: subscription } = await adminSupabase
      .from("partner_subscriptions")
      .select("stripe_customer_id,restaurant:restaurants!inner(owner_id)")
      .eq("restaurant.owner_id", user.id)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!subscription?.stripe_customer_id) return { statusCode: 404, body: JSON.stringify({ error: "Stripe customer not found" }) };

    const session = await stripe.billingPortal.sessions.create({ customer: subscription.stripe_customer_id, return_url: returnUrl });
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: session.url }) };
  } catch (error: any) {
    console.error("Billing portal creation failed", error);
    return { statusCode: 500, body: JSON.stringify({ error: "BILLING_PORTAL_FAILED" }) };
  }
};

export { handler };
