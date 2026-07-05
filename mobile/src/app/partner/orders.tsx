import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  WeelloBrand,
  WeelloButton,
  WeelloCard,
  WeelloHero,
  WeelloPill,
  weelloText,
} from '@/components/weello-ui';
import { weelloApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

type PartnerOrder = {
  id: string;
  status: string;
  payment_status: string;
  partner_total_cents: number;
  created_at: string;
  order_items: {
    quantity: number;
    product: { name: string | null } | null;
  }[];
};

async function fetchPartnerOrders(
  userId: string,
  mode: 'current' | 'history',
) {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();
  if (!restaurant) return [] as PartnerOrder[];

  let query = supabase
    .from('orders')
    .select(
      'id,status,payment_status,partner_total_cents,created_at,order_items(quantity,product:products(name))',
    )
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false });
  query =
    mode === 'current'
      ? query
          .eq('payment_status', 'completed')
          .in('status', ['pending', 'preparing', 'ready'])
      : query.in('status', ['delivered', 'cancelled']);
  const { data } = await query.limit(50);
  return (data || []) as unknown as PartnerOrder[];
}

export default function PartnerOrdersScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [mode, setMode] = useState<'current' | 'history'>('current');
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!userId) return;
    setRefreshing(true);
    setOrders(await fetchPartnerOrders(userId, mode));
    setRefreshing(false);
  }

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchPartnerOrders(userId, mode).then((data) => {
      if (active) setOrders(data);
    });
    return () => {
      active = false;
    };
  }, [mode, userId]);

  async function runAction(
    order: PartnerOrder,
    action: 'accept' | 'ready' | 'refuse',
  ) {
    setBusy(order.id);
    try {
      await weelloApi('partner-order-action', {
        method: 'POST',
        body: JSON.stringify({ orderId: order.id, action }),
      });
      await load();
    } catch (error) {
      Alert.alert(
        'Action impossible',
        error instanceof Error ? error.message : 'Réessayez.',
      );
    } finally {
      setBusy(null);
    }
  }

  function refuse(order: PartnerOrder) {
    Alert.alert(
      'Refuser et rembourser cette commande ?',
      'Stripe traitera le remboursement et les avantages seront restitués.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: () => void runAction(order, 'refuse'),
        },
      ],
    );
  }

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
        <WeelloBrand subtitle="Commandes partenaire" />
        <WeelloHero
          eyebrow="Cuisine & timing"
          title="Commandes à piloter"
          body="Acceptez vite, préparez avec précision, puis signalez la commande prête pour déclencher le relais livreur.">
          <View style={styles.heroPills}>
            <WeelloPill label={`${orders.length} commande(s)`} />
            <WeelloPill label={mode === 'current' ? 'En cours' : 'Historique'} tone="muted" />
          </View>
        </WeelloHero>

        <View style={styles.segment}>
          {[
            ['current', 'En cours'],
            ['history', 'Historique'],
          ].map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setMode(value as 'current' | 'history')}
              style={[
                styles.segmentButton,
                mode === value && styles.segmentButtonActive,
              ]}>
              <Text
                style={[
                  styles.segmentText,
                  mode === value && styles.segmentTextActive,
                ]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {orders.length === 0 ? (
          <WeelloCard>
            <Text style={weelloText.heading}>Aucune commande</Text>
            <Text style={weelloText.body}>
              {mode === 'current'
                ? 'Les nouvelles commandes payées apparaîtront ici.'
                : 'Aucune commande terminée ou annulée.'}
            </Text>
          </WeelloCard>
        ) : (
          orders.map((order) => (
            <WeelloCard key={order.id}>
              <View style={styles.row}>
                <View style={styles.orderText}>
                  <Text style={styles.kicker}>
                    COMMANDE #{order.id.slice(0, 8)}
                  </Text>
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
                </View>
                <Text style={styles.amount}>
                  {(order.partner_total_cents / 100).toFixed(2)} €
                </Text>
              </View>
              {order.order_items.map((item, index) => (
                <Text
                  key={`${order.id}-${index}`}
                  style={weelloText.body}>
                  {item.quantity} × {item.product?.name || 'Article'}
                </Text>
              ))}
              {order.status === 'pending' ? (
                <>
                  <WeelloButton
                    label="Accepter et préparer"
                    onPress={() => void runAction(order, 'accept')}
                    loading={busy === order.id}
                  />
                  <WeelloButton
                    label="Refuser et rembourser"
                    onPress={() => refuse(order)}
                    disabled={busy === order.id}
                    secondary
                  />
                </>
              ) : null}
              {order.status === 'preparing' ? (
                <WeelloButton
                  label="Commande prête"
                  onPress={() => void runAction(order, 'ready')}
                  loading={busy === order.id}
                />
              ) : null}
            </WeelloCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, gap: 18, padding: 24 },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 11,
  },
  segmentButtonActive: { backgroundColor: colors.gold },
  segmentText: { color: colors.muted, fontWeight: '800' },
  segmentTextActive: { color: colors.black },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderText: { flex: 1, gap: 4 },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  amount: { color: colors.gold, fontWeight: '900', fontSize: 18 },
});
