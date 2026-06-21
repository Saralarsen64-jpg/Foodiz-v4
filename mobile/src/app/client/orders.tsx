import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import {
  FoodizBrand,
  FoodizCard,
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
      {orders.length === 0 ? (
        <FoodizCard>
          <Text style={foodizText.heading}>Aucune commande</Text>
          <Text style={foodizText.body}>Votre historique apparaîtra ici.</Text>
        </FoodizCard>
      ) : (
        orders.map((order) => (
          <FoodizCard key={order.id}>
            <Text style={foodizText.heading}>
              {order.restaurant?.name || 'Commande Foodiz'}
            </Text>
            <Text style={foodizText.body}>
              #{order.id.slice(0, 8)} · {order.status}
            </Text>
            <Text style={[foodizText.heading, foodizText.gold]}>
              {(order.final_client_total_cents / 100).toFixed(2)} €
            </Text>
          </FoodizCard>
        ))
      )}
    </FoodizScreen>
  );
}
