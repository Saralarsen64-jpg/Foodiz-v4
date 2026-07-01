import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  calculateDeliveryFee,
  calculateFoodizOrder,
  calculateItemSplit,
  calculateServiceFee,
} from "../../src/lib/engines/foodizEconomicEngine.ts";

const checkoutSource = readFileSync(
  new URL("../../netlify/functions/create-checkout-session.ts", import.meta.url),
  "utf8",
);
const phase2Migration = readFileSync(
  new URL("../../supabase/migrations/29_phase2_official_economic_model.sql", import.meta.url),
  "utf8",
);

test("tranche 1 applique exactement le supplément et la répartition officiels", () => {
  const split = calculateItemSplit(350);
  assert.deepEqual(split, {
    partnerPriceCents: 350,
    clientPriceCents: 500,
    supplementCents: 150,
    tier: 1,
    foodizRevenueCents: 50,
    courierDirectCents: 50,
    loyaltyFundCents: 10,
    referralFundCents: 10,
    courierPrimeCents: 10,
    internalFeesCents: 20,
    systemReserveCents: 0,
  });
});

test("tranche 2 commence à 3,51 EUR et totalise 2,90 EUR", () => {
  const split = calculateItemSplit(351);
  assert.equal(split.tier, 2);
  assert.equal(split.supplementCents, 290);
  assert.equal(split.clientPriceCents, 641);
  assert.equal(
    split.foodizRevenueCents +
      split.courierDirectCents +
      split.loyaltyFundCents +
      split.referralFundCents +
      split.courierPrimeCents +
      split.internalFeesCents,
    290,
  );
});

test("tranche 3 commence à 8,50 EUR et totalise 4,10 EUR", () => {
  const split = calculateItemSplit(850);
  assert.equal(split.tier, 3);
  assert.equal(split.supplementCents, 410);
  assert.equal(split.clientPriceCents, 1260);
  assert.equal(
    split.foodizRevenueCents +
      split.courierDirectCents +
      split.loyaltyFundCents +
      split.referralFundCents +
      split.courierPrimeCents +
      split.internalFeesCents,
    410,
  );
});

test("les bornes des trois tranches sont strictement respectées", () => {
  assert.equal(calculateItemSplit(50).tier, 1);
  assert.equal(calculateItemSplit(350).tier, 1);
  assert.equal(calculateItemSplit(351).tier, 2);
  assert.equal(calculateItemSplit(849).tier, 2);
  assert.equal(calculateItemSplit(850).tier, 3);
});

test("les frais de service dépendent du nombre réel d'articles", () => {
  assert.equal(calculateServiceFee(1), 199);
  assert.equal(calculateServiceFee(2), 149);
  assert.equal(calculateServiceFee(3), 119);
  assert.equal(calculateServiceFee(4), 99);
  assert.equal(calculateServiceFee(20), 99);
});

test("la livraison suit la règle 5 km puis 0,60 EUR par km commencé", () => {
  assert.equal(calculateDeliveryFee(0), 350);
  assert.equal(calculateDeliveryFee(5), 350);
  assert.equal(calculateDeliveryFee(5.01), 410);
  assert.equal(calculateDeliveryFee(6), 410);
  assert.equal(calculateDeliveryFee(7), 470);
  assert.equal(calculateDeliveryFee(10), 650);
});

test("aucune distance absente ou invalide n'est acceptée", () => {
  assert.throws(() => calculateDeliveryFee(Number.NaN));
  assert.throws(() => calculateDeliveryFee(-1));
  assert.throws(() => calculateFoodizOrder([{ partnerPriceCents: 350 }], Number.NaN));
});

test("le total client additionne prix finaux, service et livraison", () => {
  const totals = calculateFoodizOrder(
    [
      { partnerPriceCents: 350 },
      { partnerPriceCents: 351 },
      { partnerPriceCents: 850 },
    ],
    7,
  );
  assert.equal(totals.clientItemsTotalCents, 500 + 641 + 1260);
  assert.equal(totals.serviceFeeCents, 119);
  assert.equal(totals.deliveryFeeCents, 470);
  assert.equal(totals.finalClientTotalCents, 2990);
});

test("Stripe importe le moteur unique et refuse une divergence avec le prix affiché", () => {
  assert.match(checkoutSource, /from "\.\.\/\.\.\/src\/lib\/engines\/foodizEconomicEngine\.js"/);
  assert.doesNotMatch(checkoutSource, /function calculateItemSplit/);
  assert.doesNotMatch(checkoutSource, /let distanceKm = 2/);
  assert.match(checkoutSource, /expectedTotalCents !== amountToPayCents/);
  assert.match(checkoutSource, /paymentMode === "mobile"/);
  assert.match(checkoutSource, /amount: amountToPayCents/);
  assert.match(checkoutSource, /stripeOperationGuard/);
  assert.match(checkoutSource, /if \(stripeGuard\) return stripeGuard/);
  assert.doesNotMatch(
    checkoutSource,
    /paymentMode === "mobile"\s*&&\s*process\.env\.ALLOW_LIVE_PAYMENTS/,
  );
});

test("le parrainage est crédité seulement après paiement et validation partenaire", () => {
  assert.match(phase2Migration, /payment_status <> 'completed'/);
  assert.match(phase2Migration, /status NOT IN \('preparing', 'ready', 'pickup', 'delivering', 'delivered'\)/);
  assert.match(phase2Migration, /WHERE filleul_id = order_row\.client_id\s+AND status = 'pending'/);
});
