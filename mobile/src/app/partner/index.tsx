import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  FoodizActionCard,
  FoodizBrand,
  FoodizCard,
  FoodizHero,
  FoodizMetric,
  FoodizPill,
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
    return { restaurant: null, orders: [] as PartnerOrder[], productsCount: 0 };
  }
  const [ordersResult, productsResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id,status,partner_total_cents,created_at,delivered_at')
      .eq('restaurant_id', establishment.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', establishment.id),
  ]);
  return {
    restaurant: establishment as Restaurant,
    orders: (ordersResult.data || []) as PartnerOrder[],
    productsCount: productsResult.count || 0,
  };
}

export default function PartnerDashboardScreen() {
  const { profile, session } = useAuth();
  const userId = session?.user.id;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [productsCount, setProductsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!userId) return;
    setRefreshing(true);
    const data = await fetchPartnerDashboard(userId);
    setRestaurant(data.restaurant);
    setOrders(data.orders);
    setProductsCount(data.productsCount || 0);
    setRefreshing(false);
  }

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchPartnerDashboard(userId).then((data) => {
      if (!active) return;
      setRestaurant(data.restaurant);
      setOrders(data.orders);
      setProductsCount(data.productsCount || 0);
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

  const activeLabel = restaurant?.is_active ? 'En vente' : 'Non visible';
  const statusTone = restaurant?.is_active ? 'success' : restaurant ? 'muted' : 'danger';
  const readinessItems = [
    restaurant?.is_active,
    productsCount >= 5,
    metrics.current === 0,
  ];
  const readinessScore = Math.round(
    (readinessItems.filter(Boolean).length / readinessItems.length) * 100,
  );

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
        <FoodizHero
          eyebrow="Pilotage partenaire"
          title={`Bonjour ${profile?.first_name || 'Partenaire'}`}
          body={
            restaurant
              ? `${restaurant.name}${restaurant.city ? ` · ${restaurant.city}` : ''}. Gardez votre carte claire, vos commandes rapides et vos clients rassurés.`
              : 'Créez votre dossier établissement pour préparer votre lancement Foodiz.'
          }>
          <View style={styles.metrics}>
            <FoodizMetric
              label="À traiter"
              value={metrics.current}
              helper="commandes actives"
              tone={metrics.current > 0 ? 'success' : 'muted'}
            />
            <FoodizMetric
              label="Livrées"
              value={metrics.deliveredToday}
              helper="aujourd’hui"
              tone={metrics.deliveredToday > 0 ? 'success' : 'muted'}
            />
            <FoodizMetric
              label="Carte"
              value={productsCount}
              helper={productsCount >= 5 ? 'base solide' : 'produits à enrichir'}
              tone={productsCount >= 5 ? 'success' : 'muted'}
            />
          </View>
        </FoodizHero>

        <FoodizCard>
          <View style={styles.statusRow}>
            <Text style={styles.kicker}>ÉTABLISSEMENT</Text>
            <FoodizPill
              label={restaurant ? activeLabel : 'À créer'}
              tone={statusTone}
            />
          </View>
          <Text style={foodizText.heading}>
            {restaurant?.name || 'Votre établissement Foodiz'}
          </Text>
          <Text style={foodizText.body}>
            Statut opérationnel : {restaurant?.status || 'dossier non initialisé'}.
            {restaurant?.is_active
              ? ' Les clients pourront commander dès l’ouverture de votre ville.'
              : ' Vérifiez votre dossier et votre carte avant la mise en vente.'}
          </Text>
        </FoodizCard>

        <FoodizCard>
          <Text style={styles.kicker}>CHIFFRE PARTENAIRE LIVRÉ</Text>
          <Text style={foodizText.title}>
            {(metrics.revenue / 100).toFixed(2)} €
          </Text>
          <Text style={foodizText.body}>
            Montant partenaire cumulé sur les commandes livrées affichées.
          </Text>
        </FoodizCard>

        <FoodizCard>
          <Text style={styles.kicker}>PLAN D’ACTION</Text>
          <Text style={foodizText.heading}>Votre vitrine doit donner faim et confiance.</Text>
          <View style={styles.readinessRow}>
            <Text style={styles.readinessValue}>{readinessScore}%</Text>
            <View style={styles.readinessTextBlock}>
              <Text style={styles.readinessLabel}>Préparation partenaire</Text>
              <Text style={foodizText.body}>
                Dossier, carte et fluidité des commandes.
              </Text>
            </View>
          </View>
          <View style={styles.planList}>
            <Text style={styles.planItem}>• Carte courte, lisible, avec vos produits les plus rentables.</Text>
            <Text style={styles.planItem}>• Photos nettes et descriptions simples pour réduire les questions.</Text>
            <Text style={styles.planItem}>• Commandes acceptées vite : c’est le premier luxe Foodiz.</Text>
          </View>
        </FoodizCard>

        <View style={styles.actions}>
          <FoodizActionCard
            icon="🔔"
            title="Commandes"
            description="Acceptez, préparez et signalez les commandes prêtes."
            badge={metrics.current > 0 ? String(metrics.current) : undefined}
            onPress={() => router.push('/partner/orders')}
          />
          <FoodizActionCard
            icon="🍱"
            title="Carte"
            description="Ajoutez vos produits, ajustez vos prix et masquez les indisponibles."
            onPress={() => router.push('/partner/products')}
          />
          <FoodizActionCard
            icon="🛡️"
            title="Dossier & conformité"
            description="Suivez la validation de votre établissement et vos justificatifs."
            onPress={() => router.push('/partner/account')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, gap: 18, padding: 24 },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  actions: { gap: 10 },
  planList: {
    gap: 8,
    marginTop: 12,
  },
  readinessRow: {
    alignItems: 'center',
    borderColor: 'rgba(216,168,79,0.18)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 14,
    padding: 14,
  },
  readinessValue: {
    color: colors.gold,
    fontSize: 34,
    fontStyle: 'italic',
    fontWeight: '900',
  },
  readinessTextBlock: {
    flex: 1,
  },
  readinessLabel: {
    color: colors.cream,
    fontSize: 14,
    fontWeight: '800',
  },
  planItem: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  metric: { color: colors.cream, fontSize: 34, fontWeight: '900' },
});
