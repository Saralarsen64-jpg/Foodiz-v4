import type { Handler } from "@netlify/functions";

import { calculateClientUnitPriceCents } from "../../src/lib/engines/weelloEconomicEngine.js";
import {
  effectivePartnerPriceCents,
  productOfferIsActive,
} from "../../src/lib/productOffers.js";
import { calculateStraightLineDistanceMeters } from "./_lib/routingProvider.js";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";

const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return reply(405, { error: "Method Not Allowed" });

  try {
    const user = await authenticatedUser(event.headers);
    if (!user) return reply(401, { error: "Unauthorized" });

    const restaurantId = event.queryStringParameters?.restaurantId;
    if (restaurantId) {
      const [{ data: restaurant, error: restaurantError }, { data: products, error: productsError }] =
        await Promise.all([
          adminSupabase
            .from("restaurants")
            .select("id,name,cuisine_type,city,address,postal_code,cover_image,latitude,longitude")
            .eq("id", restaurantId)
            .eq("is_active", true)
            .not("latitude", "is", null)
            .not("longitude", "is", null)
            .single(),
          adminSupabase
            .from("products")
            .select("id,name,description,category,image_url,partner_price_cents,promotion_label,promotion_partner_price_cents,promotion_starts_at,promotion_ends_at")
            .eq("restaurant_id", restaurantId)
            .eq("is_active", true)
            .order("category")
            .order("name"),
        ]);

      if (restaurantError || !restaurant) return reply(404, { error: "Restaurant unavailable" });
      if (productsError) throw productsError;

      return reply(200, {
        restaurant,
        products: (products || []).map((product) => {
          const offerActive = productOfferIsActive(product);
          return {
            id: product.id,
            name: product.name,
            description: product.description,
            category: product.category,
            image_url: product.image_url,
            client_price_cents: calculateClientUnitPriceCents(
              effectivePartnerPriceCents(product),
            ),
            original_client_price_cents: offerActive
              ? calculateClientUnitPriceCents(product.partner_price_cents)
              : null,
            promotion_label: offerActive
              ? product.promotion_label || "Offre partenaire"
              : null,
            promotion_ends_at: offerActive ? product.promotion_ends_at : null,
          };
        }),
      });
    }

    const [{ data, error }, { data: profile }] = await Promise.all([
      adminSupabase
        .from("restaurants")
        .select("id,name,cuisine_type,city,address,postal_code,cover_image,latitude,longitude")
        .eq("is_active", true)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("name"),
      adminSupabase
        .from("profiles")
        .select("city,postal_code,latitude,longitude")
        .eq("id", user.id)
        .single(),
    ]);
    if (error) throw error;

    const clientLocation = {
      latitude: Number(profile?.latitude),
      longitude: Number(profile?.longitude),
    };
    const hasClientLocation = Number.isFinite(clientLocation.latitude)
      && Number.isFinite(clientLocation.longitude);
    const restaurants = (data || [])
      .map((restaurant) => ({
        ...restaurant,
        distance_meters: hasClientLocation
          ? calculateStraightLineDistanceMeters(clientLocation, {
              latitude: Number(restaurant.latitude),
              longitude: Number(restaurant.longitude),
            })
          : null,
      }))
      .filter((restaurant) => (
        hasClientLocation
          ? Number(restaurant.distance_meters) <= 25_000
          : restaurant.city?.trim().toLowerCase()
            === profile?.city?.trim().toLowerCase()
      ))
      .sort((first, second) => (
        Number(first.distance_meters || 0) - Number(second.distance_meters || 0)
      ));

    return reply(200, {
      restaurants,
      coverage: {
        available: restaurants.length > 0,
        city: profile?.city || null,
        addressRequired: !hasClientLocation,
      },
    });
  } catch (error) {
    console.error("Client catalog failed", error);
    return reply(500, { error: "CLIENT_CATALOG_FAILED" });
  }
};

export { handler };
