import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FoodizCard,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

type OrderDetail = {
  id: string;
  status: string;
  payment_status: string;
  final_client_total_cents: number;
  delivery_address: string | null;
  estimated_time_mins: number | null;
  created_at: string;
  restaurant: { name: string | null } | null;
  order_items: {
    quantity: number;
    total_price_cents: number;
    product: { name: string | null } | null;
  }[];
};

const progress = [
  'pending',
  'preparing',
  'ready',
  'pickup',
  'picked_up',
  'delivering',
  'delivered',
];

export default function ClientOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [deliveryCode, setDeliveryCode] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !session?.user.id) return;
    let active = true;
    void Promise.all([
      supabase
        .from('orders')
        .select(
          'id,status,payment_status,final_client_total_cents,delivery_address,estimated_time_mins,created_at,restaurant:restaurants(name),order_items(quantity,total_price_cents,product:products(name))',
        )
        .eq('id', id)
        .eq('client_id', session.user.id)
        .maybeSingle(),
      supabase
        .from('client_delivery_codes')
        .select('code')
        .eq('order_id', id)
        .eq('client_id', session.user.id)
        .maybeSingle(),
    ]).then(([orderResult, codeResult]) => {
      if (!active) return;
      setOrder(orderResult.data as unknown as OrderDetail | null);
      setDeliveryCode(codeResult.data?.code || null);
    });
    return () => {
      active = false;
    };
  }, [id, session?.user.id]);

  if (!order) {
    return (
      <FoodizScreen>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Mes commandes</Text>
        </Pressable>
        <FoodizCard>
          <Text style={foodizText.body}>Chargement de la commande…</Text>
        </FoodizCard>
      </FoodizScreen>
    );
  }

  const currentIndex = progress.indexOf(order.status);

  return (
    <FoodizScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Mes commandes</Text>
      </Pressable>
      <Text style={styles.kicker}>COMMANDE #{order.id.slice(0, 8)}</Text>
      <Text style={foodizText.title}>
        {order.restaurant?.name || 'Commande Foodiz'}
      </Text>
      <Text style={foodizText.body}>
        {order.delivery_address || 'Adresse de livraison enregistrée'}
      </Text>

      <FoodizCard>
        <Text style={foodizText.heading}>Suivi</Text>
        {progress.map((status, index) => (
          <View key={status} style={styles.step}>
            <View
              style={[
                styles.dot,
                index <= currentIndex && styles.dotActive,
              ]}
            />
            <Text
              style={[
                styles.stepText,
                index <= currentIndex && styles.stepTextActive,
              ]}>
              {status}
            </Text>
          </View>
        ))}
      </FoodizCard>

      {deliveryCode && ['pickup', 'picked_up', 'delivering'].includes(order.status) ? (
        <FoodizCard>
          <Text style={styles.kicker}>CODE DE REMISE</Text>
          <Text style={styles.code}>{deliveryCode}</Text>
          <Text style={foodizText.body}>
            Communiquez ce code au livreur uniquement lorsque la commande vous
            est remise.
          </Text>
        </FoodizCard>
      ) : null}

      <FoodizCard>
        {order.order_items.map((item, index) => (
          <View key={`${order.id}-${index}`} style={styles.row}>
            <Text style={foodizText.body}>
              {item.quantity} × {item.product?.name || 'Article'}
            </Text>
            <Text style={styles.value}>
              {(item.total_price_cents / 100).toFixed(2)} €
            </Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={foodizText.heading}>Total payé</Text>
          <Text style={styles.total}>
            {(order.final_client_total_cents / 100).toFixed(2)} €
          </Text>
        </View>
      </FoodizCard>
    </FoodizScreen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  dotActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  stepText: { color: colors.muted, textTransform: 'capitalize' },
  stepTextActive: { color: colors.cream, fontWeight: '800' },
  code: {
    color: colors.gold,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 10,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  value: { color: colors.cream, fontWeight: '700' },
  total: { color: colors.gold, fontWeight: '900', fontSize: 20 },
  divider: { height: 1, backgroundColor: colors.border },
});
