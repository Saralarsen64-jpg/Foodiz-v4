import { supabase } from "./supabase";

function currentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("La géolocalisation n'est pas disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 15_000,
    });
  });
}

export async function updateCourierPresence(online: boolean) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Session expirée.");

  let location: GeolocationPosition | null = null;
  if (online) {
    try {
      location = await currentPosition();
    } catch {
      throw new Error("Autorisez une localisation précise pour recevoir des courses.");
    }
  }

  const response = await fetch("/api/courier-presence", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      online,
      latitude: location?.coords.latitude,
      longitude: location?.coords.longitude,
      accuracyMeters: location?.coords.accuracy,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Position livreur indisponible.");
  }
  return payload;
}
