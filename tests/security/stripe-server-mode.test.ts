import assert from "node:assert/strict";
import test from "node:test";

import { getStripeServerMode } from "../../netlify/functions/_lib/stripe-server.ts";

test("Stripe serveur accepte uniquement le mode Test par défaut", () => {
  assert.equal(getStripeServerMode("sk_test_example", undefined), "test");
  assert.equal(getStripeServerMode(undefined, undefined), "missing");
  assert.equal(getStripeServerMode("not_a_stripe_key", undefined), "invalid");
});

test("Stripe Live reste bloqué sans autorisation explicite", () => {
  assert.equal(getStripeServerMode("sk_live_example", undefined), "live_blocked");
  assert.equal(getStripeServerMode("sk_live_example", "false"), "live_blocked");
  assert.equal(getStripeServerMode("sk_live_example", "true"), "live_allowed");
});
