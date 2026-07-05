import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';

import { supabase } from '@/lib/supabase';

export const DELIVERY_LOCATION_TASK = 'foodiz-active-delivery-location';
const ACTIVE_ORDER_KEY = 'foodiz_active_delivery_order';

type LocationTaskData = {
  locations?: Location.LocationObject[];
};

async function stopTaskAndClearOrder() {
  await SecureStore.deleteItemAsync(ACTIVE_ORDER_KEY);
  if (await Location.hasStartedLocationUpdatesAsync(DELIVERY_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(DELIVERY_LOCATION_TASK);
  }
}

if (!TaskManager.isTaskDefined(DELIVERY_LOCATION_TASK)) {
  TaskManager.defineTask<LocationTaskData>(
    DELIVERY_LOCATION_TASK,
    async ({ data, error }) => {
      if (error || !data?.locations?.length) return;

      const orderId = await SecureStore.getItemAsync(ACTIVE_ORDER_KEY);
      if (!orderId) return;

      const latest = data.locations[data.locations.length - 1];
      const { data: auth } = await supabase.auth.getSession();
      const accessToken = auth.session?.access_token;
      const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
      if (!accessToken || !apiUrl) return;

      const response = await fetch(`${apiUrl}/api/courier-delivery-action`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          action: 'location',
          latitude: latest.coords.latitude,
          longitude: latest.coords.longitude,
          accuracyMeters: latest.coords.accuracy,
        }),
      }).catch(() => null);

      if (response?.status === 404 || response?.status === 409) {
        await stopTaskAndClearOrder();
      }
    },
  );
}

export async function isContinuousDeliveryTrackingEnabled() {
  return Location.hasStartedLocationUpdatesAsync(DELIVERY_LOCATION_TASK);
}

export async function startContinuousDeliveryTracking(orderId: string) {
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();
  if (!foreground.granted || !background.granted) {
    throw new Error(
      'Autorisez la localisation « Toujours » pour maintenir le suivi quand Weello passe en arrière-plan.',
    );
  }

  await SecureStore.setItemAsync(ACTIVE_ORDER_KEY, orderId);
  if (await Location.hasStartedLocationUpdatesAsync(DELIVERY_LOCATION_TASK)) {
    return;
  }

  await Location.startLocationUpdatesAsync(DELIVERY_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    activityType: Location.ActivityType.AutomotiveNavigation,
    distanceInterval: 20,
    timeInterval: 5000,
    deferredUpdatesDistance: 20,
    deferredUpdatesInterval: 5000,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Livraison Weello en cours',
      notificationBody:
        'Votre position est partagée avec le client pendant cette course.',
      notificationColor: '#D8A84F',
    },
  });
}

export async function stopContinuousDeliveryTracking() {
  await stopTaskAndClearOrder();
}
