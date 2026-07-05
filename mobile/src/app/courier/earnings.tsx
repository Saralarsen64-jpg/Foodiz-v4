import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  WeelloBrand,
  WeelloCard,
  weelloText,
} from '@/components/weello-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

type DeliveredOrder = {
  id: string;
  delivered_at: string | null;
  delivery_fee_cents: number;
  courier_earnings_cents: number;
  courier_prime_fund_cents: number;
  courier_delay_penalty_cents: number;
  restaurant: { name: string | null } | null;
};

async function fetchDeliveredOrders(userId: string) {
  const { data } = await supabase
    .from('orders')
    .select(
      'id,delivered_at,delivery_fee_cents,courier_earnings_cents,courier_prime_fund_cents,courier_delay_penalty_cents,restaurant:restaurants(name)',
    )
    .eq('courier_id', userId)
    .eq('status', 'delivered')
    .order('delivered_at', { ascending: false })
    .limit(50);
  return (data || []) as unknown as DeliveredOrder[];
}

export default function CourierEarningsScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [orders, setOrders] = useState<DeliveredOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!userId) return;
    setRefreshing(true);
    setOrders(await fetchDeliveredOrders(userId));
    setRefreshing(false);
  }

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchDeliveredOrders(userId).then((data) => {
      if (active) setOrders(data);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const totals = useMemo(
    () =>
      orders.reduce(
        (result, order) => {
          const gross =
            order.delivery_fee_cents
            + order.courier_earnings_cents
            + order.courier_prime_fund_cents;
          return {
            gross: result.gross + gross,
            penalties:
              result.penalties + (order.courier_delay_penalty_cents || 0),
          };
        },
        { gross: 0, penalties: 0 },
      ),
    [orders],
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
        <WeelloBrand subtitle="Revenus livreur" />
        <WeelloCard>
          <Text style={styles.kicker}>SOLDE DES LIVRAISONS AFFICHÉES</Text>
          <Text style={weelloText.title}>
            {((totals.gross - totals.penalties) / 100).toFixed(2)} €
          </Text>
          <Text style={weelloText.body}>
            Brut {(totals.gross / 100).toFixed(2)} € · pénalités{' '}
            {(totals.penalties / 100).toFixed(2)} €
          </Text>
        </WeelloCard>

        {orders.length === 0 ? (
          <WeelloCard>
            <Text style={weelloText.heading}>Aucune livraison terminée</Text>
            <Text style={weelloText.body}>
              Vos gains apparaîtront ici après vos premières courses.
            </Text>
          </WeelloCard>
        ) : (
          orders.map((order) => {
            const gross =
              order.delivery_fee_cents
              + order.courier_earnings_cents
              + order.courier_prime_fund_cents;
            return (
              <WeelloCard key={order.id}>
                <View style={styles.row}>
                  <View style={styles.orderText}>
                    <Text style={weelloText.heading}>
                      {order.restaurant?.name || 'Livraison Weello'}
                    </Text>
                    <Text style={weelloText.body}>
                      {order.delivered_at
                        ? new Date(order.delivered_at).toLocaleDateString('fr-FR')
                        : `#${order.id.slice(0, 8)}`}
                    </Text>
                  </View>
                  <Text style={styles.amount}>
                    {(
                      (gross - (order.courier_delay_penalty_cents || 0))
                      / 100
                    ).toFixed(2)}{' '}
                    €
                  </Text>
                </View>
                {order.courier_delay_penalty_cents > 0 ? (
                  <Text style={styles.penalty}>
                    Retard : −
                    {(order.courier_delay_penalty_cents / 100).toFixed(2)} €
                  </Text>
                ) : null}
              </WeelloCard>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, gap: 18, padding: 24 },
  kicker: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderText: { flex: 1, gap: 4 },
  amount: { color: colors.success, fontWeight: '900', fontSize: 18 },
  penalty: { color: colors.danger, fontWeight: '800' },
});
