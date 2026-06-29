import type { Handler } from "@netlify/functions";

import { calculateClientUnitPriceCents } from "../../src/lib/engines/foodizEconomicEngine.js";
import { adminSupabase, authenticatedUser } from "./_lib/auth.js";
import { loadClientCoverage } from "./_lib/clientCoverage.js";
import { geocodeAddress } from "./_lib/routingProvider.js";

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

    let coverage = await loadClientCoverage(user.id);
    if (
      coverage.coverage.status === "address_required"
      && coverage.profile?.address
      && coverage.profile?.postal_code
      && coverage.profile?.city
    ) {
      try {
        const geocoded = await geocodeAddress(
          `${coverage.profile.address}, ${coverage.profile.postal_code} ${coverage.profile.city}, France`,
        );
        const { error: updateError } = await adminSupabase
          .from("profiles")
          .update({
            latitude: geocoded.latitude,
            longitude: geocoded.longitude,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        if (updateError) throw updateError;
        coverage = await loadClientCoverage(user.id);
      } catch (error) {
        console.warn("Client signup address could not be verified", {
          userId: user.id,
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    }
    const restaurantId = event.queryStringParameters?.restaurantId;
    if (restaurantId) {
      const restaurant = coverage.restaurants.find((item: any) => item.id === restaurantId);
      if (!restaurant) {
        return reply(404, {
          error: "RESTAURANT_OUT_OF_DELIVERY_AREA",
          coverage: coverage.coverage,
        });
      }
      const { data: products, error: productsError } = await adminSupabase
        .from("products")
        .select("id,name,description,category,image_url,partner_price_cents")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("category")
        .order("name");

      if (productsError) throw productsError;

      return reply(200, {
        restaurant,
        coverage: coverage.coverage,
        products: (products || []).map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          category: product.category,
          image_url: product.image_url,
          client_price_cents: calculateClientUnitPriceCents(product.partner_price_cents),
        })),
      });
    }

    const { data: existingRequest } = await adminSupabase
      .from("city_expansion_requests")
      .select("id,status,city,postal_code,created_at")
      .eq("user_id", user.id)
      .in("status", ["requested", "reviewing", "planned"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return reply(200, {
      restaurants: coverage.restaurants,
      coverage: coverage.coverage,
      expansionRequest: existingRequest || null,
    });
  } catch (error) {
    console.error("Client catalog failed", error);
    return reply(500, { error: "CLIENT_CATALOG_FAILED" });
  }
};

export { handler };
