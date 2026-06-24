import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import {
  FoodizBrand,
  FoodizCard,
  FoodizHero,
  FoodizMetric,
  FoodizPill,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

type Order = {
  id: string;
  status: string;
  final_client_total_cents: number;
  created_at: string;
  restaurant: { name: string } | null;
};

export default function ClientOrdersScreen() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!session?.user.id) return;
    void supabase
      .from('orders')
      .select('id,status,final_client_total_cents,created_at,restaurant:restaurants(name)')
      .eq('client_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setOrders((data || []) as unknown as Order[]));
  }, [session?.user.id]);

  return (
    <FoodizScreen>
      <FoodizBrand subtitle="Mes commandes" />
      <FoodizHero
        eyebrow="Suivi Foodiz"
        title="Vos commandes, sans stress"
        body="Retrouvez l’historique, le statut et le suivi live dès qu’un livreur prend le relais.">
        <FoodizMetric
          label="Commandes"
          value={orders.length}
          helper="récentes"
          tone={orders.length > 0 ? 'success' : 'muted'}
        />
      </FoodizHero>

      {orders.length === 0 ? (
        <FoodizCard>
          <Text style={foodizText.heading}>Aucune commande</Text>
          <Text style={foodizText.body}>Votre historique apparaîtra ici.</Text>
        </FoodizCard>
      ) : (
        orders.map((order) => (
          <Pressable
            key={order.id}
            onPress={() =>
              router.push({
                pathname: '/client/order/[id]',
                params: { id: order.id },
              })
            }>
            <FoodizCard>
              <FoodizPill
                label={order.status}
                tone={
                  order.status === 'delivered'
                    ? 'success'
                    : order.status === 'cancelled'
                      ? 'danger'
                      : 'gold'
                }
              />
              <Text style={foodizText.heading}>
                {order.restaurant?.name || 'Commande Foodiz'}
              </Text>
              <Text style={foodizText.body}>
                #{order.id.slice(0, 8)}
              </Text>
              <Text style={[foodizText.heading, foodizText.gold]}>
                {(order.final_client_total_cents / 100).toFixed(2)} €
              </Text>
              <Text style={foodizText.gold}>Voir le suivi →</Text>
            </FoodizCard>
          </Pressable>
        ))
      )}
    </FoodizScreen>
  );
}
