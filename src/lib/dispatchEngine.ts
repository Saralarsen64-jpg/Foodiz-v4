// src/lib/engines/dispatchEngine.ts

export interface DriverProfile {
  id: string;
  rating: number; // 0 à 5
  acceptanceRate: number; // 0 à 100
  avgResponseTimeSec: number;
  recentDelaysCount: number;
  currentLoad: number; // Commandes en cours
  distanceToRestaurantM: number;
  distanceToClientM: number;
}

/**
 * 11. MOTEUR DISPATCH LIVREUR
 * Calcul du score dynamique sur 100.
 */
export function calculateDriverScore(driver: DriverProfile): number {
  let score = 0;

  // 1. Note livreur (Max 25 pts)
  score += (driver.rating / 5) * 25;

  // 2. Taux d'acceptation (Max 20 pts)
  score += (driver.acceptanceRate / 100) * 20;

  // 3. Rapidité de réponse (Max 15 pts) - Moins de 30s = full points
  const responseScore = Math.max(0, 15 - (driver.avgResponseTimeSec / 10));
  score += responseScore;

  // 4. Pénalité retards (Max -20 pts)
  score -= (driver.recentDelaysCount * 5);

  // 5. Distance Restaurant (Max 20 pts) - Plus c'est proche, mieux c'est
  // Ex: 0m = 20pts, 2000m = 0pts
  const distanceScore = Math.max(0, 20 - (driver.distanceToRestaurantM / 100));
  score += distanceScore;

  // 6. Surcharge (Pénalité)
  if (driver.currentLoad >= 2) score -= 10;
  if (driver.currentLoad >= 3) score -= 20; // Bloquant normalement

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * 6. MOTEUR FIDÉLITÉ (Créditation)
 * À appeler uniquement quand le statut passe à 'delivered'.
 */
export async function creditLoyaltyPoints(supabase: any, userId: string, pointsCents: number, orderId: string) {
  // 1. Ajouter la transaction
  await supabase.from('loyalty_transactions').insert({
    user_id: userId,
    order_id: orderId,
    type: 'order_reward',
    amount_cents: pointsCents
  });

  // 2. Mettre à jour le solde (Atomique via RPC ou incrément direct si RLS le permet)
  // Note: En prod, utiliser une Postgres Function pour l'atomicité.
  await supabase.rpc('increment_loyalty_balance', { user_id: userId, amount: pointsCents });
}