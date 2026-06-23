import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  FoodizBrand,
  FoodizCard,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

type Restaurant = {
  id: string;
  name: string;
  city: string | null;
  status: string;
  is_active: boolean;
};

type PartnerOrder = {
  id: string;
  status: string;
  partner_total_cents: number;
  created_at: string;
  delivered_at: string | null;
};

async function fetchPartnerDashboard(userId: string) {
  const { data: establishment } = await supabase
    .from('restaurants')
    .select('id,name,city,status,is_active')
    .eq('owner_id', userId)
    .maybeSingle();
  if (!establishment) {
    return { restaurant: null, orders: [] as PartnerOrder[] };
  }
  const { data } = await supabase
    .from('orders')
    .select('id,status,partner_total_cents,created_at,delivered_at')
    .eq('restaurant_id', establishment.id)
    .order('created_at', { ascending: false })
    .limit(100);
  return {
    restaurant: establishment as Restaurant,
    orders: (data || []) as PartnerOrder[],
  };
}

export default function PartnerDashboardScreen() {
  const { profile, session } = useAuth();
  const userId = session?.user.id;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!userId) return;
    setRefreshing(true);
    const data = await fetchPartnerDashboard(userId);
    setRestaurant(data.restaurant);
    setOrders(data.orders);
    setRefreshing(false);
  }

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchPartnerDashboard(userId).then((data) => {
      if (!active) return;
      setRestaurant(data.restaurant);
      setOrders(data.orders);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      current: orders.filter((order) =>
        ['pending', 'preparing', 'ready'].includes(order.status),
      ).length,
      deliveredToday: orders.filter(
        (order) =>
          order.status === 'delivered'
          && new Date(order.delivered_at || order.created_at) >= today,
      ).length,
      revenue: orders
        .filter((order) => order.status === 'delivered')
        .reduce((total, order) => total + order.partner_total_cents, 0),
    };
  }, [orders]);

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
            tintColor={colors.gold}
          />
        }>
        <FoodizBrand subtitle="Espace partenaire" />
        <Text style={foodizText.title}>
          Bonjour {profile?.first_name || 'Partenaire'}
        </Text>
        <Text style={foodizText.body}>
          {restaurant?.name || 'Votre établissement Foodiz'}
          {restaurant?.city ? ` · ${restaurant.city}` : ''}
        </Text>

        <View style={styles.metrics}>
          <FoodizCard>
            <Text style={styles.kicker}>À TRAITER</Text>
            <Text style={styles.metric}>{metrics.current}</Text>
            <Text style={foodizText.body}>commandes en cours</Text>
          </FoodizCard>
          <FoodizCard>
            <Text style={styles.kicker}>AUJOURD’HUI</Text>
            <Text style={styles.metric}>{metrics.deliveredToday}</Text>
            <Text style={foodizText.body}>commandes livrées</Text>
          </FoodizCard>
        </View>

        <FoodizCard>
          <Text style={styles.kicker}>CHIFFRE PARTENAIRE LIVRÉ</Text>
          <Text style={foodizText.title}>
            {(metrics.revenue / 100).toFixed(2)} €
          </Text>
          <Text style={foodizText.body}>
            Montant partenaire cumulé sur les commandes livrées affichées.
          </Text>
        </FoodizCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, gap: 18, padding: 24 },
  metrics: { gap: 12 },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  metric: { color: colors.cream, fontSize: 34, fontWeight: '900' },
});
