// src/lib/engines/foodizEconomicEngine.ts

export interface ItemBreakdown {
  partnerPriceCents: number;
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

function calculateItemSplit(partnerPriceCents: number): ItemBreakdown {
  let tier: 1 | 2 | 3 = 1;
  let supplementCents = 0;
  let courierDirectCents = 0;
  let courierPrimeCents = 10;
  let foodizRevenueCents = 0;
  let loyaltyFundCents = 0;
  let referralFundCents = 0;
  let internalFeesCents = 0;
  let systemReserveCents = 0;

  if (partnerPriceCents >= 50 && partnerPriceCents <= 350) {
    tier = 1;
    supplementCents = 130;
    courierDirectCents = 50;
    foodizRevenueCents = 40;
    loyaltyFundCents = 10;
    referralFundCents = 0;
    internalFeesCents = 10;
    systemReserveCents = 10;
  } else if (partnerPriceCents >= 351 && partnerPriceCents <= 849) {
    tier = 2;
    supplementCents = 260;
    courierDirectCents = 100;
    foodizRevenueCents = 100;
    loyaltyFundCents = 20;
    referralFundCents = 20;
    internalFeesCents = 10;
    systemReserveCents = 0;
  } else {
    tier = 3;
    supplementCents = 360;
    courierDirectCents = 120;
    foodizRevenueCents = 130;
    loyaltyFundCents = 30;
    referralFundCents = 30;
    internalFeesCents = 20;
    systemReserveCents = 20;
  }

  return {
    partnerPriceCents,
    supplementCents,
    tier,
    courierDirectCents,
    courierPrimeCents,
    foodizRevenueCents,
    loyaltyFundCents,
    referralFundCents,
    internalFeesCents,
    systemReserveCents
  };
}

function calculateServiceFee(itemCount: number): number {
  if (itemCount === 1) return 199;
  if (itemCount === 2) return 149;
  if (itemCount === 3) return 119;
  return 99;
}

function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= 1.5) return 199;
  if (distanceKm <= 3.0) return 249;
  if (distanceKm <= 4.0) return 350;
  return 350 + Math.ceil((distanceKm - 4.0) * 50);
}

export function calculateFoodizOrder(
  items: { partnerPriceCents: number }[], 
  distanceKm: number = 2.0
): OrderTotals {
  
  let partnerTotalCents = 0;
  let foodizRevenueCents = 0;
  let courierEarningsCents = 0;
  let courierPrimeFundCents = 0;
  let loyaltyFundCents = 0;
  let referralFundCents = 0;
  let internalFeesCents = 0;
  let systemReserveCents = 0;
  let clientSubtotalCents = 0;

  const itemCount = items.length;

  items.forEach(item => {
    const split = calculateItemSplit(item.partnerPriceCents);
    
    partnerTotalCents += split.partnerPriceCents;
    foodizRevenueCents += split.foodizRevenueCents;
    courierEarningsCents += split.courierDirectCents;
    courierPrimeFundCents += split.courierPrimeCents;
    loyaltyFundCents += split.loyaltyFundCents;
    referralFundCents += split.referralFundCents;
    internalFeesCents += split.internalFeesCents;
    systemReserveCents += split.systemReserveCents;
    
    clientSubtotalCents += (split.partnerPriceCents + split.supplementCents);
  });

  const serviceFeeCents = calculateServiceFee(itemCount);
  const deliveryFeeCents = calculateDeliveryFee(distanceKm);

  const finalClientTotalCents = clientSubtotalCents + serviceFeeCents + deliveryFeeCents;

  return {
    itemCount,
    partnerTotalCents,
    foodizRevenueCents,
    courierEarningsCents,
    courierPrimeFundCents,
    loyaltyFundCents,
    referralFundCents,
    internalFeesCents,
    systemReserveCents,
    serviceFeeCents,
    deliveryFeeCents,
    finalClientTotalCents
  };
}