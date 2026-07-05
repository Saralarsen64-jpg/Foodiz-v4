import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import {
  WeelloBrand,
  WeelloCard,
  WeelloHero,
  WeelloMetric,
  WeelloPill,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
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
    <WeelloScreen>
      <WeelloBrand subtitle="Mes commandes" />
      <WeelloHero
        eyebrow="Suivi Weello"
        title="Vos commandes, sans stress"
        body="Retrouvez l’historique, le statut et le suivi live dès qu’un livreur prend le relais.">
        <WeelloMetric
          label="Commandes"
          value={orders.length}
          helper="récentes"
          tone={orders.length > 0 ? 'success' : 'muted'}
        />
      </WeelloHero>

      {orders.length === 0 ? (
        <WeelloCard>
          <Text style={weelloText.heading}>Aucune commande</Text>
          <Text style={weelloText.body}>Votre historique apparaîtra ici.</Text>
        </WeelloCard>
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
            <WeelloCard>
              <WeelloPill
                label={order.status}
                tone={
                  order.status === 'delivered'
                    ? 'success'
                    : order.status === 'cancelled'
                      ? 'danger'
                      : 'gold'
                }
              />
              <Text style={weelloText.heading}>
                {order.restaurant?.name || 'Commande Weello'}
              </Text>
              <Text style={weelloText.body}>
                #{order.id.slice(0, 8)}
              </Text>
              <Text style={[weelloText.heading, weelloText.gold]}>
                {(order.final_client_total_cents / 100).toFixed(2)} €
              </Text>
              <Text style={weelloText.gold}>Voir le suivi →</Text>
            </WeelloCard>
          </Pressable>
        ))
      )}
    </WeelloScreen>
  );
}
