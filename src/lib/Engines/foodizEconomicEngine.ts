// src/lib/engines/foodizEconomicEngine.ts

export interface ItemBreakdown {
  partnerPriceCents: number;
  supplementCents: number;
  tier: 1 | 2 | 3;
  // Répartition du supplément
  courierDirectCents: number;
  courierPrimeCents: number; // 0.10€ fixe (financé par la part livreur si nécessaire, mais ici calculé séparément pour le wallet)
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
  courierEarningsCents: number; // Somme des courierDirectCents
  courierPrimeFundCents: number; // Somme des courierPrimeCents (0.10€ par article)
  loyaltyFundCents: number;
  referralFundCents: number;
  internalFeesCents: number;
  systemReserveCents: number;
  serviceFeeCents: number;
  deliveryFeeCents: number;
  finalClientTotalCents: number;
}

/**
 * Calcule la répartition exacte pour UN article selon les tranches Foodiz.
 */
function calculateItemSplit(partnerPriceCents: number): ItemBreakdown {
  let tier: 1 | 2 | 3 = 1;
  let supplementCents = 0;
  let courierDirectCents = 0;
  let courierPrimeCents = 10; // Toujours 0.10€ (10 centimes) de prime livreur par article
  let foodizRevenueCents = 0;
  let loyaltyFundCents = 0;
  let referralFundCents = 0;
  let internalFeesCents = 0;
  let systemReserveCents = 0;

  if (partnerPriceCents >= 50 && partnerPriceCents <= 350) {
    // TRANCHE 1 : 0,50€ → 3,50€ | Supplément 1,30€ (130 centimes)
    tier = 1;
    supplementCents = 130;
    courierDirectCents = 50; 
    // Note: 50 (direct) + 10 (prime) + 40 (foodiz) + 10 (loyalty) + 10 (internal) + 10 (reserve) = 130. OK.
    foodizRevenueCents = 40;
    loyaltyFundCents = 10;
    referralFundCents = 0;
    internalFeesCents = 10;
    systemReserveCents = 10;

  } else if (partnerPriceCents >= 351 && partnerPriceCents <= 849) {
    // TRANCHE 2 : 3,51€ → 8,49€ | Supplément 2,60€ (260 centimes)
    tier = 2;
    supplementCents = 260;
    // La prime de 0.10€ est financée en réduisant la part livreur direct, mais le livreur touche bien 1.10€ au total.
    // Pour respecter "Ne jamais réduire la part Foodiz", on ajuste le direct.
    // 1.00 (foodiz) + 0.20 (loyalty) + 0.20 (referral) + 0.10 (internal) = 1.50€. 
    // Reste 1.10€ pour le livreur (1.00 direct affiché + 0.10 prime wallet).
    courierDirectCents = 100; 
    foodizRevenueCents = 100;
    loyaltyFundCents = 20;
    referralFundCents = 20;
    internalFeesCents = 10;
    systemReserveCents = 0;

  } else {
    // TRANCHE 3 : 8,50€ et + | Supplément 3,60€ (360 centimes)
    tier = 3;
    supplementCents = 360;
    courierDirectCents = 120;
    foodizRevenueCents = 130;
    loyaltyFundCents = 30;
    referralFundCents = 30;
    internalFeesCents = 20;
    systemReserveCents = 20;
    // 120+10+130+30+30+20+20 = 360. OK.
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

/**
 * Calcule les frais de service dégressifs selon le nombre d'articles.
 */
function calculateServiceFee(itemCount: number): number {
  if (itemCount === 1) return 199; // 1.99€
  if (itemCount === 2) return 149; // 1.49€
  if (itemCount === 3) return 119; // 1.19€
  return 99;                       // 0.99€ (4 articles et +)
}

/**
 * Calcule les frais de livraison selon la distance (Zone standard 0-4km max 3.50€).
 */
function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= 1.5) return 199; // 1.99€
  if (distanceKm <= 3.0) return 249; // 2.49€
  if (distanceKm <= 4.0) return 350; // 3.50€
  // Au-delà de 4km : 3.50€ + 0.50€ par km supplémentaire
  return 350 + Math.ceil((distanceKm - 4.0) * 50); 
}

/**
 * MOTEUR PRINCIPAL : Calcule le panier complet et fige les données financières.
 */
export function calculateFoodizOrder(
  items: { partnerPriceCents: number }[], 
  distanceKm: number = 2.0 // Distance par défaut pour le calcul
): OrderTotals {
  
  let partnerTotalCents = 0;
  let foodizRevenueCents = 0;
  let courierEarningsCents = 0;
  let courierPrimeFundCents = 0;
  let loyaltyFundCents = 0;
  let referralFundCents = 0;
  let internalFeesCents = 0;
  let systemReserveCents = 0;
  let clientSubtotalCents = 0; // Somme (prix partenaire + supplément)

  const itemCount = items.length;

  items.forEach(item => {
    const split = calculateItemSplit(item.partnerPriceCents);
    
    partnerTotalCents += split.partnerPriceCents;
    foodizRevenueCents += split.foodizRevenueCents;
    courierEarningsCents += split.courierDirectCents; // Ce que le livreur touche directement par article
    courierPrimeFundCents += split.courierPrimeCents; // Ce qui va dans le wallet Prime Livreur
    loyaltyFundCents += split.loyaltyFundCents;
    referralFundCents += split.referralFundCents;
    internalFeesCents += split.internalFeesCents;
    systemReserveCents += split.systemReserveCents;
    
    clientSubtotalCents += (split.partnerPriceCents + split.supplementCents);
  });

  const serviceFeeCents = calculateServiceFee(itemCount);
  const deliveryFeeCents = calculateDeliveryFee(distanceKm);

  // Prix final client = Sous-total articles (avec suppléments) + Frais service + Livraison
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