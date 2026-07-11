import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../supabase/migrations/47_courier_insurance_referrals.sql", import.meta.url),
  "utf8",
);
const api = readFileSync(
  new URL("../../netlify/functions/courier-insurance-referral.ts", import.meta.url),
  "utf8",
);
const page = readFileSync(
  new URL("../../src/pages/courier/InsuranceReferral.tsx", import.meta.url),
  "utf8",
);

test("la demande de rappel exige un consentement explicite et audité", () => {
  assert.match(migration, /consent_partner_contact boolean NOT NULL CHECK \(consent_partner_contact IS TRUE\)/);
  assert.match(migration, /consented_at timestamptz NOT NULL/);
  assert.match(api, /body\.consentPartnerContact !== true/);
});

test("le livreur peut lire sa demande mais les mutations restent côté serveur", () => {
  assert.match(migration, /FOR SELECT/);
  assert.match(migration, /user_id = auth\.uid\(\)/);
  assert.doesNotMatch(migration, /FOR (INSERT|UPDATE|DELETE)\s+TO authenticated/);
  assert.match(migration, /server-only through service_role/);
});

test("l’interface limite Weello à la mise en relation", () => {
  assert.match(page, /Weello ne réalise ni devis, ni conseil en assurance/);
  assert.match(page, /libre de choisir votre assureur/);
  assert.match(page, /transmette mon nom et mon numéro de téléphone/);
  assert.doesNotMatch(page, /meilleure assurance|garanties recommandées|devis Weello/i);
});
