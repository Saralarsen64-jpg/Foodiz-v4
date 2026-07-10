import { useEffect, useMemo, useState } from 'react';
import { type Href, router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import {
  WeelloActionCard,
  WeelloButton,
  WeelloCard,
  WeelloBlackMasthead,
  WeelloPill,
  WeelloSectionTitle,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { weelloApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';
import { updateCourierPresence } from '@/lib/courier-presence';

type DeliveredOrder = {
  id: string;
  delivered_at: string | null;
  delivery_fee_cents: number;
  courier_earnings_cents: number;
  courier_prime_fund_cents: number;
  courier_delay_penalty_cents: number;
};

type Delivery = {
  id: string;
  delivery_fee_cents: number;
  courier_earnings_cents: number;
  courier_prime_fund_cents: number;
  estimated_time_mins: number | null;
  distance_km: number | null;
  restaurant: {
    name: string | null;
    address: string | null;
    city: string | null;
  };
};

export default function CourierDashboardScreen() {
  const { profile, session } = useAuth();
  const [applicationStatus, setApplicationStatus] = useState('pending');
  const [documentStatus, setDocumentStatus] = useState('documents_required');
  const [online, setOnline] = useState(false);
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    if (!session?.user.id) return;
    void Promise.all([
      supabase
        .from('courier_applications')
        .select('status,document_review_status')
        .eq('user_id', session.user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('courier_online')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('orders')
        .select('id,delivered_at,delivery_fee_cents,courier_earnings_cents,courier_prime_fund_cents,courier_delay_penalty_cents')
        .eq('courier_id', session.user.id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(100),
    ]).then(([application, courierProfile, completed]) => {
      setApplicationStatus(application.data?.status || 'pending');
      setDocumentStatus(application.data?.document_review_status || 'documents_required');
      setOnline(Boolean(courierProfile.data?.courier_online));
      setDeliveredOrders((completed.data || []) as DeliveredOrder[]);
    });
  }, [session?.user.id]);

  useEffect(() => {
    if (!online) return;
    let active = true;
    void weelloApi<{ deliveries: Delivery[] }>('courier-deliveries')
      .then((data) => {
        if (active) setDeliveries(data.deliveries || []);
      })
      .catch(() => {
        if (active) setDeliveries([]);
      });
    return () => {
      active = false;
    };
  }, [online]);

  async function toggleOnline() {
    if (
      !session?.user.id
      || applicationStatus !== 'validated'
      || documentStatus !== 'approved'
    ) {
      Alert.alert(
        'Compte en attente',
        'Votre dossier doit être validé par Weello avant de recevoir des livraisons.',
      );
      return;
    }

    const nextOnline = !online;
    try {
      await updateCourierPresence(nextOnline);
    } catch (error) {
      Alert.alert(
        'Mise à jour impossible',
        error instanceof Error ? error.message : 'Position indisponible.',
      );
      return;
    }
    setOnline(nextOnline);
    if (!nextOnline) setDeliveries([]);
  }

  async function acceptDelivery(orderId: string) {
    try {
      await weelloApi('courier-deliveries', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      });
      router.push({ pathname: '/courier/current', params: { orderId } });
    } catch (error) {
      Alert.alert(
        'Course indisponible',
        error instanceof Error ? error.message : 'Cette course a déjà été attribuée.',
      );
    }
  }

  const validated = applicationStatus === 'validated' && documentStatus === 'approved';
  const statusLabel = validated
    ? online
      ? 'En ligne'
      : 'Validé'
    : 'En vérification';
  const performance = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = deliveredOrders.filter((order) =>
      new Date(order.delivered_at || 0) >= start,
    );
    const total = (orders: DeliveredOrder[]) => orders.reduce((sum, order) =>
      sum
      + Number(order.delivery_fee_cents || 0)
      + Number(order.courier_earnings_cents || 0)
      + Number(order.courier_prime_fund_cents || 0)
      - Number(order.courier_delay_penalty_cents || 0), 0);
    const prime = today.reduce(
      (sum, order) => sum + Number(order.courier_prime_fund_cents || 0),
      0,
    );
    const onTime = deliveredOrders.length
      ? Math.round(
          deliveredOrders.filter((order) => !order.courier_delay_penalty_cents).length
          / deliveredOrders.length
          * 100,
        )
      : 0;
    return {
      todayCount: today.length,
      todayCents: total(today),
      primeCents: prime,
      totalCount: deliveredOrders.length,
      onTime,
    };
  }, [deliveredOrders]);
  const nextDelivery = deliveries[0] || null;

  return (
    <WeelloScreen>
      <WeelloBlackMasthead compact />

      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.first_name || 'L').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.greeting}>Bonjour, {profile?.first_name || 'Livreur'}</Text>
          <Text style={[styles.onlineLabel, online && styles.onlineLabelActive]}>
            ● {statusLabel}
          </Text>
        </View>
        <Pressable onPress={() => router.push('/support' as Href)} style={styles.headerAction}>
          <Text style={styles.headerActionText}>?</Text>
        </Pressable>
      </View>

      <WeelloCard>
        <View style={styles.statusRow}>
          <View style={styles.statusText}>
            <Text style={styles.availabilityTitle}>
              {online ? 'Vous êtes disponible pour livrer' : 'Vous êtes hors ligne'}
            </Text>
            <Text style={weelloText.body}>
              {validated
                ? online
                  ? 'Recevez les commandes autour de vous.'
                  : 'Activez votre disponibilité pour recevoir des courses.'
                : 'Votre dossier doit encore être validé.'}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={() => void toggleOnline()}
            disabled={!validated}
            trackColor={{ false: colors.surfaceRaised, true: colors.gold }}
            thumbColor={colors.cream}
          />
        </View>
      </WeelloCard>

      <WeelloSectionTitle
        title="Vos gains du jour"
        action={<Pressable onPress={() => router.push('/courier/earnings')}><Text style={styles.link}>Voir le détail ›</Text></Pressable>}
      />
      <WeelloCard>
        <View style={styles.metricGrid}>
          {[
            ['Livraisons', String(performance.todayCount), 'terminées'],
            ['Gains', `${(performance.todayCents / 100).toFixed(2)} €`, 'aujourd’hui'],
            ['Primes', `${(performance.primeCents / 100).toFixed(2)} €`, 'incluses'],
          ].map(([label, value, helper]) => (
            <View key={label} style={styles.metricBlock}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text style={styles.metricValue}>{value}</Text>
              <Text style={styles.metricHelper}>{helper}</Text>
            </View>
          ))}
        </View>
      </WeelloCard>

      <WeelloSectionTitle title="Prochaine livraison" />
      {nextDelivery ? (
        <WeelloCard>
          <View style={styles.deliveryRow}>
            <View style={styles.deliveryInfo}>
              <WeelloPill label="Nouvelle course" />
              <Text style={styles.deliveryTitle}>
                {nextDelivery.restaurant.name || 'Établissement Weello'}
              </Text>
              <Text style={weelloText.body}>
                {[nextDelivery.restaurant.address, nextDelivery.restaurant.city]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={weelloText.body}>
                {nextDelivery.estimated_time_mins
                  ? `${nextDelivery.estimated_time_mins} min estimées`
                  : 'Durée à confirmer'}
                {nextDelivery.distance_km ? ` · ${nextDelivery.distance_km.toFixed(1)} km` : ''}
              </Text>
            </View>
            <Text style={styles.deliveryPrice}>
              {(
                (
                  nextDelivery.delivery_fee_cents
                  + nextDelivery.courier_earnings_cents
                  + nextDelivery.courier_prime_fund_cents
                ) / 100
              ).toFixed(2)} €
            </Text>
          </View>
          <WeelloButton
            label="Accepter la livraison"
            onPress={() => void acceptDelivery(nextDelivery.id)}
          />
        </WeelloCard>
      ) : (
        <WeelloCard>
          <Text style={weelloText.heading}>
            {online ? 'Recherche de courses…' : 'Passez en ligne pour recevoir une course'}
          </Text>
          <Text style={weelloText.body}>
            Les propositions disponibles apparaîtront ici en priorité.
          </Text>
        </WeelloCard>
      )}

      <WeelloSectionTitle title="Vos performances" />
      <View style={styles.performanceGrid}>
        {[
          ['✓', `${performance.onTime}%`, 'Livraisons à l’heure'],
          ['▣', String(performance.totalCount), 'Livraisons totales'],
          ['◆', validated ? 'Validé' : 'En attente', 'Statut du dossier'],
        ].map(([icon, value, label]) => (
          <View key={label} style={styles.performanceCard}>
            <Text style={styles.performanceIcon}>{icon}</Text>
            <Text style={styles.performanceValue}>{value}</Text>
            <Text style={styles.performanceLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <WeelloSectionTitle title="Accès rapides" />
      <View style={styles.actions}>
        <WeelloActionCard
          icon="⚡"
          title="Courses disponibles"
          description="Affiche les commandes prêtes à être attribuées autour de vous."
          badge={online ? 'Live' : undefined}
          onPress={() => router.push('/courier/deliveries')}
        />
        <WeelloActionCard
          icon="🧭"
          title="Course active"
          description="Guidage, étapes sécurisées, code client et mise à jour GPS."
          onPress={() => router.push('/courier/current')}
        />
        <WeelloActionCard
          icon="€"
          title="Gains"
          description="Suivez vos revenus, primes et règlements Weello."
          onPress={() => router.push('/courier/earnings')}
        />
        <WeelloActionCard
          icon="🗓️"
          title="Mes disponibilités"
          description="Mettez à jour vos jours, créneaux et flexibilité."
          onPress={() => router.push('/courier/account')}
        />
      </View>
    </WeelloScreen>
  );
}

const styles = StyleSheet.create({
  profileRow: {
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
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  avatarText: {
    color: colors.goldLight,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
  },
  profileText: {
    flex: 1,
  },
  greeting: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 24,
  },
  onlineLabel: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: 4,
  },
  onlineLabelActive: {
    color: colors.success,
  },
  headerAction: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerActionText: {
    color: colors.gold,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusText: {
    flex: 1,
  },
  availabilityTitle: {
    color: colors.goldLight,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 20,
    marginBottom: 4,
  },
  link: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    color: colors.goldLight,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  metricGrid: {
    flexDirection: 'row',
  },
  metricBlock: {
    alignItems: 'center',
    borderRightColor: 'rgba(216,168,79,.14)',
    borderRightWidth: 1,
    flex: 1,
    paddingHorizontal: 6,
  },
  metricLabel: {
    color: colors.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  metricValue: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 21,
    marginTop: 7,
  },
  metricHelper: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    marginTop: 4,
  },
  deliveryRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  deliveryInfo: {
    flex: 1,
    gap: 7,
  },
  deliveryTitle: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 23,
  },
  deliveryPrice: {
    color: colors.goldLight,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  performanceCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 130,
    padding: 12,
  },
  performanceIcon: {
    color: colors.gold,
    fontSize: 24,
  },
  performanceValue: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    marginTop: 8,
  },
  performanceLabel: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  actions: {
    gap: 10,
  },
});
