import assert from "node:assert/strict";
import test from "node:test";

import {
  effectivePartnerPriceCents,
  productOfferIsActive,
} from "../../src/lib/productOffers.ts";

const now = new Date("2026-07-02T12:00:00.000Z").getTime();

test("uses the partner-funded promotional price during its active window", () => {
  const product = {
    partner_price_cents: 1200,
    promotion_partner_price_cents: 900,
    promotion_starts_at: "2026-07-01T00:00:00.000Z",
    promotion_ends_at: "2026-07-03T00:00:00.000Z",
  };
  assert.equal(productOfferIsActive(product, now), true);
  assert.equal(effectivePartnerPriceCents(product, now), 900);
});

test("falls back to the regular price before or after the offer", () => {
  const product = {
    partner_price_cents: 1200,
    promotion_partner_price_cents: 900,
    promotion_starts_at: "2026-07-03T00:00:00.000Z",
    promotion_ends_at: "2026-07-04T00:00:00.000Z",
  };
  assert.equal(productOfferIsActive(product, now), false);
  assert.equal(effectivePartnerPriceCents(product, now), 1200);
});

test("rejects a promotional price that is not below the regular price", () => {
  const product = {
    partner_price_cents: 1200,
    promotion_partner_price_cents: 1200,
  };
  assert.equal(productOfferIsActive(product, now), false);
  assert.equal(effectivePartnerPriceCents(product, now), 1200);
});
