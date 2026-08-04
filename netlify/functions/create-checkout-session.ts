import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendFinancialDocumentEmail } from "./_lib/financial-documents.js";
import { calculateRoute } from "./_lib/routingProvider.js";
import {
  calculateClientUnitPriceCents,
  calculateWeelloOrder,
  isValidCoordinates,
} from "../../src/lib/engines/weelloEconomicEngine.js";
import { effectivePartnerPriceCents } from "../../src/lib/productOffers.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

type CheckoutItem = {
  productId: string;
  quantity: number;
};

function bearerToken(event: Parameters<Handler>[0]) {
  const header = event.headers.authorization || event.headers.Authorization;
  return header?.replace(/^Bearer\s+/i, "");
}

function appOrigin(event: Parameters<Handler>[0]) {
  const configuredUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (configuredUrl) return configuredUrl;

  const requestOrigin = event.headers.origin?.replace(/\/$/, "");
  if (requestOrigin) return requestOrigin;

  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercelUrl ? `https://${vercelUrl}` : "http://localhost:5173";
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const token = bearerToken(event);
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid session" }) };
    }

    const { restaurantId, items, useAdvantage, quoteOnly, expectedTotalCents, paymentMode, missingItemPreference } = JSON.parse(event.body || "{}") as {
      restaurantId?: string;
      items?: CheckoutItem[];
      useAdvantage?: boolean;
      quoteOnly?: boolean;
      expectedTotalCents?: number;
      paymentMode?: "checkout" | "mobile";
      missingItemPreference?: "ask_before_replacement" | "refund_unavailable";
    };

    if (!restaurantId || !Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing checkout data" }) };
    }
    const safeMissingItemPreference = missingItemPreference === "refund_unavailable"
      ? "refund_unavailable"
      : "ask_before_replacement";

    const normalizedItems = items
      .map((item) => ({
        productId: item.productId,
        quantity: Math.max(1, Math.min(20, Math.floor(Number(item.quantity) || 1))),
      }))
      .filter((item) => item.productId);

    if (normalizedItems.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Cart is empty" }) };
    }

    const productIds = normalizedItems.map((item) => item.productId);
    const [{ data: products }, { data: restaurant }, { data: client }, { data: wallet }] =
      await Promise.all([
        supabase
          .from("products")
          .select("id, name, category, partner_price_cents, promotion_partner_price_cents, promotion_starts_at, promotion_ends_at, restaurant_id")
          .in("id", productIds)
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true),
        supabase
          .from("restaurants")
          .select("id, name, owner_id, cuisine_type, latitude, longitude, is_active")
          .eq("id", restaurantId)
          .single(),
        supabase
          .from("profiles")
          .select("id, email, address, postal_code, city, latitude, longitude")
          .eq("id", authData.user.id)
          .single(),
        supabase
          .from("client_wallets")
          .select("points_balance")
          .eq("user_id", authData.user.id)
          .single(),
      ]);

    if (!restaurant?.is_active) {
      return { statusCode: 400, body: JSON.stringify({ error: "Restaurant unavailable" }) };
    }

    if (!client?.email) {
      return { statusCode: 400, body: JSON.stringify({ error: "Client profile incomplete" }) };
    }

    const deliveryAddress = [client.address, client.postal_code, client.city]
      .filter(Boolean)
      .join(", ");
    if (!deliveryAddress) {
      return { statusCode: 400, body: JSON.stringify({ error: "Adresse de livraison requise" }) };
    }

    if (!products || products.length !== productIds.length) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid cart products" }) };
    }

    const calculationItems = normalizedItems.flatMap((cartItem) => {
      const product = products.find((candidate) => candidate.id === cartItem.productId);
      return Array(cartItem.quantity).fill({
        partnerPriceCents: product ? effectivePartnerPriceCents(product) : 0,
      });
    });

    if (
      !isValidCoordinates(client.latitude, client.longitude) ||
      !isValidCoordinates(restaurant.latitude, restaurant.longitude)
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Coordonnées de livraison invalides. Vérifiez votre adresse avant de commander.",
        }),
      };
    }

    const route = await calculateRoute(
      {
        latitude: Number(restaurant.latitude),
        longitude: Number(restaurant.longitude),
      },
      {
        latitude: Number(client.latitude),
        longitude: Number(client.longitude),
      },
    );
    const distanceKm = route.distanceKm;
    if (distanceKm > 25) {
      return {
        statusCode: 422,
        body: JSON.stringify({
          error: "Cet établissement est hors de votre zone de livraison Weello.",
          code: "OUTSIDE_DELIVERY_AREA",
        }),
      };
    }
    const totals = calculateWeelloOrder(calculationItems, distanceKm);
    const { data: reservedRows } = await supabase
      .from("order_advantage_redemptions")
      .select("points_cost")
      .eq("user_id", authData.user.id)
      .eq("status", "reserved");
    const reservedPoints = (reservedRows || []).reduce((sum, row) => sum + Number(row.points_cost || 0), 0);
    const availablePoints = Math.max(0, (wallet?.points_balance || 0) - reservedPoints);

    let lockedAdvantage: any = null;
    let advantageDiscountCents = 0;
    if (useAdvantage) {
      const { data: locked } = await supabase
        .from("client_locked_advantages")
        .select("id,catalog_id,title,points_cost")
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (!locked) return { statusCode: 409, body: JSON.stringify({ error: "Avantage verrouillé introuvable" }) };

      const { data: catalog } = await supabase.from("advantage_catalog").select("*").eq("id", locked.catalog_id).single();
      if (!catalog || availablePoints < catalog.points_cost) {
        return { statusCode: 409, body: JSON.stringify({ error: "Solde insuffisant pour cet avantage" }) };
      }

      const isMarket = /market|épicerie/i.test(restaurant.cuisine_type || "");
      if ((catalog.category === "market" && !isMarket) || (catalog.category === "restaurant" && isMarket)) {
        return { statusCode: 409, body: JSON.stringify({ error: "Cet avantage n'est pas compatible avec cet établissement" }) };
      }
      if ((catalog.eligible_establishments || []).length && !catalog.eligible_establishments.includes(restaurantId)) {
        return { statusCode: 409, body: JSON.stringify({ error: "Établissement non éligible à cet avantage" }) };
      }
      if (totals.partnerTotalCents < Number(catalog.minimum_order_cents || 0)) {
        return { statusCode: 409, body: JSON.stringify({ error: "Le minimum d'achat de cet avantage n'est pas atteint" }) };
      }

      const faceValue = Number(catalog.face_value_cents || catalog.points_cost || 0);
      if (catalog.reward_type === "free_delivery") {
        advantageDiscountCents = Math.min(faceValue, totals.deliveryFeeCents);
      } else if (catalog.reward_type === "free_item") {
        const key = String(catalog.template_key || "");
        const keywords: Record<string, RegExp> = {
          "250-drink": /boisson|soda|jus|eau|café|thé/i,
          "250-dessert": /dessert|gâteau|tarte|glace|cookie|brownie/i,
          "500-starter": /entrée|starter|soupe|nems|bruschetta/i,
          "500-dessert": /dessert|gâteau|tarte|glace|cookie|brownie/i,
          "500-kids": /enfant|kids/i,
          "800-dessert": /dessert|gâteau|tarte|glace|cookie|brownie/i,
          "800-pizza": /pizza/i,
          "800-salad": /salade/i,
          "1000-menu": /menu|formule/i,
          "1500-menu": /menu|formule/i,
          "1500-fruit": /fruit/i,
          "1500-treats": /gourmand|confiserie|chocolat|bonbon|biscuit/i,
          "2000-premium": /premium|menu|formule/i,
        };
        const matcher = keywords[key];
        const eligibleIds: string[] = catalog.eligible_products || [];
        const eligibleProduct = products.find((product) =>
          eligibleIds.length ? eligibleIds.includes(product.id) : matcher ? matcher.test(`${product.name} ${product.category}`) : true
        );
        if (!eligibleProduct) {
          return { statusCode: 409, body: JSON.stringify({ error: "Ajoutez un produit éligible au panier pour utiliser cet avantage" }) };
        }
        advantageDiscountCents = Math.min(
          faceValue,
          calculateClientUnitPriceCents(
            effectivePartnerPriceCents(eligibleProduct),
          ),
        );
      } else {
        advantageDiscountCents = Math.min(faceValue, totals.finalClientTotalCents);
      }
      lockedAdvantage = { ...locked, catalog };
    }

    const amountToPayCents = Math.max(0, totals.finalClientTotalCents - advantageDiscountCents);

    if (quoteOnly) {
      const quotedItems = normalizedItems.map((cartItem) => {
        const product = products.find((candidate) => candidate.id === cartItem.productId)!;
        const unitPriceCents = calculateClientUnitPriceCents(
          effectivePartnerPriceCents(product),
        );
        return {
          productId: product.id,
          name: product.name,
          quantity: cartItem.quantity,
          unitPriceCents,
          totalPriceCents: unitPriceCents * cartItem.quantity,
        };
      });
      return {
        statusCode: 200,
        body: JSON.stringify({
          quote: {
            items: quotedItems,
            clientItemsTotalCents: totals.clientItemsTotalCents,
            serviceFeeCents: totals.serviceFeeCents,
            deliveryFeeCents: totals.deliveryFeeCents,
            advantageDiscountCents,
            finalClientTotalCents: amountToPayCents,
            distanceKm,
            estimatedTimeMins: route.durationMinutes,
          },
        }),
      };
    }

    if (
      process.env.ALLOW_LIVE_PAYMENTS !== "true"
      && process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
    ) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: "Les paiements réels sont désactivés pendant la phase de développement.",
          code: "LIVE_PAYMENTS_DISABLED",
        }),
      };
    }

    if (
      !Number.isInteger(expectedTotalCents) ||
      expectedTotalCents !== amountToPayCents
    ) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: "Le prix de la commande a changé. Rechargez le récapitulatif avant de payer.",
          code: "CHECKOUT_PRICE_CHANGED",
        }),
      };
    }

    const siteUrl = appOrigin(event);
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        client_id: authData.user.id,
        restaurant_id: restaurantId,
        status: "pending",
        payment_status: amountToPayCents === 0 ? "completed" : "pending",
        delivery_address: deliveryAddress,
        client_latitude: client.latitude,
        client_longitude: client.longitude,
        final_client_total_cents: amountToPayCents,
        partner_total_cents: totals.partnerTotalCents,
        service_fee_cents: totals.serviceFeeCents,
        internal_fees_cents: totals.internalFeesCents,
        delivery_fee_cents: totals.deliveryFeeCents,
        courier_earnings_cents: totals.courierEarningsCents,
        courier_prime_fund_cents: totals.courierPrimeFundCents,
        loyalty_fund_cents: totals.loyaltyFundCents,
        referral_fund_cents: totals.referralFundCents,
        foodiz_revenue_cents: totals.weelloRevenueCents,
        system_reserve_cents: totals.systemReserveCents,
        points_redeemed_cents: 0,
        advantage_discount_cents: advantageDiscountCents,
        missing_item_preference: safeMissingItemPreference,
        estimated_time_mins: route.durationMinutes,
        delivery_route_distance_meters: route.distanceMeters,
        delivery_route_duration_seconds: route.durationSeconds,
        delivery_route_provider: route.provider,
        delivery_route_is_fallback: route.isFallback,
        delivery_route_calculated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message || "Order creation failed");
    }

    if (lockedAdvantage && advantageDiscountCents > 0) {
      const { error: reserveError } = await supabase.rpc("reserve_order_advantage", {
        target_order_id: order.id,
        target_user_id: authData.user.id,
        target_locked_id: lockedAdvantage.id,
        expected_discount_cents: advantageDiscountCents,
      });
      if (reserveError) {
        await supabase.from("orders").delete().eq("id", order.id);
        throw new Error(reserveError.message);
      }
    }

    const orderItems = normalizedItems.map((cartItem) => {
      const product = products.find((candidate) => candidate.id === cartItem.productId);
      const partnerUnitPriceCents = product
        ? effectivePartnerPriceCents(product)
        : 0;
      const clientUnitPriceCents = calculateClientUnitPriceCents(partnerUnitPriceCents);
      return {
        order_id: order.id,
        product_id: cartItem.productId,
        quantity: cartItem.quantity,
        unit_price_cents: clientUnitPriceCents,
        total_price_cents: clientUnitPriceCents * cartItem.quantity,
        partner_unit_price_cents: partnerUnitPriceCents,
        partner_total_price_cents: partnerUnitPriceCents * cartItem.quantity,
      };
    });

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) {
      throw new Error(itemsError.message);
    }

    const { error: codeError } = await supabase.rpc("create_order_delivery_code", {
      target_order_id: order.id,
      target_client_id: authData.user.id,
    });
    if (codeError) {
      throw new Error(codeError.message);
    }

    if (amountToPayCents === 0) {
      if (lockedAdvantage) {
        const { error: applyError } = await supabase.rpc("apply_order_advantage", { target_order_id: order.id });
        if (applyError) throw applyError;
      }
      const { error: loyaltyError } = await supabase.rpc("credit_order_loyalty", { target_order_id: order.id });
      if (loyaltyError) throw loyaltyError;
      if (restaurant.owner_id) {
        await supabase.from("notifications").insert({
          user_id: restaurant.owner_id,
          type: "order",
          title: "Nouvelle commande à confirmer",
          message: `La commande #${order.id.slice(0, 8)} est réglée et attend votre confirmation.`,
          related_order_id: order.id,
        });
      }
      const { data: documentId } = await supabase.rpc("generate_client_payment_receipt", { target_order_id: order.id });
      if (documentId) {
        try {
          const { data: receipt } = await supabase.from("financial_documents").select("*").eq("id", documentId).single();
          if (receipt) await sendFinancialDocumentEmail(receipt as any);
        } catch (emailError) {
          console.error("Zero amount receipt email failed:", emailError);
        }
      }
      return {
        statusCode: 200,
        body: JSON.stringify({
          orderId: order.id,
          url: `${siteUrl}/client/orders/${order.id}`,
        }),
      };
    }

    if (paymentMode === "mobile") {
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountToPayCents,
          currency: "eur",
          receipt_email: client.email,
          automatic_payment_methods: { enabled: true },
          metadata: {
            orderId: order.id,
            clientId: authData.user.id,
            restaurantId,
            source: "weello_mobile",
          },
          description: `Commande Weello #${order.id.slice(0, 8)}`,
        },
        { idempotencyKey: `foodiz-mobile-payment-${order.id}` },
      );

      await supabase.from("order_payments").insert({
        order_id: order.id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: amountToPayCents,
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          orderId: order.id,
          clientSecret: paymentIntent.client_secret,
        }),
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: client.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amountToPayCents,
            product_data: {
              name: `Commande Weello - ${restaurant.name}`,
              description: `${normalizedItems.length} article(s), livraison incluse`,
            },
          },
        },
      ],
      success_url: `${siteUrl}/client/orders/${order.id}?payment=success`,
      cancel_url: `${siteUrl}/client/checkout?payment=cancelled`,
      metadata: {
        orderId: order.id,
        clientId: authData.user.id,
        restaurantId,
      },
      payment_intent_data: {
        metadata: {
          orderId: order.id,
          clientId: authData.user.id,
          restaurantId,
        },
      },
    });

    await supabase.from("order_payments").insert({
      order_id: order.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripe_checkout_session_id: session.id,
      amount_cents: amountToPayCents,
      status: "checkout_created",
      client_secret: session.id,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        orderId: order.id,
        url: session.url,
      }),
    };
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Le paiement n’a pas pu être préparé." }),
    };
  }
};

export { handler };
