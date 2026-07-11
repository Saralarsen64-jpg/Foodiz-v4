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

const CLIENT_CATALOG_RADIUS_METERS = 10_000;

function coordinates(value: { latitude?: unknown; longitude?: unknown } | null | undefined) {
  const latitude = Number(value?.latitude);
  const longitude = Number(value?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return reply(405, { error: "Method Not Allowed" });

  try {
    const user = await authenticatedUser(event.headers);
    if (!user) return reply(401, { error: "Unauthorized" });

    const restaurantId = event.queryStringParameters?.restaurantId;
    if (restaurantId) {
      const [
        { data: restaurant, error: restaurantError },
        { data: products, error: productsError },
        { data: profile },
      ] =
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
          adminSupabase
            .from("profiles")
            .select("latitude,longitude")
            .eq("id", user.id)
            .single(),
        ]);

      if (restaurantError || !restaurant) return reply(404, { error: "Restaurant unavailable" });
      if (productsError) throw productsError;

      const clientLocation = coordinates(profile);
      const restaurantLocation = coordinates(restaurant);
      if (!clientLocation || !restaurantLocation) {
        return reply(422, { error: "Adresse client requise.", code: "CLIENT_LOCATION_REQUIRED" });
      }
      const distanceMeters = calculateStraightLineDistanceMeters(
        clientLocation,
        restaurantLocation,
      );
      if (distanceMeters > CLIENT_CATALOG_RADIUS_METERS) {
        return reply(404, { error: "Restaurant unavailable", code: "OUTSIDE_DELIVERY_RADIUS" });
      }

      return reply(200, {
        restaurant: { ...restaurant, distance_meters: distanceMeters },
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

    const clientLocation = coordinates(profile);
    const hasClientLocation = Boolean(clientLocation);
    const restaurants = (data || [])
      .map((restaurant) => ({
        ...restaurant,
        distance_meters: hasClientLocation
          ? calculateStraightLineDistanceMeters(clientLocation!, {
              latitude: Number(restaurant.latitude),
              longitude: Number(restaurant.longitude),
            })
          : null,
      }))
      .filter((restaurant) => (
        hasClientLocation
          ? Number(restaurant.distance_meters) <= CLIENT_CATALOG_RADIUS_METERS
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
        radiusMeters: CLIENT_CATALOG_RADIUS_METERS,
      },
    });
  } catch (error) {
    console.error("Client catalog failed", error);
    return reply(500, { error: "CLIENT_CATALOG_FAILED" });
  }
};

export { handler };
