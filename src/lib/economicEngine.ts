// src/lib/engines/economicEngine.ts

export interface PricingBreakdown {
  partnerPriceCents: number;
  surchargeCents: number;
  clientPriceCents: number;
  foodizMarginCents: number;
  driverEarningsCents: number;
  loyaltyPointsCents: number; // 1 cent = 1 point
  referralPointsCents: number;
  internalFeesCents: number;
  tier: 1 | 2 | 3;
}

export interface CartTotals {
  partnerSubtotalCents: number;
  clientSubtotalCents: number;
  totalSurchargeCents: number;
  totalFoodizMarginCents: number;
  totalDriverEarningsCents: number;
  totalLoyaltyPointsCents: number;
  totalReferralPointsCents: number;
  totalInternalFeesCents: number;
  serviceFeeCents: number;
  deliveryFeeCents: number;
  finalClientTotalCents: number;
  itemCount: number;
}

/**
 * 1. MOTEUR CALCUL PRIX ARTICLE
 * Tranches : 0.50-3.50 | 3.51-8.49 | 8.50+
 */
export function calculateArticlePricing(partnerPriceCents: number, quantity: number = 1): PricingBreakdown & { totalCents: number } {
  let tier: 1 | 2 | 3 = 1;
  let surchargeCents = 0;
  let foodizMarginCents = 0;
  let driverEarningsCents = 0;
  let loyaltyPointsCents = 0;
  let referralPointsCents = 0;
  let internalFeesCents = 0;

  // Logique des tranches (en centimes)
  if (partnerPriceCents <= 350) {
    tier = 1;
    surchargeCents = 120;
    foodizMarginCents = 50;
    driverEarningsCents = 50;
    loyaltyPointsCents = 10;
    referralPointsCents = 0;
    internalFeesCents = 10;
  } else if (partnerPriceCents >= 351 && partnerPriceCents <= 849) {
    tier = 2;
    surchargeCents = 250;
    foodizMarginCents = 100;
    driverEarningsCents = 100;
    loyaltyPointsCents = 20;
    referralPointsCents = 20;
    internalFeesCents = 10;
  } else {
    tier = 3;
    surchargeCents = 350;
    foodizMarginCents = 150;
    driverEarningsCents = 120;
    loyaltyPointsCents = 30;
    referralPointsCents = 30;
    internalFeesCents = 20;
  }

  const clientPriceCents = partnerPriceCents + surchargeCents;
  
  // Multiplication par la quantité pour le total de la ligne
  return {
    partnerPriceCents,
    surchargeCents,
    clientPriceCents,
    foodizMarginCents: foodizMarginCents * quantity,
    driverEarningsCents: driverEarningsCents * quantity,
    loyaltyPointsCents: loyaltyPointsCents * quantity,
    referralPointsCents: referralPointsCents * quantity,
    internalFeesCents: internalFeesCents * quantity,
    tier,
    totalCents: clientPriceCents * quantity
  };
}

/**
 * 4. FRAIS DE SERVICE
 * 1 art: 1.99 | 2: 1.49 | 3: 1.19 | 4+: 0.99
 */
export function calculateServiceFees(itemCount: number): number {
  if (itemCount === 1) return 199;
  if (itemCount === 2) return 149;
  if (itemCount === 3) return 119;
  return 99; // 4 articles ou plus
}

/**
 * 5. MOTEUR FRAIS LIVRAISON (MVP)
 */
export function calculateDeliveryFees(zone: string = 'standard'): number {
  // MVP : Frais fixes. Évolutif pour surge pricing, météo, etc.
  const fees: Record<string, number> = {
    'standard': 299, // 2.99 €
    'express': 499,
    'night': 599
  };
  return fees[zone] || 299;
}

/**
 * 3. MOTEUR PANIER GLOBAL
 * Fige tous les calculs.
 */
export function calculateCartTotals(items: { partnerPriceCents: number, quantity: number }[], deliveryZone: string = 'standard'): CartTotals {
  let partnerSubtotalCents = 0;
  let clientSubtotalCents = 0;
  let totalSurchargeCents = 0;
  let totalFoodizMarginCents = 0;
  let totalDriverEarningsCents = 0;
  let totalLoyaltyPointsCents = 0;
  let totalReferralPointsCents = 0;
  let totalInternalFeesCents = 0;
  let itemCount = 0;

  items.forEach(item => {
    const breakdown = calculateArticlePricing(item.partnerPriceCents, item.quantity);
    partnerSubtotalCents += breakdown.partnerPriceCents * item.quantity;
    clientSubtotalCents += breakdown.clientPriceCents * item.quantity;
    totalSurchargeCents += breakdown.surchargeCents * item.quantity;
    totalFoodizMarginCents += breakdown.foodizMarginCents;
    totalDriverEarningsCents += breakdown.driverEarningsCents;
    totalLoyaltyPointsCents += breakdown.loyaltyPointsCents;
    totalReferralPointsCents += breakdown.referralPointsCents;
    totalInternalFeesCents += breakdown.internalFeesCents;
    itemCount += item.quantity;
  });

  const serviceFeeCents = calculateServiceFees(itemCount);
  const deliveryFeeCents = calculateDeliveryFees(deliveryZone);
  
  // Total final client = Sous-total client + Frais service + Frais livraison
  const finalClientTotalCents = clientSubtotalCents + serviceFeeCents + deliveryFeeCents;

  return {
    partnerSubtotalCents,
    clientSubtotalCents,
    totalSurchargeCents,
    totalFoodizMarginCents,
    totalDriverEarningsCents,
    totalLoyaltyPointsCents,
    totalReferralPointsCents,
    totalInternalFeesCents,
    serviceFeeCents,
    deliveryFeeCents,
    finalClientTotalCents,
    itemCount
  };
}