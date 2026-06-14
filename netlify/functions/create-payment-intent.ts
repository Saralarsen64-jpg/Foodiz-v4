import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

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

    const { orderId, metadata } = JSON.parse(event.body || "{}");

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing orderId" }),
      };
    }

    const { data: order } = await adminSupabase
      .from("orders")
      .select("client_id, final_client_total_cents, points_redeemed_cents, payment_status")
      .eq("id", orderId)
      .single();

    if (!order || order.client_id !== user.id) {
      return { statusCode: 404, body: JSON.stringify({ error: "Order not found" }) };
    }

    if (order.payment_status === "completed") {
      return { statusCode: 409, body: JSON.stringify({ error: "Order already paid" }) };
    }

    const amountCents = Math.max(
      0,
      order.final_client_total_cents - (order.points_redeemed_cents || 0)
    );
    const email = user.email;
    if (!email || amountCents <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid payment data" }) };
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
    await adminSupabase.from("order_payments").upsert({
      order_id: orderId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: amountCents,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret,
    }, { onConflict: "order_id" });

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
