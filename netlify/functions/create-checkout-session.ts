import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomInt } from "node:crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

type CheckoutItem = {
  productId: string;
  quantity: number;
};

type OrderTotals = {
  partnerTotalCents: number;
  foodizRevenueCents: number;
  courierEarningsCents: number;
  courierPrimeFundCents: number;
  loyaltyFundCents: number;
  referralFundCents: number;
  internalFeesCents: number;
  systemReserveCents: number;
  serviceFeeCents: number;
  deliveryFeeCents: number;
  finalClientTotalCents: number;
};

function calculateItemSplit(partnerPriceCents: number) {
  if (partnerPriceCents >= 50 && partnerPriceCents <= 350) {
    return {
      supplementCents: 130,
      courierDirectCents: 50,
      courierPrimeCents: 10,
      foodizRevenueCents: 40,
      loyaltyFundCents: 10,
      referralFundCents: 0,
      internalFeesCents: 10,
      systemReserveCents: 10,
    };
  }

  if (partnerPriceCents >= 351 && partnerPriceCents <= 849) {
    return {
      supplementCents: 260,
      courierDirectCents: 100,
      courierPrimeCents: 10,
      foodizRevenueCents: 100,
      loyaltyFundCents: 20,
      referralFundCents: 20,
      internalFeesCents: 10,
      systemReserveCents: 0,
    };
  }

  return {
    supplementCents: 360,
    courierDirectCents: 120,
    courierPrimeCents: 10,
    foodizRevenueCents: 130,
    loyaltyFundCents: 30,
    referralFundCents: 30,
    internalFeesCents: 20,
    systemReserveCents: 20,
  };
}

function calculateServiceFee(itemCount: number) {
  if (itemCount === 1) return 199;
  if (itemCount === 2) return 149;
  if (itemCount === 3) return 119;
  return 99;
}

function calculateDeliveryFee(distanceKm: number) {
  if (distanceKm <= 1.5) return 199;
  if (distanceKm <= 3.0) return 249;
  if (distanceKm <= 4.0) return 350;
  return 350 + Math.ceil((distanceKm - 4.0) * 50);
}

function calculateFoodizOrder(items: { partnerPriceCents: number }[], distanceKm: number): OrderTotals {
  return items.reduce(
    (totals, item) => {
      const split = calculateItemSplit(item.partnerPriceCents);
      return {
        ...totals,
        partnerTotalCents: totals.partnerTotalCents + item.partnerPriceCents,
        foodizRevenueCents: totals.foodizRevenueCents + split.foodizRevenueCents,
        courierEarningsCents: totals.courierEarningsCents + split.courierDirectCents,
        courierPrimeFundCents: totals.courierPrimeFundCents + split.courierPrimeCents,
        loyaltyFundCents: totals.loyaltyFundCents + split.loyaltyFundCents,
        referralFundCents: totals.referralFundCents + split.referralFundCents,
        internalFeesCents: totals.internalFeesCents + split.internalFeesCents,
        systemReserveCents: totals.systemReserveCents + split.systemReserveCents,
        finalClientTotalCents:
          totals.finalClientTotalCents + item.partnerPriceCents + split.supplementCents,
      };
    },
    {
      partnerTotalCents: 0,
      foodizRevenueCents: 0,
      courierEarningsCents: 0,
      courierPrimeFundCents: 0,
      loyaltyFundCents: 0,
      referralFundCents: 0,
      internalFeesCents: 0,
      systemReserveCents: 0,
      serviceFeeCents: calculateServiceFee(items.length),
      deliveryFeeCents: calculateDeliveryFee(distanceKm),
      finalClientTotalCents: calculateServiceFee(items.length) + calculateDeliveryFee(distanceKm),
    }
  );
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radiusKm * c;
}

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

    const { restaurantId, items, deliveryAddress, useAdvantage } = JSON.parse(event.body || "{}") as {
      restaurantId?: string;
      items?: CheckoutItem[];
      deliveryAddress?: string;
      useAdvantage?: boolean;
    };

    if (!restaurantId || !Array.isArray(items) || items.length === 0 || !deliveryAddress) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing checkout data" }) };
    }

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
          .select("id, name, category, partner_price_cents, restaurant_id")
          .in("id", productIds)
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true),
        supabase
          .from("restaurants")
          .select("id, name, cuisine_type, latitude, longitude, is_active")
          .eq("id", restaurantId)
          .single(),
        supabase
          .from("profiles")
          .select("id, email, latitude, longitude")
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

    if (!products || products.length !== productIds.length) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid cart products" }) };
    }

    const calculationItems = normalizedItems.flatMap((cartItem) => {
      const product = products.find((candidate) => candidate.id === cartItem.productId);
      return Array(cartItem.quantity).fill({
        partnerPriceCents: product?.partner_price_cents || 0,
      });
    });

    let distanceKm = 2;
    if (client.latitude && client.longitude && restaurant.latitude && restaurant.longitude) {
      distanceKm = calculateDistance(
        Number(client.latitude),
        Number(client.longitude),
        Number(restaurant.latitude),
        Number(restaurant.longitude)
      );
    }

    const totals = calculateFoodizOrder(calculationItems, distanceKm);
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
        advantageDiscountCents = Math.min(faceValue, eligibleProduct.partner_price_cents);
      } else {
        advantageDiscountCents = Math.min(faceValue, totals.finalClientTotalCents);
      }
      lockedAdvantage = { ...locked, catalog };
    }

    const amountToPayCents = Math.max(0, totals.finalClientTotalCents - advantageDiscountCents);
    const siteUrl = appOrigin(event);
    const deliveryCode = randomInt(100000, 1000000).toString();
    const deliveryCodeHash = createHash("sha256").update(deliveryCode).digest("hex");

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        client_id: authData.user.id,
        restaurant_id: restaurantId,
        status: amountToPayCents === 0 ? "preparing" : "pending",
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
        foodiz_revenue_cents: totals.foodizRevenueCents,
        system_reserve_cents: totals.systemReserveCents,
        points_redeemed_cents: 0,
        advantage_discount_cents: advantageDiscountCents,
        estimated_time_mins: 30,
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
      return {
        order_id: order.id,
        product_id: cartItem.productId,
        quantity: cartItem.quantity,
        unit_price_cents: product?.partner_price_cents || 0,
        total_price_cents: (product?.partner_price_cents || 0) * cartItem.quantity,
      };
    });

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) {
      throw new Error(itemsError.message);
    }

    const { error: codeError } = await supabase.from("client_delivery_codes").insert({
      order_id: order.id,
      client_id: authData.user.id,
      code: deliveryCode,
    });
    if (codeError) {
      throw new Error(codeError.message);
    }

    const { error: verificationError } = await supabase.from("delivery_code_verifications").insert({
      order_id: order.id,
      code_hash: deliveryCodeHash,
    });
    if (verificationError) {
      throw new Error(verificationError.message);
    }

    if (amountToPayCents === 0) {
      if (lockedAdvantage) {
        const { error: applyError } = await supabase.rpc("apply_order_advantage", { target_order_id: order.id });
        if (applyError) throw applyError;
      }
      return {
        statusCode: 200,
        body: JSON.stringify({
          orderId: order.id,
          url: `${siteUrl}/client/orders/${order.id}`,
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
              name: `Commande Foodiz - ${restaurant.name}`,
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
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
