import { type Href, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  WeelloActionCard,
  WeelloCard,
  WeelloBlackMasthead,
  WeelloPill,
  WeelloSectionTitle,
  weelloText,
} from '@/components/weello-ui';
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
  client_id: string;
  created_at: string;
  delivered_at: string | null;
};

type PartnerSubscription = {
  status: string;
  campaigns_used_period: number;
  plan: {
    name: string;
    monthly_price_cents: number;
    monthly_campaign_limit: number;
  } | null;
};

async function fetchPartnerDashboard(userId: string) {
  const { data: establishment } = await supabase
    .from('restaurants')
    .select('id,name,city,status,is_active')
    .eq('owner_id', userId)
    .maybeSingle();
  if (!establishment) {
    return {
      restaurant: null,
      orders: [] as PartnerOrder[],
      productsCount: 0,
      subscription: null as PartnerSubscription | null,
    };
  }

  const [ordersResult, productsResult, subscriptionResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id,status,partner_total_cents,client_id,created_at,delivered_at')
      .eq('restaurant_id', establishment.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', establishment.id),
    supabase
      .from('partner_subscriptions')
      .select('status,campaigns_used_period,plan:foodiz_plus_plans(name,monthly_price_cents,monthly_campaign_limit)')
      .eq('restaurant_id', establishment.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    restaurant: establishment as Restaurant,
    orders: (ordersResult.data || []) as PartnerOrder[],
    productsCount: productsResult.count || 0,
    subscription: (subscriptionResult.data || null) as unknown as PartnerSubscription | null,
  };
}

export default function PartnerDashboardScreen() {
  const { profile, session } = useAuth();
  const userId = session?.user.id;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [productsCount, setProductsCount] = useState(0);
  const [subscription, setSubscription] = useState<PartnerSubscription | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  function applyDashboard(data: Awaited<ReturnType<typeof fetchPartnerDashboard>>) {
    setRestaurant(data.restaurant);
    setOrders(data.orders);
    setProductsCount(data.productsCount || 0);
    setSubscription(data.subscription);
  }

  async function load() {
    if (!userId) return;
    setRefreshing(true);
    applyDashboard(await fetchPartnerDashboard(userId));
    setRefreshing(false);
  }

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchPartnerDashboard(userId).then((data) => {
      if (active) applyDashboard(data);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const metrics = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const deliveredRecent = orders.filter(
      (order) =>
        order.status === 'delivered'
        && new Date(order.delivered_at || order.created_at) >= sevenDaysAgo,
    );
    const revenue = deliveredRecent.reduce(
      (total, order) => total + Number(order.partner_total_cents || 0),
      0,
    );
    return {
      current: orders.filter((order) =>
        ['pending', 'preparing', 'ready'].includes(order.status),
      ).length,
      revenue,
      recentOrders: deliveredRecent.length,
      customers: new Set(deliveredRecent.map((order) => order.client_id)).size,
      average: deliveredRecent.length ? Math.round(revenue / deliveredRecent.length) : 0,
    };
  }, [orders]);

  const activeLabel = restaurant?.is_active ? 'Actif' : 'Non visible';
  const statusTone = restaurant?.is_active
    ? 'success'
    : restaurant
      ? 'muted'
      : 'danger';

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
        <WeelloBlackMasthead compact />

        <View style={styles.partnerHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(restaurant?.name || profile?.first_name || 'P').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={styles.partnerHeaderText}>
            <Text style={styles.greeting}>
              Bonjour, {restaurant?.name || profile?.first_name || 'Partenaire'} 👋
            </Text>
            <Text style={restaurant?.is_active ? styles.active : styles.inactive}>
              ● {restaurant?.is_active ? 'Partenaire actif' : 'Activation en attente'}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/support' as Href)} style={styles.headerAction}>
            <Text style={styles.headerActionText}>?</Text>
          </Pressable>
        </View>

        <WeelloCard>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Aperçu de votre activité</Text>
            <WeelloPill label="7 derniers jours" tone="muted" />
          </View>
          <View style={styles.overviewGrid}>
            {[
              ['Chiffre d’affaires', `${(metrics.revenue / 100).toFixed(2)} €`],
              ['Commandes', String(metrics.recentOrders)],
              ['Clients', String(metrics.customers)],
              ['Panier moyen', `${(metrics.average / 100).toFixed(2)} €`],
            ].map(([label, value]) => (
              <View key={label} style={styles.overviewMetric}>
                <Text style={styles.metricLabel}>{label}</Text>
                <Text style={styles.metricValue}>{value}</Text>
              </View>
            ))}
          </View>
        </WeelloCard>

        <View style={styles.actions}>
          <WeelloActionCard
            icon="🔔"
            title="Mes commandes"
            description="Acceptez, préparez et signalez les commandes prêtes."
            badge={metrics.current > 0 ? String(metrics.current) : undefined}
            onPress={() => router.push('/partner/orders')}
          />
          <WeelloActionCard
            icon="🍱"
            title="Ma boutique"
            description={`${productsCount} produit(s) · ajoutez des offres et gérez les indisponibles.`}
            onPress={() => router.push('/partner/products')}
          />
          <WeelloActionCard
            icon="🛡️"
            title="Dossier & conformité"
            description="Suivez la validation de votre établissement et vos justificatifs."
            onPress={() => router.push('/partner/account')}
          />
          <WeelloActionCard
            icon="?"
            title="Aide"
            description="Contactez le centre d’aide et suivez vos demandes."
            onPress={() => router.push('/support' as Href)}
          />
        </View>

        <WeelloCard>
          <Text style={styles.visibilityTitle}>Développez votre visibilité</Text>
          <Text style={styles.visibilityBody}>
            Soignez vos photos, activez vos offres et pilotez votre carte pour attirer plus de clients.
          </Text>
          <Pressable onPress={() => router.push('/partner/products')}>
            <Text style={styles.visibilityCta}>Créer une offre →</Text>
          </Pressable>
        </WeelloCard>

        <WeelloSectionTitle
          title="Vos dernières commandes"
          action={
            <Pressable onPress={() => router.push('/partner/orders')}>
              <Text style={styles.link}>Voir toutes ›</Text>
            </Pressable>
          }
        />
        {orders.length === 0 ? (
          <WeelloCard>
            <Text style={weelloText.body}>Aucune commande enregistrée.</Text>
          </WeelloCard>
        ) : (
          orders.slice(0, 3).map((order) => (
            <Pressable key={order.id} onPress={() => router.push('/partner/orders')}>
              <WeelloCard>
                <View style={styles.orderRow}>
                  <View style={styles.orderText}>
                    <Text style={styles.orderNumber}>
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <Text style={weelloText.body}>
                      {new Date(order.created_at).toLocaleString('fr-FR')}
                    </Text>
                  </View>
                  <View style={styles.orderStatus}>
                    <WeelloPill
                      label={order.status}
                      tone={order.status === 'delivered' ? 'success' : 'gold'}
                    />
                    <Text style={styles.orderAmount}>
                      {(order.partner_total_cents / 100).toFixed(2)} €
                    </Text>
                  </View>
                </View>
              </WeelloCard>
            </Pressable>
          ))
        )}

        <WeelloSectionTitle title="Votre abonnement" />
        <WeelloCard>
          <View style={styles.subscriptionHeader}>
            <View style={styles.subscriptionText}>
              <Text style={styles.subscriptionName}>
                {subscription?.plan?.name || 'Aucun pack actif'}
              </Text>
              <Text style={weelloText.body}>
                {subscription?.plan
                  ? `${(subscription.plan.monthly_price_cents / 100).toFixed(2)} €/mois`
                  : 'Les packs marketing restent optionnels.'}
              </Text>
            </View>
            <WeelloPill
              label={subscription ? subscription.status : activeLabel}
              tone={subscription ? 'success' : statusTone}
            />
          </View>
          {subscription?.plan ? (
            <Text style={styles.subscriptionUsage}>
              {subscription.campaigns_used_period}/{subscription.plan.monthly_campaign_limit}{' '}
              campagnes utilisées
            </Text>
          ) : (
            <Text style={weelloText.body}>
              Votre boutique, vos commandes et vos règlements restent accessibles sans pack.
            </Text>
          )}
        </WeelloCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, gap: 18, padding: 24 },
  partnerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 13,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  avatarText: {
    color: colors.goldLight,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 25,
  },
  partnerHeaderText: { flex: 1 },
  greeting: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 21,
  },
  active: { color: colors.success, fontSize: 12, marginTop: 5 },
  inactive: { color: colors.gold, fontSize: 12, marginTop: 5 },
  headerAction: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerActionText: { color: colors.gold, fontSize: 18, fontWeight: '900' },
  overviewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewTitle: {
    color: colors.goldLight,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 22,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  overviewMetric: {
    borderColor: 'rgba(216,168,79,.12)',
    borderRadius: 16,
    borderWidth: 1,
    minWidth: '47%',
    padding: 13,
  },
  metricLabel: { color: colors.muted, fontSize: 10 },
  metricValue: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    marginTop: 7,
  },
  actions: { gap: 10 },
  visibilityTitle: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 29,
  },
  visibilityBody: {
    color: colors.goldLight,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 21,
  },
  visibilityCta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: 12,
    color: colors.black,
    fontWeight: '900',
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  link: {
    color: colors.goldLight,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  orderRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  orderText: { flex: 1 },
  orderNumber: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 17,
  },
  orderStatus: { alignItems: 'flex-end', gap: 7 },
  orderAmount: {
    color: colors.goldLight,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
  },
  subscriptionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  subscriptionText: { flex: 1 },
  subscriptionName: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
  },
  subscriptionUsage: {
    color: colors.goldLight,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
});
