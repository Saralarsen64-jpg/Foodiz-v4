import { loadStripe, Stripe } from "@stripe/stripe-js";
import { supabase } from "./supabase";

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_demo_foodiz");

export type BillingPeriod = "monthly" | "yearly";

/**
 * Création de PaymentIntent pour une commande
 */
export async function createPaymentIntent(
  orderId: string,
  amountCents: number,
  email: string,
  metadata: Record<string, string> = {}
) {
  try {
    const response = await fetch("/.netlify/functions/create-payment-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        orderId,
        amountCents,
        email,
        metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur création PaymentIntent:", error);
    throw error;
  }
}

/**
 * Confirmer le paiement côté client
 */
export async function confirmPayment(stripe: Stripe, clientSecret: string) {
  try {
    const cardElement = stripe.elements().getElement("card");
    if (!cardElement) {
      throw new Error("Le formulaire de carte bancaire n'est pas initialisé.");
    }

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          email: (await supabase.auth.getUser()).data.user?.email,
        },
      },
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.paymentIntent;
  } catch (error) {
    console.error("Erreur confirmation paiement:", error);
    throw error;
  }
}

/**
 * Créer une souscription Foodiz+ pour partenaire
 */
export async function createSubscription(
  restaurantId: string,
  planId: string,
  billingPeriod: BillingPeriod = "monthly"
) {
  try {
    const response = await fetch("/.netlify/functions/create-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        restaurantId,
        planId,
        billingPeriod,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Sauvegarder dans Supabase
    await supabase.from("partner_subscriptions").insert({
      restaurant_id: restaurantId,
      plan_id: planId,
      stripe_subscription_id: data.subscription.id,
      billing_period: billingPeriod,
      status: data.subscription.status,
      current_period_start: new Date(data.subscription.current_period_start * 1000),
      current_period_end: new Date(data.subscription.current_period_end * 1000),
    });

    return data.subscription;
  } catch (error) {
    console.error("Erreur création souscription:", error);
    throw error;
  }
}

/**
 * Annuler une souscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const response = await fetch("/.netlify/functions/cancel-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        subscriptionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Mettre à jour dans Supabase
    await supabase
      .from("partner_subscriptions")
      .update({ status: "canceled" })
      .eq("stripe_subscription_id", subscriptionId);

    return data;
  } catch (error) {
    console.error("Erreur annulation souscription:", error);
    throw error;
  }
}

/**
 * Récupérer les détails d'une souscription
 */
export async function getSubscription(subscriptionId: string) {
  try {
    const response = await fetch(`/.netlify/functions/get-subscription?id=${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur récupération souscription:", error);
    throw error;
  }
}

/**
 * Créer une session de facturation pour le portail client Stripe
 */
export async function createBillingPortalSession(returnUrl: string) {
  try {
    const response = await fetch("/.netlify/functions/create-billing-portal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        returnUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("Erreur création portail facturation:", error);
    throw error;
  }
}

/**
 * Créer un payout pour les partenaires/livreurs
 */
export async function createPayout(
  userId: string,
  amountCents: number,
  currency: string = "EUR"
) {
  try {
    const response = await fetch("/.netlify/functions/create-payout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({
        userId,
        amountCents,
        currency,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Enregistrer dans Supabase
    await supabase.from("payouts").insert({
      user_id: userId,
      amount_cents: amountCents,
      currency,
      stripe_payout_id: data.payout.id,
      status: data.payout.status,
    });

    return data.payout;
  } catch (error) {
    console.error("Erreur création payout:", error);
    throw error;
  }
}
