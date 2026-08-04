import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const registration = readFileSync(
  new URL("../../netlify/functions/professional-register.ts", import.meta.url),
  "utf8",
);
const documents = readFileSync(
  new URL("../../netlify/functions/professional-documents.ts", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../../supabase/migrations/46_open_professional_registration_and_city_activation.sql",
    import.meta.url,
  ),
  "utf8",
);
const signup = readFileSync(
  new URL("../../src/pages/auth/Signup.tsx", import.meta.url),
  "utf8",
);

test("les inscriptions partenaire et livreur utilisent le dossier professionnel détaillé", () => {
  assert.match(signup, /role === "partner" \|\| role === "courier"/);
  assert.match(signup, /registrationRole=\{role === "partner" \? "partenaire" : "livreur"\}/);
  assert.match(registration, /livreur: "courier"/);
  assert.match(registration, /partenaire: "partner"/);
});

test("le serveur exige un SIRET, un mot de passe robuste et le consentement CGU", () => {
  assert.match(registration, /\^\[0-9\]\{14\}\$/);
  assert.match(registration, /password\.length < 10/);
  assert.match(registration, /const cguAccepted = input\.cguAccepted === true/);
  assert.match(registration, /Vous devez accepter les CGU/);
});

test("un échec de géocodage ne bloque jamais le dépôt d’un dossier professionnel", () => {
  assert.match(registration, /let coordinates: \{ latitude: number; longitude: number \} \| null = null/);
  assert.match(registration, /if \(coordinates\) \{/);
  assert.match(registration, /latitude: coordinates\?\.latitude \?\? null/);
  assert.doesNotMatch(registration, /L’adresse professionnelle n’a pas pu être vérifiée/);
});

test("le compte Auth et le rôle sont créés côté serveur sans écrire de préinscription", () => {
  assert.match(registration, /auth\.admin\.createUser/);
  assert.match(registration, /email_confirm: true/);
  assert.match(registration, /role: authRole/);
  assert.doesNotMatch(registration, /\.from\("prelaunch_profiles"\)/);
  assert.doesNotMatch(registration, /\.from\("prelaunch_partner_details"\)/);
  assert.doesNotMatch(registration, /\.from\("prelaunch_driver_details"\)/);
});

test("les justificatifs professionnels utilisent uniquement les buckets privés existants", () => {
  assert.match(documents, /"partner-documents"/);
  assert.match(documents, /"courier-documents"/);
  assert.match(documents, /createSignedUploadUrl/);
  assert.match(documents, /verifyStoredDocument/);
  assert.match(documents, /verifyStoredCourierDocument/);
});

test("la ville reste en préparation jusqu’à validation d’un partenaire et d’un livreur", () => {
  assert.match(migration, /WHEN has_partner AND has_courier THEN 'pilot'/);
  assert.match(migration, /WHEN has_partner THEN 'preparing'/);
  assert.match(migration, /ELSE 'recruiting'/);
  assert.match(migration, /application\.compliance_status = 'approved'/);
  assert.match(migration, /application\.document_review_status = 'approved'/);
});

test("aucun chiffre commercial fictif n’est inséré par la migration", () => {
  assert.doesNotMatch(migration, /INSERT INTO public\.(orders|profiles|restaurants|products)/);
});
