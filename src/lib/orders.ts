import { supabase } from './supabase';
import { calculateFoodizOrder } from './engines/foodizEconomicEngine';

export interface OrderCreateData {
  clientId: string;
  restaurantId: string;
  items: Array<{
    productId: string;
    quantity: number;
    partnerPriceCents: number; // Prix du produit côté partenaire (avant supplements)
  }>;
  deliveryAddress: string;
  distanceKm?: number; // Distance pour calcul livraison (auto-calculée si absent)
  clientLatitude?: number;
  clientLongitude?: number;
  restaurantLatitude?: number;
  restaurantLongitude?: number;
}

/**
 * Calcule la distance entre deux points GPS (Haversine)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Crée une commande dans Supabase avec le modèle économique Foodiz
 */
export async function createOrder(data: OrderCreateData): Promise<string> {
  try {
    // 1. Récupérer les infos du restaurant et du client
    const [
      { data: restaurant, error: restaurantError },
      { data: client, error: clientError },
    ] = await Promise.all([
      supabase.from('restaurants').select('id, latitude, longitude').eq('id', data.restaurantId).single(),
      supabase.from('profiles').select('id, latitude, longitude').eq('id', data.clientId).single(),
    ]);

    if (restaurantError || !restaurant) {
      throw new Error('Restaurant non trouvé');
    }
    if (clientError || !client) {
      throw new Error('Client non trouvé');
    }

    // 2. Calculer la distance si pas fournie
    let distanceKm = data.distanceKm || 2.0; // Par défaut 2km
    if (
      restaurant.latitude &&
      restaurant.longitude &&
      client.latitude &&
      client.longitude
    ) {
      distanceKm = calculateDistance(
        client.latitude,
        client.longitude,
        restaurant.latitude,
        restaurant.longitude
      );
    }

    // 3. Préparer les items avec quantité pour le calcul
    const itemsForCalculation = data.items.flatMap(item =>
      Array(item.quantity).fill({
        partnerPriceCents: item.partnerPriceCents,
      })
    );

    // 4. Calculer la répartition économique avec le vrai modèle
    const orderTotals = calculateFoodizOrder(itemsForCalculation, distanceKm);

    // 5. Créer la commande dans Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id: data.clientId,
        restaurant_id: data.restaurantId,
        status: 'pending',
        delivery_address: data.deliveryAddress,
        client_latitude: client.latitude,
        client_longitude: client.longitude,
        final_client_total_cents: orderTotals.finalClientTotalCents,
        partner_total_cents: orderTotals.partnerTotalCents,
        service_fee_cents: orderTotals.serviceFeeCents,
        internal_fees_cents: orderTotals.internalFeesCents,
        delivery_fee_cents: orderTotals.deliveryFeeCents,
        courier_earnings_cents: orderTotals.courierEarningsCents,
        courier_prime_fund_cents: orderTotals.courierPrimeFundCents,
        loyalty_fund_cents: orderTotals.loyaltyFundCents,
        referral_fund_cents: orderTotals.referralFundCents,
        foodiz_revenue_cents: orderTotals.foodizRevenueCents,
        system_reserve_cents: orderTotals.systemReserveCents,
        estimated_time_mins: 30,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error('Erreur création commande');
    }

    // 6. Créer les order_items avec les vrais prix
    const orderItems = data.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price_cents: item.partnerPriceCents,
      total_price_cents: item.partnerPriceCents * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      throw new Error('Erreur ajout articles');
    }

    // 7. Ajouter les points provisionnés par la réserve fidélité.
    // Règle Foodiz: 1 point = 1 centime, financé par loyalty_fund_cents.
    const pointsEarned = orderTotals.loyaltyFundCents;
    const { data: wallet } = await supabase
      .from('client_wallets')
      .select('points_balance')
      .eq('user_id', data.clientId)
      .single();

    if (wallet) {
      await supabase
        .from('client_wallets')
        .update({ points_balance: (wallet.points_balance || 0) + pointsEarned })
        .eq('user_id', data.clientId);
    }

    // 8. Créer une notification pour le partenaire
    const { data: restaurant_data } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', data.restaurantId)
      .single();

    if (restaurant_data) {
      await supabase.from('notifications').insert({
        user_id: restaurant_data.owner_id,
        title: 'Nouvelle commande',
        message: `Commande #${order.id.slice(0, 8)} de ${orderTotals.finalClientTotalCents / 100}€`,
        type: 'order',
        related_order_id: order.id,
      });
    }

    return order.id;
  } catch (err) {
    console.error('Erreur création commande:', err);
    throw err;
  }
}

/**
 * Récupère une commande avec ses détails
 */
export async function getOrder(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      client:profiles!orders_client_id_fkey(first_name, last_name, email, phone, address),
      restaurant:restaurants!orders_restaurant_id_fkey(name, address, city),
      order_items(
        *,
        product:products(name, category)
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Récupère toutes les commandes d'un client
 */
export async function getClientOrders(clientId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      status,
      final_client_total_cents,
      created_at,
      restaurant:restaurants(name),
      order_items(quantity)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Met à jour le statut d'une commande
 */
export async function updateOrderStatus(orderId: string, status: string) {
  const { error } = await supabase
    .from('orders')
    .update({ 
      status,
      updated_at: new Date().toISOString(),
      ...(status === 'delivered' && { delivered_at: new Date().toISOString() })
    })
    .eq('id', orderId);

  if (error) throw error;
}

/**
 * Récupère les commandes actives d'un restaurant (partenaire)
 */
export async function getRestaurantActiveOrders(restaurantId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      client:profiles!orders_client_id_fkey(first_name, last_name),
      order_items(quantity, product:products(name))
    `)
    .eq('restaurant_id', restaurantId)
    .in('status', ['pending', 'preparing', 'ready', 'pickup'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Récupère les commandes assignées à un livreur (courier)
 */
export async function getCourierAssignedOrders(courierId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      client:profiles!orders_client_id_fkey(first_name, last_name, phone, address),
      restaurant:restaurants(name, address, city)
    `)
    .eq('courier_id', courierId)
    .in('status', ['pickup', 'delivering'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}
