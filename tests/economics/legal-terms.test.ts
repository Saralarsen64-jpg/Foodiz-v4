import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const legalPages = readFileSync(
  new URL("../../src/pages/legal/LegalPages.tsx", import.meta.url),
  "utf8",
);

test("les CGV reprennent les trois tranches du moteur Weello", () => {
  assert.match(legalPages, /0,50 € à 3,50 €/);
  assert.match(legalPages, /\+ 1,50 € par article/);
  assert.match(legalPages, /3,51 € à 8,49 €/);
  assert.match(legalPages, /\+ 2,90 € par article/);
  assert.match(legalPages, /à partir de 8,50 €/);
  assert.match(legalPages, /\+ 4,10 € par article/);
});

test("les CGV reprennent les frais de service et de livraison codés", () => {
  assert.match(legalPages, /1 article" value="1,99 €/);
  assert.match(legalPages, /2 articles" value="1,49 €/);
  assert.match(legalPages, /3 articles" value="1,19 €/);
  assert.match(legalPages, /4 articles ou plus" value="0,99 €/);
  assert.match(legalPages, /3,50 € jusqu’à 5 kilomètres/);
  assert.match(legalPages, /0,60 € est ajouté par kilomètre commencé/);
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
