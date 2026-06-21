import type { Handler } from "@netlify/functions";

import { calculateClientUnitPriceCents } from "../../src/lib/engines/foodizEconomicEngine.js";
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
            .select("id,name,cuisine_type,city,address,postal_code,cover_image")
            .eq("id", restaurantId)
            .eq("is_active", true)
            .single(),
          adminSupabase
            .from("products")
            .select("id,name,description,category,image_url,partner_price_cents")
            .eq("restaurant_id", restaurantId)
            .eq("is_active", true)
            .order("category")
            .order("name"),
        ]);

      if (restaurantError || !restaurant) return reply(404, { error: "Restaurant unavailable" });
      if (productsError) throw productsError;

      return reply(200, {
        restaurant,
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

    const { data, error } = await adminSupabase
      .from("restaurants")
      .select("id,name,cuisine_type,city,address,postal_code,cover_image")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;

    return reply(200, { restaurants: data || [] });
  } catch (error) {
    console.error("Client catalog failed", error);
    return reply(500, { error: "CLIENT_CATALOG_FAILED" });
  }
};

export { handler };
