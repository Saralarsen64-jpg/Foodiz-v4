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
    const { orderId, amountCents, email, metadata } = JSON.parse(event.body || "{}");

    if (!orderId || !amountCents || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // Créer ou récupérer le customer Stripe
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          orderId,
        },
      });
      customerId = customer.id;
    }

    // Créer le PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "eur",
      customer: customerId,
      metadata: {
        orderId,
        ...metadata,
      },
      description: `Foodiz Order #${orderId.slice(0, 8)}`,
    });

    // Sauvegarder dans Supabase
    await supabase.from("order_payments").insert({
      order_id: orderId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: amountCents,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
    };
  } catch (error: any) {
    console.error("Error creating payment intent:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
