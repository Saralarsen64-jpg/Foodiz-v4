export const LEGACY_TO_NEW_KEYS: Array<{legacy: string; current: string; storage: 'local'|'session'}> = [
  { legacy: 'foodiz_client_cart_v2', current: 'weello_client_cart_v2', storage: 'local' },
  { legacy: 'foodiz_partner_subscriptions_v1', current: 'weello_partner_subscriptions_v1', storage: 'local' },
  { legacy: 'foodiz_partner_campaigns_v1', current: 'weello_partner_campaigns_v1', storage: 'local' },
  { legacy: 'foodiz_client_notifications_v1', current: 'weello_client_notifications_v1', storage: 'local' },
  { legacy: 'foodiz_locked_advantage_v1', current: 'weello_locked_advantage_v1', storage: 'local' },
  { legacy: 'foodiz_advantages_set_v1', current: 'weello_advantages_set_v1', storage: 'local' },
  { legacy: 'foodiz_cart_selected_advantage_v1', current: 'weello_cart_selected_advantage_v1', storage: 'local' },
  { legacy: 'foodiz_admin_access_v1', current: 'weello_admin_access_v1', storage: 'local' },
  { legacy: 'foodiz_support_tickets_v1', current: 'weello_support_tickets_v1', storage: 'local' },
  { legacy: 'foodiz_admin_login_throttle_v1', current: 'weello_admin_login_throttle_v1', storage: 'local' },
  { legacy: 'foodiz_partner_profile_r1_v1', current: 'weello_partner_profile_r1_v1', storage: 'local' },
  { legacy: 'foodiz_partner_applications_v1', current: 'weello_partner_applications_v1', storage: 'local' },
  { legacy: 'foodiz_courier_applications_v1', current: 'weello_courier_applications_v1', storage: 'local' },
  { legacy: 'foodiz_pending_checkout_order', current: 'weello_pending_checkout_order', storage: 'session' },
  { legacy: 'foodiz_partner_upload_token', current: 'weello_partner_upload_token', storage: 'session' },
  { legacy: 'foodiz_courier_upload_token', current: 'weello_courier_upload_token', storage: 'session' },
  { legacy: 'foodiz_partner_upload_token', current: 'weello_partner_upload_token', storage: 'session' },
];

export function migrateLegacyStorage(): void {
  try {
    for (const mapping of LEGACY_TO_NEW_KEYS) {
      const store = mapping.storage === 'local' ? window.localStorage : window.sessionStorage;
      const legacyVal = store.getItem(mapping.legacy);
      if (legacyVal != null && store.getItem(mapping.current) == null) {
        store.setItem(mapping.current, legacyVal);
      }
      // remove legacy key if present
      if (legacyVal != null) store.removeItem(mapping.legacy);
    }
  } catch (e) {
    // swallow errors to avoid blocking app startup; log for observability if available
    // eslint-disable-next-line no-console
    console.warn('storage migration failed', e);
  }
}
