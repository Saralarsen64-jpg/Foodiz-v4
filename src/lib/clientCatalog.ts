import { supabase } from "./supabase";

export type ClientCatalogRestaurant = {
  id: string;
  name: string;
  cuisine_type: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  cover_image: string | null;
  latitude: number;
  longitude: number;
  distance_meters: number | null;
};

async function clientCatalogRequest<T>(query = "") {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Session expirée.");
  const response = await fetch(`/api/client-catalog${query}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Catalogue indisponible.");
  return payload as T;
}

export function loadClientCatalog() {
  return clientCatalogRequest<{
    restaurants: ClientCatalogRestaurant[];
    coverage: {
      available: boolean;
      city: string | null;
      addressRequired: boolean;
      radiusMeters: number;
    };
  }>();
}

export function loadClientEstablishment(restaurantId: string) {
  return clientCatalogRequest<{
    restaurant: ClientCatalogRestaurant;
    products: Array<{
      id: string;
      name: string;
      description: string | null;
      category: string | null;
      image_url: string | null;
      client_price_cents: number;
      original_client_price_cents: number | null;
      promotion_label: string | null;
      promotion_ends_at: string | null;
    }>;
  }>(`?restaurantId=${encodeURIComponent(restaurantId)}`);
}
