export const DELIVERY_LOCATION_TASK = 'weello-web-location-preview-disabled';

export async function isContinuousDeliveryTrackingEnabled() {
  return false;
}

export async function startContinuousDeliveryTracking() {
  throw new Error(
    'Le suivi GPS en arrière-plan doit être testé dans l’application iOS ou Android.',
  );
}

export async function stopContinuousDeliveryTracking() {
  return undefined;
}
