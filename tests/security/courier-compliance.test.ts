import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const documentsMigration = readFileSync(
  new URL("../../supabase/migrations/34_courier_documents_and_review.sql", import.meta.url),
  "utf8",
);
const delayMigration = readFileSync(
  new URL("../../supabase/migrations/35_courier_route_eta_and_delay_penalties.sql", import.meta.url),
  "utf8",
);
const documentApi = readFileSync(
  new URL("../../netlify/functions/prelaunch-courier-documents.ts", import.meta.url),
  "utf8",
);
const documentVerification = readFileSync(
  new URL("../../netlify/functions/_lib/courier-documents.ts", import.meta.url),
  "utf8",
);
const adminApi = readFileSync(
  new URL("../../netlify/functions/admin-courier-applications.ts", import.meta.url),
  "utf8",
);
const deliveryApi = readFileSync(
  new URL("../../netlify/functions/courier-delivery-action.ts", import.meta.url),
  "utf8",
);
const launchApi = readFileSync(
  new URL("../../netlify/functions/send-launch-access.ts", import.meta.url),
  "utf8",
);

test("les justificatifs livreur sont conservés dans un bucket privé limité à 8 Mo", () => {
  assert.match(documentsMigration, /'courier-documents'[\s\S]*false,[\s\S]*8388608/);
  assert.match(documentsMigration, /allowed_mime_types/);
  assert.doesNotMatch(documentsMigration, /ON storage\.objects/);
  assert.match(documentVerification, /0xff, 0xd8, 0xff/);
  assert.match(documentVerification, /0x25, 0x50, 0x44, 0x46, 0x2d/);
});

test("les trois types de document obligatoires sont verrouillés en base", () => {
  assert.match(documentsMigration, /'identity_front', 'identity_back', 'activity_proof'/);
  assert.match(documentsMigration, /UNIQUE \(user_id, document_type\)/);
  assert.match(documentApi, /documentCount !== 3/);
});

test("un livreur ne peut jamais valider lui-même ses documents", () => {
  assert.match(documentsMigration, /No INSERT\/UPDATE\/DELETE policy is intentionally granted/);
  assert.match(documentsMigration, /NEW\.document_review_status := OLD\.document_review_status/);
  assert.match(documentsMigration, /GRANT EXECUTE ON FUNCTION public\.review_courier_application[\s\S]*TO service_role/);
  assert.match(adminApi, /userRole\(user\.id\) !== "admin"/);
});

test("la validation exige la concordance identité, activité et SIRET", () => {
  assert.match(documentsMigration, /NEW\.identity_name_confirmed IS NOT TRUE/);
  assert.match(documentsMigration, /NEW\.business_identity_confirmed IS NOT TRUE/);
  assert.match(documentsMigration, /NEW\.siret !~ '\^\[0-9\]\{14\}\$'/);
  assert.match(documentsMigration, /approved_document_count <> 3/);
});

test("aucun accès de lancement n'est envoyé à un livreur non validé", () => {
  assert.match(launchApi, /profile\.role === "livreur"/);
  assert.match(launchApi, /courierApplication\?\.status !== "validated"/);
  assert.match(launchApi, /document_review_status !== "approved"/);
});

test("la récupération utilise une position GPS précise et proche du partenaire", () => {
  assert.match(deliveryApi, /accuracyMeters > 200/);
  assert.match(deliveryApi, /calculateStraightLineDistanceMeters\(/);
  assert.match(deliveryApi, /await calculateRoute\(pickupCoordinates, clientCoordinates\)/);
});

test("les timestamps et l'ETA de départ sont écrits côté serveur", () => {
  assert.match(deliveryApi, /const pickupAt = new Date\(\)/);
  assert.match(deliveryApi, /target_expected_arrival_at: expectedArrivalAt/);
  assert.match(delayMigration, /pickup_expected_arrival_at = target_expected_arrival_at/);
  assert.match(delayMigration, /eta_verified_at = CASE WHEN target_expected_arrival_at IS NOT NULL THEN pickup_time ELSE NULL END/);
  assert.match(delayMigration, /DROP POLICY IF EXISTS "orders_update_assigned_courier_production"/);
});

test("aucune pénalité n'est appliquée sans ETA vérifiée", () => {
  assert.match(delayMigration, /tracking_row\.eta_verified_at IS NULL/);
  assert.match(delayMigration, /'not_applicable', 'No verified route ETA was available at pickup'/);
  assert.match(delayMigration, /'reason', 'NO_VERIFIED_ETA'/);
});

test("les trois seuils de retard Weello sont exacts et non cumulatifs", () => {
  assert.match(delayMigration, /delay_seconds_value >= 600 AND delay_seconds_value <= 900[\s\S]*penalty_cents_value := 50[\s\S]*reward_points_value := 50/);
  assert.match(delayMigration, /delay_seconds_value > 900 AND delay_seconds_value <= 1200[\s\S]*penalty_cents_value := 100[\s\S]*reward_points_value := 100/);
  assert.match(delayMigration, /delay_seconds_value > 1200[\s\S]*penalty_cents_value := 200[\s\S]*reward_points_value := 200[\s\S]*priority_delta := -10/);
});

test("la pénalité et les points client sont idempotents et déduits des règlements", () => {
  assert.match(delayMigration, /order_id uuid NOT NULL UNIQUE REFERENCES public\.orders/);
  assert.match(delayMigration, /ON CONFLICT \(order_id\) DO NOTHING/);
  assert.match(delayMigration, /dispatch_priority_score = greatest\(0, dispatch_priority_score \+ priority_delta\)/);
  assert.match(delayMigration, /courier_prime_cents - ledger\.courier_penalty_cents/);
});
