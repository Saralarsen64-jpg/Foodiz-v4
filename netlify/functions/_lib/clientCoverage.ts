import { adminSupabase } from "./auth.js";
import { calculateStraightLineDistanceMeters } from "./routingProvider.js";

type RestaurantRow = {
  id: string;
  name: string;
  cuisine_type: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  cover_image: string | null;
  latitude: number | null;
  longitude: number | null;
  service_area?: {
    status?: string | null;
    delivery_radius_km?: number | null;
  } | {
    status?: string | null;
    delivery_radius_km?: number | null;
  }[] | null;
};

function relatedArea(restaurant: RestaurantRow) {
  return Array.isArray(restaurant.service_area)
    ? restaurant.service_area[0]
    : restaurant.service_area;
}

export async function loadClientCoverage(userId: string) {
  const [{ data: profile, error: profileError }, { data: restaurants, error: restaurantsError }] =
    await Promise.all([
      adminSupabase
        .from("profiles")
        .select("address,postal_code,city,latitude,longitude")
        .eq("id", userId)
        .maybeSingle(),
      adminSupabase
        .from("restaurants")
        .select("id,name,cuisine_type,city,address,postal_code,cover_image,latitude,longitude,service_area:service_areas!restaurants_service_area_id_fkey(status,delivery_radius_km)")
        .eq("is_active", true)
        .eq("status", "active")
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("name"),
    ]);

  if (profileError) throw profileError;
  if (restaurantsError) throw restaurantsError;

  const latitude = Number(profile?.latitude);
  const longitude = Number(profile?.longitude);
  const hasVerifiedAddress = Number.isFinite(latitude) && Number.isFinite(longitude);

  if (!hasVerifiedAddress) {
    return {
      profile,
      restaurants: [],
      coverage: {
        status: "address_required" as const,
        city: profile?.city || null,
        postalCode: profile?.postal_code || null,
        radiusKm: null,
      },
    };
  }

  const origin = { latitude, longitude };
  const nearbyRestaurants = ((restaurants || []) as RestaurantRow[])
    .map((restaurant) => {
      const area = relatedArea(restaurant);
      if (area && !["pilot", "open"].includes(area.status || "")) return null;
      const radiusKm = Number(area?.delivery_radius_km || 10);
      const distanceMeters = calculateStraightLineDistanceMeters(origin, {
        latitude: Number(restaurant.latitude),
        longitude: Number(restaurant.longitude),
      });
      if (distanceMeters > radiusKm * 1_000) return null;
      return {
        ...restaurant,
        service_area: undefined,
        distance_km: Math.round(distanceMeters / 100) / 10,
        delivery_radius_km: radiusKm,
      };
    })
    .filter(Boolean)
    .sort((left: any, right: any) => left.distance_km - right.distance_km);

  return {
    profile,
    restaurants: nearbyRestaurants,
    coverage: {
      status: nearbyRestaurants.length ? "available" as const : "coming_soon" as const,
      city: profile?.city || null,
      postalCode: profile?.postal_code || null,
      radiusKm: nearbyRestaurants[0]?.delivery_radius_km || 10,
    },
  };
}
