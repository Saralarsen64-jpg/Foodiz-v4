import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const legalPages = readFileSync(
  new URL("../../src/pages/legal/LegalPages.tsx", import.meta.url),
  "utf8",
);

test("les CGV ne publient aucune tranche du modèle économique interne", () => {
  assert.doesNotMatch(legalPages, /0,50 € à 3,50 €/);
  assert.doesNotMatch(legalPages, /3,51 € à 8,49 €/);
  assert.doesNotMatch(legalPages, /à partir de 8,50 €/);
  assert.doesNotMatch(legalPages, /supplément Weello correspondant à sa tranche/);
  assert.doesNotMatch(legalPages, /par article/);
});

test("les CGV gardent confidentiels les barèmes de service, livraison et compensation", () => {
  assert.doesNotMatch(legalPages, /1,99 €|1,49 €|1,19 €|0,99 €/);
  assert.doesNotMatch(legalPages, /3,50 € jusqu’à 5 kilomètres/);
  assert.doesNotMatch(legalPages, /0,60 € est ajouté par kilomètre commencé/);
  assert.doesNotMatch(legalPages, /50 points|100 points|200 points/);
  assert.match(legalPages, /détaillé dans le récapitulatif avant que le client confirme/);
});

test("les documents Weello ne présentent plus la préinscription comme parcours public", () => {
  assert.doesNotMatch(legalPages, /peuvent se préinscrire/i);
  assert.match(legalPages, /demander à être informé du déploiement de Weello/);
});

test("la politique distingue paiement, géolocalisation et marketing", () => {
  assert.match(legalPages, /ne stocke pas le numéro complet ni le cryptogramme/i);
  assert.match(legalPages, /La position précise du livreur/);
  assert.match(legalPages, /Consentement lorsque requis/);
  assert.match(legalPages, /contact@weello\.co/);
});
