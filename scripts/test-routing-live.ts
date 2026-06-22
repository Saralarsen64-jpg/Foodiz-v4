import { OpenRouteServiceProvider } from "../netlify/functions/_lib/routingProvider.ts";

const apiKey = process.env.OPENROUTESERVICE_API_KEY;
if (!apiKey) {
  console.error(
    "OPENROUTESERVICE_API_KEY est absente. Ajoutez-la au terminal ou au fichier serveur local avant ce test.",
  );
  process.exit(1);
}

const provider = new OpenRouteServiceProvider(apiKey);
const hotelDeVilleParis = {
  label: "Hôtel de Ville, Place de l'Hôtel de Ville, 75004 Paris",
  latitude: 48.8566,
  longitude: 2.3522,
};
const tourEiffel = {
  label: "Tour Eiffel, 5 Avenue Anatole France, 75007 Paris",
  latitude: 48.8584,
  longitude: 2.2945,
};

const route = await provider.calculateRoute(hotelDeVilleParis, tourEiffel);

console.log(JSON.stringify({
  origin: hotelDeVilleParis.label,
  destination: tourEiffel.label,
  provider: route.provider,
  distanceKm: Number(route.distanceKm.toFixed(2)),
  durationMinutes: route.durationMinutes,
  geometryAvailable: Boolean(route.geometry),
}, null, 2));

if (
  route.provider !== "openrouteservice"
  || route.distanceKm <= 0
  || !route.durationMinutes
  || !route.geometry
) {
  throw new Error("Le test réel OpenRouteService n'a pas retourné un itinéraire complet.");
}
