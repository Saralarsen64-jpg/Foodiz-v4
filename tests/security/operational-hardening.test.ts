import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const locationMigration = readFileSync(
  new URL("../../supabase/migrations/37_operational_access_and_location_hardening.sql", import.meta.url),
  "utf8",
);
const courierMigration = readFileSync(
  new URL("../../supabase/migrations/38_courier_presence_and_proximity_dispatch.sql", import.meta.url),
  "utf8",
);
const adminMigration = readFileSync(
  new URL("../../supabase/migrations/40_admin_user_and_penalty_controls.sql", import.meta.url),
  "utf8",
);
const addressApi = readFileSync(
  new URL("../../netlify/functions/address-management.ts", import.meta.url),
  "utf8",
);
const dispatchApi = readFileSync(
  new URL("../../netlify/functions/courier-deliveries.ts", import.meta.url),
  "utf8",
);
const checkout = readFileSync(
  new URL("../../src/pages/client/Checkout.tsx", import.meta.url),
  "utf8",
);
const orderLibrary = readFileSync(
  new URL("../../src/lib/orders.ts", import.meta.url),
  "utf8",
);

test("les coordonnées client et partenaire passent par un géocodage serveur", () => {
  assert.match(addressApi, /geocodeAddress\(/);
  assert.match(addressApi, /save_client_delivery_address_server/);
  assert.match(addressApi, /save_partner_establishment_server/);
  assert.match(locationMigration, /NEW\.latitude := OLD\.latitude/);
  assert.match(locationMigration, /NEW\.longitude := OLD\.longitude/);
});

test("une seule adresse client peut être active et elle synchronise le profil", () => {
  assert.match(locationMigration, /idx_client_addresses_one_default/);
  assert.match(locationMigration, /WHERE is_default = true/);
  assert.match(locationMigration, /UPDATE public\.profiles[\s\S]*latitude = target_latitude[\s\S]*longitude = target_longitude/);
});

test("un partenaire ne peut plus s'activer ou modifier ses coordonnées directement", () => {
  assert.match(locationMigration, /DROP POLICY IF EXISTS "restaurants_insert_owner_mvp"/);
  assert.match(locationMigration, /NEW\.status := OLD\.status/);
  assert.match(locationMigration, /NEW\.is_active := OLD\.is_active/);
  assert.match(locationMigration, /Verified restaurant coordinates are required before activation/);
});

test("les statuts de commande ne sont plus modifiables directement par le frontend", () => {
  assert.match(locationMigration, /DROP POLICY IF EXISTS "orders_update_involved_mvp"/);
  assert.doesNotMatch(orderLibrary, /\.from\('orders'\)[\s\S]*\.update\(/);
});

test("le dispatch exige une position récente et classe les retraits par proximité", () => {
  assert.match(courierMigration, /courier_location_updated_at/);
  assert.match(courierMigration, /target_accuracy_meters > 200/);
  assert.match(dispatchApi, /locationAge > 5 \* 60 \* 1000/);
  assert.match(dispatchApi, /pickupAirDistanceMeters/);
  assert.match(dispatchApi, /\.sort\(\(a: any, b: any\) => a\.pickupAirDistanceMeters - b\.pickupAirDistanceMeters\)/);
  assert.match(dispatchApi, /pickup_time_mins/);
});

test("le panier web est conservé pendant un abandon Stripe", () => {
  assert.doesNotMatch(checkout, /clearCart\(\);\s*window\.location\.assign/);
  assert.match(checkout, /weello_pending_checkout_order/);
  assert.match(checkout, /payment"\) !== "cancelled"/);
});

test("la suspension client et l'annulation de pénalité sont auditées", () => {
  assert.match(adminMigration, /admin_set_client_status/);
  assert.match(adminMigration, /client_status_changed/);
  assert.match(adminMigration, /admin_waive_courier_delay_penalty/);
  assert.match(adminMigration, /courier_penalty_waived/);
  assert.match(adminMigration, /dispatch_priority_score = least/);
});
