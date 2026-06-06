import { supabase } from './supabase';

export interface OrderCreateData {
  clientId: string;
  restaurantId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  deliveryAddress: string;
}

/**
 * Calcule la répartition des frais d'une commande selon le modèle économique Foodiz
 * 
 * FRAIS CONSTANTS (à ajuster selon votre config):
 * - Service Foodiz: 15%
 * - Frais internes: 2%
 * - Livreur de base: 3€
 * - Prime fund (livreur): 0.50€
 * - Loyalty fund: 0.50€
 */
export function calculateOrderSplit(clientTotalCents: number) {
  const SERVICE_FEE_PERCENT = 0.15;      // 15%
  const INTERNAL_FEES_PERCENT = 0.02;    // 2%
  const COURIER_BASE_CENTS = 300;        // 3€
  const COURIER_PRIME_FUND = 50;         // 0.50€
  const LOYALTY_FUND_CENTS = 50;         // 0.50€
  const REFERRAL_FUND_CENTS = 30;        // 0.30€ (peut être 0)

  const serviceFee = Math.round(clientTotalCents * SERVICE_FEE_PERCENT);
  const internalFees = Math.round(clientTotalCents * INTERNAL_FEES_PERCENT);
  const deliveryFee = COURIER_BASE_CENTS;
  const courierEarnings = COURIER_BASE_CENTS;
  const courierPrimeFund = COURIER_PRIME_FUND;
  const loyaltyFund = LOYALTY_FUND_CENTS;
  const referralFund = REFERRAL_FUND_CENTS;

  // Partenaire reçoit: total_client - service_fee - internal_fees - delivery
  const partnerTotal = clientTotalCents - serviceFee - internalFees - deliveryFee;

  // Revenue Foodiz = service_fee + internal_fees + delivery_fee - courier_earnings - funds
  const foodizRevenue = serviceFee + internalFees + deliveryFee - courierEarnings - courierPrimeFund - loyaltyFund - referralFund;

  return {
    serviceFee,
    internalFees,
    deliveryFee,
    courierEarnings,
    courierPrimeFund,
    loyaltyFund,
    referralFund,
    partnerTotal,
    foodizRevenue,
  };
}

/**
 * Crée une commande dans Supabase
 */
export async function createOrder(data: OrderCreateData): Promise<string> {
  try {
    // 1. Récupérer les infos du restaurant et du client
    const [
      { data: restaurant, error: restaurantError },
      { data: client, error: clientError },
    ] = await Promise.all([
      supabase.from('restaurants').select('id').eq('id', data.restaurantId).single(),
      supabase.from('profiles').select('id').eq('id', data.clientId).single(),
    ]);

    if (restaurantError || !restaurant) {
      throw new Error('Restaurant non trouvé');
    }
    if (clientError || !client) {
      throw new Error('Client non trouvé');
    }

    // 2. Calculer le total des articles
    let clientTotalCents = 0;
    for (const item of data.items) {
      clientTotalCents += item.unitPriceCents * item.quantity;
    }

    // 3. Calculer la répartition des frais
    const split = calculateOrderSplit(clientTotalCents);

    // 4. Créer la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_id: data.clientId,
        restaurant_id: data.restaurantId,
        status: 'pending',
        delivery_address: data.deliveryAddress,
        final_client_total_cents: clientTotalCents,
        partner_total_cents: split.partnerTotal,
        service_fee_cents: split.serviceFee,
        internal_fees_cents: split.internalFees,
        delivery_fee_cents: split.deliveryFee,
        courier_earnings_cents: split.courierEarnings,
        courier_prime_fund_cents: split.courierPrimeFund,
        loyalty_fund_cents: split.loyaltyFund,
        referral_fund_cents: split.referralFund,
        foodiz_revenue_cents: split.foodizRevenue,
        estimated_time_mins: 30, // À ajuster selon le restaurant
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error('Erreur création commande');
    }

    // 5. Créer les order_items
    const orderItems = data.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price_cents: item.unitPriceCents,
      total_price_cents: item.unitPriceCents * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      throw new Error('Erreur ajout articles');
    }

    // 6. Ajouter les points au portefeuille du client (basé sur le montant)
    const pointsEarned = Math.floor(clientTotalCents / 100); // 1 point par euro
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

    // 7. Créer une notification pour le partenaire
    const { data: restaurant_data } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', data.restaurantId)
      .single();

    if (restaurant_data) {
      await supabase.from('notifications').insert({
        user_id: restaurant_data.owner_id,
        title: 'Nouvelle commande',
        message: `Commande #${order.id.slice(0, 8)} de ${clientTotalCents / 100}€`,
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
