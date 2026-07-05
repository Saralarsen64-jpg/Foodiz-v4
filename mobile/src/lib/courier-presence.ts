import * as Location from 'expo-location';

import { weelloApi } from '@/lib/api';

export async function updateCourierPresence(online: boolean) {
  if (!online) {
    return weelloApi<{ online: boolean }>('courier-presence', {
      method: 'POST',
      body: JSON.stringify({ online: false }),
    });
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Autorisez la localisation précise pour recevoir des courses.');
  }
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
  });
  if (position.coords.accuracy === null || position.coords.accuracy > 200) {
    throw new Error('La précision GPS est insuffisante. Placez-vous à l’extérieur puis réessayez.');
  }

  return weelloApi<{ online: boolean }>('courier-presence', {
    method: 'POST',
    body: JSON.stringify({
      online: true,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: position.coords.accuracy,
    }),
  });
}
