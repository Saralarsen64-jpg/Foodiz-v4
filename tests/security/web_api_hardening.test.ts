import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const vercelConfig = readFileSync(new URL("../../vercel.json", import.meta.url), "utf8");
const apiRouter = readFileSync(new URL("../../api/[...path].ts", import.meta.url), "utf8");
const checkoutApi = readFileSync(new URL("../../netlify/functions/create-checkout-session.ts", import.meta.url), "utf8");
const financialDocumentApi = readFileSync(new URL("../../netlify/functions/financial-document.ts", import.meta.url), "utf8");
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

test("le routeur API refuse les origines inconnues sans bloquer l'app mobile", () => {
  assert.match(apiRouter, /DEFAULT_TRUSTED_ORIGINS/);
  assert.match(apiRouter, /FOODIZ_ALLOWED_ORIGINS/);
  assert.match(apiRouter, /requestHasTrustedOrigin/);
  assert.match(apiRouter, /if \(!origin\) return true/);
  assert.match(apiRouter, /ORIGIN_FORBIDDEN/);
  assert.match(apiRouter, /https:\/\/www\.foodiz\.co/);
});

test("le routeur API limite les rafales d'appels sur les routes sensibles", () => {
  assert.match(apiRouter, /apiRateLimits/);
  assert.match(apiRouter, /apiRateLimitBuckets/);
  assert.match(apiRouter, /consumeApiRateLimit/);
  assert.match(apiRouter, /RATE_LIMITED/);
  assert.match(apiRouter, /Retry-After/);
  assert.match(apiRouter, /"prelaunch\/register": \{ limit: 12, windowMs: 10 \* 60 \* 1000 \}/);
  assert.match(apiRouter, /"verify-delivery-code": \{ limit: 12, windowMs: 5 \* 60 \* 1000 \}/);
  assert.match(apiRouter, /"admin\/prelaunch\/send-launch-access": \{ limit: 20, windowMs: 10 \* 60 \* 1000 \}/);
});

test("le routeur API applique un pare-feu serveur par rôle", () => {
  assert.match(apiRouter, /routeRoleAllowlist/);
  assert.match(apiRouter, /routeAllowsRole/);
  assert.match(apiRouter, /ROLE_FORBIDDEN/);
  assert.match(apiRouter, /"admin\/prelaunch": \["admin"\]/);
  assert.match(apiRouter, /"courier-delivery-action": \["courier"\]/);
  assert.match(apiRouter, /"partner-order-action": \["partner"\]/);
  assert.match(apiRouter, /"create-checkout-session": \["client"\]/);
  assert.match(apiRouter, /"address-management": \["client", "partner"\]/);
});

test("les endpoints sensibles ne renvoient pas les messages techniques bruts au client", () => {
  assert.doesNotMatch(checkoutApi, /JSON\.stringify\(\{ error: error\.message \}\)/);
  assert.doesNotMatch(paymentIntentApi, /JSON\.stringify\(\{ error: error\.message \}\)/);
  assert.doesNotMatch(stripeWebhookApi, /JSON\.stringify\(\{ error: error\.message \}\)/);
  assert.doesNotMatch(financialDocumentApi, /error\?\.(message|stack)|error\.message/);
  assert.match(financialDocumentApi, /Le document financier n'a pas pu être traité/);
});
