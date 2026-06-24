import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const vercelConfig = readFileSync(new URL("../../vercel.json", import.meta.url), "utf8");
const apiRouter = readFileSync(new URL("../../api/[...path].ts", import.meta.url), "utf8");
const checkoutApi = readFileSync(new URL("../../netlify/functions/create-checkout-session.ts", import.meta.url), "utf8");
const paymentIntentApi = readFileSync(new URL("../../netlify/functions/create-payment-intent.ts", import.meta.url), "utf8");
const stripeWebhookApi = readFileSync(new URL("../../netlify/functions/stripe-webhook.ts", import.meta.url), "utf8");

test("le web Foodiz envoie des headers de sécurité essentiels", () => {
  assert.match(vercelConfig, /Strict-Transport-Security/);
  assert.match(vercelConfig, /X-Content-Type-Options/);
  assert.match(vercelConfig, /X-Frame-Options/);
  assert.match(vercelConfig, /Referrer-Policy/);
  assert.match(vercelConfig, /Permissions-Policy/);
  assert.match(vercelConfig, /Content-Security-Policy/);
  assert.match(vercelConfig, /frame-ancestors 'none'/);
  assert.match(vercelConfig, /object-src 'none'/);
});

test("les routes API sont non indexables, non cachées et limitées en taille", () => {
  assert.match(apiRouter, /API_SECURITY_HEADERS/);
  assert.match(apiRouter, /Cache-Control/);
  assert.match(apiRouter, /X-Robots-Tag/);
  assert.match(apiRouter, /maxBodyBytesForRoute/);
  assert.match(apiRouter, /PAYLOAD_TOO_LARGE/);
  assert.match(apiRouter, /responseWithSecurityHeaders/);
});

test("les endpoints sensibles ne renvoient pas les messages techniques bruts au client", () => {
  assert.doesNotMatch(checkoutApi, /JSON\.stringify\(\{ error: error\.message \}\)/);
  assert.doesNotMatch(paymentIntentApi, /JSON\.stringify\(\{ error: error\.message \}\)/);
  assert.doesNotMatch(stripeWebhookApi, /JSON\.stringify\(\{ error: error\.message \}\)/);
});
