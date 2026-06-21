import { supabase } from './supabase';

/**
 * Récupère une commande avec ses détails
 */
export async function getOrder(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
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
      restaurant:restaurants(name, address, city)
    `)
    .eq('courier_id', courierId)
    .in('status', ['pickup', 'delivering'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}
