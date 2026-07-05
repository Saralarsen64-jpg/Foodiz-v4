export type RoutingCoordinate = {
  latitude: number;
  longitude: number;
};

export type RouteGeometry = {
  type: "LineString";
  coordinates: number[][];
};

export type RouteResult = {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number | null;
  durationMinutes: number | null;
  geometry: RouteGeometry | null;
  provider: string;
  requestedProvider: string;
  isFallback: boolean;
  warning?: string;
};

export type GeocodedAddress = {
  label: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  confidence: number | null;
  provider: "openrouteservice";
};

export interface RoutingProvider {
  readonly name: string;
  calculateRoute(
    origin: RoutingCoordinate,
    destination: RoutingCoordinate,
  ): Promise<RouteResult>;
  calculateDistance(
    origin: RoutingCoordinate,
    destination: RoutingCoordinate,
  ): Promise<number>;
  estimateDeliveryTime(
    origin: RoutingCoordinate,
    destination: RoutingCoordinate,
  ): Promise<number | null>;
}

type FetchImplementation = typeof fetch;

const ROUTING_TIMEOUT_MS = 8_000;
const ROUTE_CACHE_TTL_MS = 5 * 60 * 1_000;
const routeCache = new Map<string, { expiresAt: number; route: RouteResult }>();

function assertCoordinate(coordinate: RoutingCoordinate, label: string) {
  if (
    !Number.isFinite(coordinate.latitude)
    || coordinate.latitude < -90
    || coordinate.latitude > 90
    || !Number.isFinite(coordinate.longitude)
    || coordinate.longitude < -180
    || coordinate.longitude > 180
  ) {
    throw new RoutingProviderError(
      "invalid_coordinates",
      `${label} coordinates are invalid`,
      "routing",
      false,
    );
  }
}

function cacheKey(
  provider: string,
  origin: RoutingCoordinate,
  destination: RoutingCoordinate,
) {
  return [
    provider,
    origin.latitude.toFixed(6),
    origin.longitude.toFixed(6),
    destination.latitude.toFixed(6),
    destination.longitude.toFixed(6),
  ].join(":");
}

function normalizedRoute(
  route: Omit<RouteResult, "distanceKm" | "durationMinutes">,
): RouteResult {
  const distanceMeters = Math.max(0, Math.round(route.distanceMeters));
  const durationSeconds =
    route.durationSeconds === null
      ? null
      : Math.max(1, Math.ceil(route.durationSeconds));
  return {
    ...route,
    distanceMeters,
    distanceKm: distanceMeters / 1_000,
    durationSeconds,
    durationMinutes:
      durationSeconds === null
        ? null
        : Math.max(1, Math.ceil(durationSeconds / 60)),
  };
}

async function fetchWithTimeout(
  fetchImplementation: FetchImplementation,
  input: string,
  init: RequestInit,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS);
  try {
    return await fetchImplementation(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export class RoutingProviderError extends Error {
  readonly code: string;
  readonly provider: string;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(
    code: string,
    message: string,
    provider: string,
    retryable: boolean,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "RoutingProviderError";
    this.code = code;
    this.provider = provider;
    this.retryable = retryable;
    this.cause = options?.cause;
  }
}

abstract class BaseRoutingProvider implements RoutingProvider {
  abstract readonly name: string;

  abstract calculateRoute(
    origin: RoutingCoordinate,
    destination: RoutingCoordinate,
  ): Promise<RouteResult>;

  async calculateDistance(
    origin: RoutingCoordinate,
    destination: RoutingCoordinate,
  ) {
    return (await this.calculateRoute(origin, destination)).distanceMeters;
  }

  async estimateDeliveryTime(
    origin: RoutingCoordinate,
    destination: RoutingCoordinate,
  ) {
    return (await this.calculateRoute(origin, destination)).durationSeconds;
  }
}

export class OpenRouteServiceProvider extends BaseRoutingProvider {
  readonly name = "openrouteservice";
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImplementation: FetchImplementation;

  constructor(
    apiKey = process.env.OPENROUTESERVICE_API_KEY || "",
    baseUrl = (
      process.env.OPENROUTESERVICE_BASE_URL
      || "https://api.openrouteservice.org"
    ).replace(/\/$/, ""),
    fetchImplementation: FetchImplementation = fetch,
  ) {
    super();
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.fetchImplementation = fetchImplementation;
  }

  async calculateRoute(
    origin: RoutingCoordinate,
    destination: RoutingCoordinate,
  ): Promise<RouteResult> {
    assertCoordinate(origin, "Origin");
    assertCoordinate(destination, "Destination");
    if (!this.apiKey) {
      throw new RoutingProviderError(
        "missing_api_key",
        "OPENROUTESERVICE_API_KEY is missing on the server",
        this.name,
        false,
      );
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(
        this.fetchImplementation,
        `${this.baseUrl}/v2/directions/driving-car/geojson`,
        {
          method: "POST",
          headers: {
            Authorization: this.apiKey,
            "Content-Type": "application/json",
            Accept: "application/json, application/geo+json",
          },
          body: JSON.stringify({
            coordinates: [
              [origin.longitude, origin.latitude],
              [destination.longitude, destination.latitude],
            ],
            instructions: false,
          }),
        },
      );
    } catch (error) {
      throw new RoutingProviderError(
        "request_failed",
        "OpenRouteService request failed",
        this.name,
        true,
        { cause: error },
      );
    }

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new RoutingProviderError(
        "upstream_error",
        `OpenRouteService returned HTTP ${response.status}`,
        this.name,
        retryable,
      );
    }

    const payload = await response.json() as any;
    const feature = payload?.features?.[0];
    const summary = feature?.properties?.summary;
    if (
      !Number.isFinite(summary?.distance)
      || summary.distance < 0
      || !Number.isFinite(summary?.duration)
      || summary.duration <= 0
    ) {
      throw new RoutingProviderError(
        "invalid_response",
        "OpenRouteService response does not contain a valid route summary",
        this.name,
        true,
      );
    }

    return normalizedRoute({
      distanceMeters: summary.distance,
      durationSeconds: summary.duration,
      geometry:
        feature?.geometry?.type === "LineString"
        && Array.isArray(feature.geometry.coordinates)
          ? feature.geometry
          : null,
      provider: this.name,
      requestedProvider: this.name,
      isFallback: false,
    });
  }

  async geocodeAddress(query: string): Promise<GeocodedAddress> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 8) {
      throw new RoutingProviderError(
        "invalid_address",
        "L'adresse est trop courte pour être vérifiée",
        this.name,
        false,
      );
    }
    if (!this.apiKey) {
      throw new RoutingProviderError(
        "missing_api_key",
        "OPENROUTESERVICE_API_KEY is missing on the server",
        this.name,
        false,
      );
    }

    const url = new URL(`${this.baseUrl}/geocode/search`);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("text", normalizedQuery);
    url.searchParams.set("boundary.country", "FR");
    url.searchParams.set("size", "5");

    let response: Response;
    try {
      response = await fetchWithTimeout(
        this.fetchImplementation,
        url.toString(),
        {
          method: "GET",
          headers: {
            Accept: "application/json, application/geo+json",
          },
        },
      );
    } catch (error) {
      throw new RoutingProviderError(
        "request_failed",
        "La vérification de l'adresse est temporairement indisponible",
        this.name,
        true,
        { cause: error },
      );
    }

    if (!response.ok) {
      throw new RoutingProviderError(
        "upstream_error",
        `OpenRouteService geocoding returned HTTP ${response.status}`,
        this.name,
        response.status === 429 || response.status >= 500,
      );
    }

    const payload = await response.json() as any;
    const feature = payload?.features?.find((candidate: any) => {
      const coordinates = candidate?.geometry?.coordinates;
      return (
        Array.isArray(coordinates)
        && coordinates.length >= 2
        && Number.isFinite(Number(coordinates[0]))
        && Number.isFinite(Number(coordinates[1]))
        && String(candidate?.properties?.country_a || "").toUpperCase() === "FRA"
      );
    });
    const properties = feature?.properties;
    const coordinates = feature?.geometry?.coordinates;
    if (!feature || !properties || !Array.isArray(coordinates)) {
      throw new RoutingProviderError(
        "address_not_found",
        "Cette adresse française n'a pas pu être localisée précisément",
        this.name,
        false,
      );
    }

    const latitude = Number(coordinates[1]);
    const longitude = Number(coordinates[0]);
    assertCoordinate({ latitude, longitude }, "Geocoded address");
    const postalCode = String(properties.postalcode || "").trim();
    const city = String(
      properties.locality
      || properties.localadmin
      || properties.county
      || properties.region
      || "",
    ).trim();
    const address = String(
      properties.street
      || properties.name
      || normalizedQuery,
    ).trim();

    if (!postalCode || !city) {
      throw new RoutingProviderError(
        "incomplete_address",
        "L'adresse trouvée ne contient pas de code postal et de ville fiables",
        this.name,
        false,
      );
    }

    return {
      label: String(properties.label || normalizedQuery).trim(),
      address,
      postalCode,
      city,
      country: String(properties.country || "France"),
      latitude,
      longitude,
      confidence: Number.isFinite(Number(properties.confidence))
        ? Number(properties.confidence)
        : null,
      provider: "openrouteservice",
    };
  }
}

export class SelfHostedOsrmProvider extends BaseRoutingProvider {
  readonly name = "osrm";
  private readonly baseUrl: string;
  private readonly fetchImplementation: FetchImplementation;

  constructor(
    baseUrl = (process.env.OSRM_BASE_URL || "").replace(/\/$/, ""),
    fetchImplementation: FetchImplementation = fetch,
  ) {
    super();
    this.baseUrl = baseUrl;
    this.fetchImplementation = fetchImplementation;
  }

  async calculateRoute(
    origin: RoutingCoordinate,
    destination: RoutingCoordinate,
  ): Promise<RouteResult> {
    assertCoordinate(origin, "Origin");
    assertCoordinate(destination, "Destination");
    if (!this.baseUrl) {
      throw new RoutingProviderError(
        "missing_base_url",
        "OSRM_BASE_URL is missing on the server",
        this.name,
        false,
      );
    }

    const coordinates =
      `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    let response: Response;
    try {
      response = await fetchWithTimeout(
        this.fetchImplementation,
        `${this.baseUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": "Weello/1.0 contact@weello.co",
          },
        },
      );
    } catch (error) {
      throw new RoutingProviderError(
        "request_failed",
        "Self-hosted OSRM request failed",
        this.name,
        true,
        { cause: error },
      );
    }

    if (!response.ok) {
      throw new RoutingProviderError(
        "upstream_error",
        `Self-hosted OSRM returned HTTP ${response.status}`,
        this.name,
        response.status === 429 || response.status >= 500,
      );
    }

    const payload = await response.json() as any;
    const route = payload?.routes?.[0];
    if (
      !Number.isFinite(route?.distance)
      || route.distance < 0
      || !Number.isFinite(route?.duration)
      || route.duration <= 0
    ) {
      throw new RoutingProviderError(
        "invalid_response",
        "Self-hosted OSRM response does not contain a valid route",
        this.name,
        true,
      );
    }

    return normalizedRoute({
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry:
        route?.geometry?.type === "LineString"
        && Array.isArray(route.geometry.coordinates)
          ? route.geometry
          : null,
      provider: this.name,
      requestedProvider: this.name,
      isFallback: false,
    });
  }
}

export function calculateStraightLineDistanceMeters(
  origin: RoutingCoordinate,
  destination: RoutingCoordinate,
) {
  assertCoordinate(origin, "Origin");
  assertCoordinate(destination, "Destination");

  const radiusMeters = 6_371_000;
  const latitudeA = origin.latitude * Math.PI / 180;
  const latitudeB = destination.latitude * Math.PI / 180;
  const latitudeDelta = (destination.latitude - origin.latitude) * Math.PI / 180;
  const longitudeDelta = (destination.longitude - origin.longitude) * Math.PI / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeA)
      * Math.cos(latitudeB)
      * Math.sin(longitudeDelta / 2) ** 2;
  return radiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function selectedProvider(): RoutingProvider {
  const providerName = (process.env.ROUTING_PROVIDER || "openrouteservice").toLowerCase();
  if (providerName === "openrouteservice") return new OpenRouteServiceProvider();
  if (providerName === "osrm") return new SelfHostedOsrmProvider();
  throw new RoutingProviderError(
    "unsupported_provider",
    `Unsupported ROUTING_PROVIDER: ${providerName}`,
    providerName,
    false,
  );
}

export async function calculateRouteWithFallback(
  provider: RoutingProvider,
  origin: RoutingCoordinate,
  destination: RoutingCoordinate,
): Promise<RouteResult> {
  const key = cacheKey(provider.name, origin, destination);
  const cached = routeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.route;

  try {
    const route = await provider.calculateRoute(origin, destination);
    routeCache.set(key, { route, expiresAt: Date.now() + ROUTE_CACHE_TTL_MS });
    return route;
  } catch (error) {
    const routingError = error instanceof RoutingProviderError
      ? error
      : new RoutingProviderError(
          "unexpected_error",
          "Unexpected routing provider error",
          provider.name,
          true,
          { cause: error },
        );
    console.error("[routing] Primary provider unavailable; using straight-line fallback", {
      provider: provider.name,
      code: routingError.code,
      message: routingError.message,
      retryable: routingError.retryable,
    });

    const distanceMeters = calculateStraightLineDistanceMeters(origin, destination);
    return normalizedRoute({
      distanceMeters,
      durationSeconds: null,
      geometry: null,
      provider: "haversine",
      requestedProvider: provider.name,
      isFallback: true,
      warning: `Primary routing unavailable (${routingError.code})`,
    });
  }
}

export async function calculateRoute(
  origin: RoutingCoordinate,
  destination: RoutingCoordinate,
) {
  return calculateRouteWithFallback(selectedProvider(), origin, destination);
}

// Distance is returned in meters.
export async function calculateDistance(
  origin: RoutingCoordinate,
  destination: RoutingCoordinate,
) {
  return (await calculateRoute(origin, destination)).distanceMeters;
}

// Delivery time is returned in seconds. It is null when only the temporary
// straight-line fallback is available.
export async function estimateDeliveryTime(
  origin: RoutingCoordinate,
  destination: RoutingCoordinate,
) {
  return (await calculateRoute(origin, destination)).durationSeconds;
}

export async function geocodeAddress(address: string) {
  return new OpenRouteServiceProvider().geocodeAddress(address);
}
