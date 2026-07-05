import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  OpenRouteServiceProvider,
  calculateRouteWithFallback,
  calculateStraightLineDistanceMeters,
  type RoutingProvider,
} from "../../netlify/functions/_lib/routingProvider.ts";

const origin = { latitude: 48.8566, longitude: 2.3522 };
const destination = { latitude: 48.8584, longitude: 2.2945 };

test("OpenRouteService est appelé côté serveur avec la clé dans l'en-tête", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  const fetchMock = (async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = String(input);
    requestedInit = init;
    return new Response(JSON.stringify({
      features: [{
        properties: { summary: { distance: 6_250.4, duration: 1_125.2 } },
        geometry: {
          type: "LineString",
          coordinates: [[2.3522, 48.8566], [2.2945, 48.8584]],
        },
      }],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const provider = new OpenRouteServiceProvider(
    "ors-test-secret",
    "https://api.openrouteservice.org",
    fetchMock,
  );
  const route = await provider.calculateRoute(origin, destination);

  assert.equal(
    requestedUrl,
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
  );
  assert.equal(requestedInit?.method, "POST");
  assert.equal(
    (requestedInit?.headers as Record<string, string>).Authorization,
    "ors-test-secret",
  );
  assert.doesNotMatch(requestedUrl, /ors-test-secret/);
  assert.deepEqual(
    JSON.parse(String(requestedInit?.body)).coordinates,
    [[2.3522, 48.8566], [2.2945, 48.8584]],
  );
  assert.equal(route.distanceMeters, 6_250);
  assert.equal(route.durationSeconds, 1_126);
  assert.equal(route.durationMinutes, 19);
  assert.equal(route.provider, "openrouteservice");
  assert.equal(route.isFallback, false);
});

test("une panne fournisseur utilise uniquement la distance à vol d'oiseau", async () => {
  const unavailableProvider: RoutingProvider = {
    name: "openrouteservice",
    calculateRoute: async () => {
      throw new Error("upstream unavailable");
    },
    calculateDistance: async () => {
      throw new Error("upstream unavailable");
    },
    estimateDeliveryTime: async () => {
      throw new Error("upstream unavailable");
    },
  };

  const route = await calculateRouteWithFallback(
    unavailableProvider,
    origin,
    destination,
  );
  const expectedDistance = calculateStraightLineDistanceMeters(origin, destination);

  assert.equal(route.provider, "haversine");
  assert.equal(route.requestedProvider, "openrouteservice");
  assert.equal(route.isFallback, true);
  assert.equal(route.durationSeconds, null);
  assert.equal(route.durationMinutes, null);
  assert.ok(Math.abs(route.distanceMeters - Math.round(expectedDistance)) <= 1);
});

test("le géocodage d'adresse française reste entièrement côté serveur", async () => {
  let requestedUrl = "";
  const fetchMock = (async (input: string | URL | Request) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({
      features: [{
        properties: {
          label: "5 Avenue Anatole France, 75007 Paris, France",
          name: "5 Avenue Anatole France",
          postalcode: "75007",
          locality: "Paris",
          country: "France",
          country_a: "FRA",
          confidence: 0.98,
        },
        geometry: {
          type: "Point",
          coordinates: [2.2945, 48.8584],
        },
      }],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  const provider = new OpenRouteServiceProvider(
    "ors-geocode-secret",
    "https://api.openrouteservice.org",
    fetchMock,
  );
  const result = await provider.geocodeAddress(
    "5 Avenue Anatole France, 75007 Paris, France",
  );

  assert.match(requestedUrl, /\/geocode\/search/);
  assert.match(requestedUrl, /boundary\.country=FR/);
  assert.equal(result.postalCode, "75007");
  assert.equal(result.city, "Paris");
  assert.equal(result.latitude, 48.8584);
  assert.equal(result.longitude, 2.2945);
  assert.equal(result.provider, "openrouteservice");
});

test("checkout, dispatch et ETA utilisent tous le provider serveur partagé", () => {
  const checkout = readFileSync(
    new URL("../../netlify/functions/create-checkout-session.ts", import.meta.url),
    "utf8",
  );
  const dispatch = readFileSync(
    new URL("../../netlify/functions/courier-deliveries.ts", import.meta.url),
    "utf8",
  );
  const deliveryAction = readFileSync(
    new URL("../../netlify/functions/courier-delivery-action.ts", import.meta.url),
    "utf8",
  );

  for (const source of [checkout, dispatch, deliveryAction]) {
    assert.match(source, /_lib\/routingProvider\.js/);
  }
  assert.match(checkout, /delivery_route_distance_meters: route\.distanceMeters/);
  assert.match(checkout, /calculateWeelloOrder\(calculationItems, distanceKm\)/);
  assert.match(dispatch, /await calculateRoute/);
  assert.match(deliveryAction, /await calculateRoute\(pickupCoordinates, clientCoordinates\)/);
  assert.doesNotMatch(deliveryAction, /router\.project-osrm\.org/);
  assert.doesNotMatch(deliveryAction, /ROUTING_API_URL/);
});

test("la clé OpenRouteService n'est déclarée dans aucun environnement client", () => {
  const clientRoots = [
    new URL("../../src", import.meta.url),
    new URL("../../mobile/src", import.meta.url),
  ];
  const files: string[] = [];
  const collectFiles = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = `${directory}/${entry}`;
      if (statSync(path).isDirectory()) collectFiles(path);
      else if (/\.(ts|tsx|js|jsx)$/.test(entry)) files.push(path);
    }
  };
  for (const root of clientRoots) collectFiles(fileURLToPath(root));

  for (const path of files) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /OPENROUTESERVICE_API_KEY/, path);
    assert.doesNotMatch(source, /api\.openrouteservice\.org/, path);
  }

  const mobileEnvironmentExample = readFileSync(
    new URL("../../mobile/.env.example", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(mobileEnvironmentExample, /OPENROUTESERVICE/);

  const environmentExample = readFileSync(
    new URL("../../.env.example", import.meta.url),
    "utf8",
  );
  assert.match(environmentExample, /^OPENROUTESERVICE_API_KEY=$/m);
  assert.doesNotMatch(environmentExample, /VITE_OPENROUTESERVICE/);
  assert.doesNotMatch(environmentExample, /EXPO_PUBLIC_OPENROUTESERVICE/);
});

test("la migration conserve la distance, la durée et le provider calculés côté serveur", () => {
  const migration = readFileSync(
    new URL("../../supabase/migrations/36_server_routing_snapshots.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /delivery_route_distance_meters integer/);
  assert.match(migration, /delivery_route_duration_seconds integer/);
  assert.match(migration, /delivery_route_provider text/);
  assert.match(migration, /delivery_route_is_fallback boolean NOT NULL DEFAULT false/);
});
