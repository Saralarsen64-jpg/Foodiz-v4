// Source de vérité économique unique Weello.
// Tous les montants sont exprimés en centimes.

export interface ItemBreakdown {
  partnerPriceCents: number;
  clientPriceCents: number;
  supplementCents: number;
  tier: 1 | 2 | 3;
  courierDirectCents: number;
  courierPrimeCents: number;
  foodizRevenueCents: number;
  loyaltyFundCents: number;
  referralFundCents: number;
  internalFeesCents: number;
  systemReserveCents: number;
}

export interface OrderTotals {
  itemCount: number;
  partnerTotalCents: number;
  clientItemsTotalCents: number;
  foodizRevenueCents: number;
  courierEarningsCents: number;
  courierPrimeFundCents: number;
  loyaltyFundCents: number;
  referralFundCents: number;
  internalFeesCents: number;
  systemReserveCents: number;
  serviceFeeCents: number;
  deliveryFeeCents: number;
  finalClientTotalCents: number;
}

function assertIntegerCents(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer amount in cents`);
  }
}

export function calculateItemSplit(partnerPriceCents: number): ItemBreakdown {
  assertIntegerCents(partnerPriceCents, "partnerPriceCents");

  if (partnerPriceCents < 50) {
    throw new Error("Weello products must have a partner price of at least 0.50 EUR");
  }

  if (partnerPriceCents <= 350) {
    return {
      partnerPriceCents,
      clientPriceCents: partnerPriceCents + 150,
      supplementCents: 150,
      tier: 1,
      foodizRevenueCents: 50,
      courierDirectCents: 50,
      loyaltyFundCents: 10,
      referralFundCents: 10,
      courierPrimeCents: 10,
      internalFeesCents: 20,
      systemReserveCents: 0,
    };
  }

  if (partnerPriceCents <= 849) {
    return {
      partnerPriceCents,
      clientPriceCents: partnerPriceCents + 290,
      supplementCents: 290,
      tier: 2,
      foodizRevenueCents: 100,
      courierDirectCents: 100,
      loyaltyFundCents: 20,
      referralFundCents: 20,
      courierPrimeCents: 20,
      internalFeesCents: 30,
      systemReserveCents: 0,
    };
  }

  return {
    partnerPriceCents,
    clientPriceCents: partnerPriceCents + 410,
    supplementCents: 410,
    tier: 3,
    foodizRevenueCents: 150,
    courierDirectCents: 130,
    loyaltyFundCents: 30,
    referralFundCents: 30,
    courierPrimeCents: 30,
    internalFeesCents: 40,
    systemReserveCents: 0,
  };
}

export function calculateClientUnitPriceCents(partnerPriceCents: number): number {
  return calculateItemSplit(partnerPriceCents).clientPriceCents;
}

export function calculateServiceFee(itemCount: number): number {
  if (!Number.isInteger(itemCount) || itemCount < 1) {
    throw new Error("itemCount must be a positive integer");
  }
  if (itemCount === 1) return 199;
  if (itemCount === 2) return 149;
  if (itemCount === 3) return 119;
  return 99;
}

export function calculateDeliveryFee(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new Error("A valid delivery distance is required");
  }
  if (distanceKm <= 5) return 350;
  return 350 + Math.ceil(distanceKm - 5) * 60;
}

export function isValidCoordinates(latitude: unknown, longitude: unknown): boolean {
  const lat = Number(latitude);
  const lon = Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export function calculateWeelloOrder(
  items: { partnerPriceCents: number }[],
  distanceKm: number,
): OrderTotals {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one item is required");
  }

  const itemTotals = items.reduce(
    (totals, item) => {
      const split = calculateItemSplit(item.partnerPriceCents);
      return {
        partnerTotalCents: totals.partnerTotalCents + split.partnerPriceCents,
        clientItemsTotalCents: totals.clientItemsTotalCents + split.clientPriceCents,
        foodizRevenueCents: totals.foodizRevenueCents + split.foodizRevenueCents,
        courierEarningsCents: totals.courierEarningsCents + split.courierDirectCents,
        courierPrimeFundCents: totals.courierPrimeFundCents + split.courierPrimeCents,
        loyaltyFundCents: totals.loyaltyFundCents + split.loyaltyFundCents,
        referralFundCents: totals.referralFundCents + split.referralFundCents,
        internalFeesCents: totals.internalFeesCents + split.internalFeesCents,
        systemReserveCents: totals.systemReserveCents + split.systemReserveCents,
      };
    },
    {
      partnerTotalCents: 0,
      clientItemsTotalCents: 0,
      foodizRevenueCents: 0,
      courierEarningsCents: 0,
      courierPrimeFundCents: 0,
      loyaltyFundCents: 0,
      referralFundCents: 0,
      internalFeesCents: 0,
      systemReserveCents: 0,
    },
  );

  const serviceFeeCents = calculateServiceFee(items.length);
  const deliveryFeeCents = calculateDeliveryFee(distanceKm);

  return {
    itemCount: items.length,
    ...itemTotals,
    serviceFeeCents,
    deliveryFeeCents,
    finalClientTotalCents:
      itemTotals.clientItemsTotalCents + serviceFeeCents + deliveryFeeCents,
  };
}
