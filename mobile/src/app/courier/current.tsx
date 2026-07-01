import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  FoodizButton,
  FoodizCard,
  FoodizScreen,
  FoodizPill,
  foodizText,
} from '@/components/foodiz-ui';
import { foodizApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

type DeliveryStep =
  | 'accepted'
  | 'at_restaurant'
  | 'picked_up'
  | 'in_transit'
  | 'at_customer'
  | 'delivered';

const steps: { key: DeliveryStep; label: string }[] = [
  { key: 'accepted', label: 'Course acceptée' },
  { key: 'at_restaurant', label: 'Arrivé au restaurant' },
  { key: 'picked_up', label: 'Commande récupérée' },
  { key: 'in_transit', label: 'En route vers le client' },
  { key: 'at_customer', label: 'Arrivé chez le client' },
  { key: 'delivered', label: 'Livraison terminée' },
];

type ActiveOrder = {
  id: string;
  status: string;
  delivery_address: string | null;
  client_latitude: number | null;
  client_longitude: number | null;
  delivery_fee_cents: number;
  courier_earnings_cents: number;
  courier_prime_fund_cents: number;
  restaurant: {
    name: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

type DeliveryTracking = {
  status: DeliveryStep | null;
  pickup_at: string | null;
  pickup_expected_arrival_at: string | null;
  pickup_route_duration_seconds: number | null;
  pickup_route_distance_meters: number | null;
  eta_provider: string | null;
  updated_at: string | null;
};

function formatCurrency(cents: number) {
  return `${(Math.max(0, cents) / 100).toFixed(2)} €`;
}

function formatDuration(seconds: number) {
  const absolute = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(absolute / 60);
  const remainingSeconds = absolute % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`;
}

function delayPenaltyCents(delaySeconds: number) {
  if (delaySeconds > 1200) return 200;
  if (delaySeconds > 900) return 100;
  if (delaySeconds >= 600) return 50;
  return 0;
}

function delayStatus(delaySeconds: number) {
  if (delaySeconds > 1200) return 'Retard +20 min';
  if (delaySeconds > 900) return 'Retard +15 min';
  if (delaySeconds >= 600) return 'Retard +10 min';
  if (delaySeconds > 0) return 'Tolérance retard';
  return 'À l’heure';
}

export default function CurrentDeliveryScreen() {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const { session } = useAuth();
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [step, setStep] = useState<DeliveryStep>('accepted');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  async function refreshTracking(orderId: string) {
    const { data } = await supabase
      .from('delivery_tracking')
      .select('status,pickup_at,pickup_expected_arrival_at,pickup_route_duration_seconds,pickup_route_distance_meters,eta_provider,updated_at')
      .eq('order_id', orderId)
      .maybeSingle();
    setTracking((data || null) as DeliveryTracking | null);
    return data as DeliveryTracking | null;
  }

  useEffect(() => {
    if (!session?.user.id) return;
    let active = true;

    void (async () => {
      let query = supabase
        .from('orders')
        .select(
          'id,status,delivery_address,client_latitude,client_longitude,delivery_fee_cents,courier_earnings_cents,courier_prime_fund_cents,restaurant:restaurants(name,address,postal_code,city,latitude,longitude)',
        )
        .eq('courier_id', session.user.id)
        .in('status', ['pickup', 'picked_up', 'delivering']);

      if (params.orderId) query = query.eq('id', params.orderId);
      const { data } = await query.limit(1).maybeSingle();
      if (!active) return;
      if (!data) {
        setOrder(null);
        return;
      }

      const normalized = data as unknown as ActiveOrder;
      const tracking = await refreshTracking(normalized.id);
      if (!active) return;

      setOrder(normalized);
      const trackingStatus = tracking?.status as DeliveryStep | undefined;
      if (steps.some((candidate) => candidate.key === trackingStatus)) {
        setStep(trackingStatus || 'accepted');
      } else if (normalized.status === 'delivering') {
        setStep('in_transit');
      } else if (normalized.status === 'picked_up') {
        setStep('picked_up');
      }
    })();

    return () => {
      active = false;
    };
  }, [params.orderId, session]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!order || step === 'delivered') return;
    let active = true;

    void Location.requestForegroundPermissionsAsync().then(async (permission) => {
      if (!active || permission.status !== 'granted') return;
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 20,
        },
        (position) => {
          void foodizApi('courier-delivery-action', {
            method: 'POST',
            body: JSON.stringify({
              orderId: order.id,
              action: 'location',
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: position.coords.accuracy,
            }),
          }).catch(() => undefined);
        },
      );
    });

    return () => {
      active = false;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [order, step]);

  async function advance() {
    if (!order) return;
    const currentIndex = steps.findIndex((candidate) => candidate.key === step);
    const next = steps[currentIndex + 1]?.key;
    if (!next || next === 'delivered') return;
    setBusy(true);
    try {
      let position: Location.LocationObject | null = null;
      if (next === 'picked_up' || next === 'at_customer') {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          throw new Error('La localisation précise est obligatoire pour cette étape.');
        }
        position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
      }

      const result = await foodizApi<{ expectedArrivalAt?: string | null; routeDurationSeconds?: number | null }>('courier-delivery-action', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          action: next,
          ...(position
            ? {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracyMeters: position.coords.accuracy,
              }
            : {}),
        }),
      });

      const orderStatus =
        next === 'picked_up'
          ? 'picked_up'
          : next === 'in_transit' || next === 'at_customer'
            ? 'delivering'
            : order.status;
      setOrder({ ...order, status: orderStatus });
      setStep(next);
      if (next === 'picked_up') {
        await refreshTracking(order.id);
      } else if (result?.expectedArrivalAt || result?.routeDurationSeconds) {
        await refreshTracking(order.id);
      }
    } catch (error) {
      Alert.alert(
        'Étape impossible',
        error instanceof Error ? error.message : 'Réessayez.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (!order || !/^\d{6}$/.test(code)) {
      Alert.alert('Code invalide', 'Saisissez les 6 chiffres communiqués par le client.');
      return;
    }
    setBusy(true);
    try {
      await foodizApi('verify-delivery-code', {
        method: 'POST',
        body: JSON.stringify({ orderId: order.id, code }),
      });
      setStep('delivered');
      setOrder({ ...order, status: 'delivered' });
    } catch (error) {
      setCode('');
      Alert.alert(
        'Code refusé',
        error instanceof Error ? error.message : 'Code incorrect.',
      );
    } finally {
      setBusy(false);
    }
  }

  function navigateTo(latitude?: number | null, longitude?: number | null) {
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      Alert.alert('Coordonnées indisponibles');
      return;
    }
    void Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    );
  }

  if (!order) {
    return (
      <FoodizScreen>
        <Text style={foodizText.title}>Aucune course active</Text>
        <Text style={foodizText.body}>
          Acceptez une course disponible pour commencer.
        </Text>
        <FoodizButton
          label="Voir les courses"
          onPress={() => router.replace('/courier/deliveries')}
        />
      </FoodizScreen>
    );
  }

  const index = steps.findIndex((candidate) => candidate.key === step);
  const earnings =
    order.delivery_fee_cents +
    order.courier_earnings_cents +
    order.courier_prime_fund_cents;
  const maxDelayPenaltyCents = Math.min(200, earnings);
  const expectedArrivalMs = tracking?.pickup_expected_arrival_at
    ? new Date(tracking.pickup_expected_arrival_at).getTime()
    : null;
  const hasRegulatedTimer = ['picked_up', 'in_transit', 'at_customer'].includes(step)
    && typeof expectedArrivalMs === 'number'
    && Number.isFinite(expectedArrivalMs);
  const delaySeconds = hasRegulatedTimer
    ? Math.max(0, Math.floor((now - expectedArrivalMs!) / 1000))
    : 0;
  const remainingSeconds = hasRegulatedTimer
    ? Math.max(0, Math.floor((expectedArrivalMs! - now) / 1000))
    : 0;
  const currentPenalty = delayPenaltyCents(delaySeconds);
  const expectedArrivalLabel = tracking?.pickup_expected_arrival_at
    ? new Date(tracking.pickup_expected_arrival_at).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <FoodizScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Tableau de bord</Text>
      </Pressable>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>COURSE #{order.id.slice(0, 8)}</Text>
        <FoodizPill label={`${index + 1}/${steps.length}`} />
      </View>
      <Text style={foodizText.title}>{steps[index]?.label}</Text>
      <Text style={styles.earnings}>Gain max si à l’heure : {formatCurrency(earnings)}</Text>

      <View style={styles.timeline}>
        {steps.map((candidate, stepIndex) => (
          <View
            key={candidate.key}
            style={[
              styles.timelineDot,
              stepIndex <= index && styles.timelineDotActive,
            ]}
          />
        ))}
      </View>

      {['accepted', 'at_restaurant'].includes(step) ? (
        <FoodizCard>
          <Text style={styles.kicker}>NUMÉRO À PRÉSENTER AU RESTAURANT</Text>
          <Text style={styles.pickupCode}>#{order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={foodizText.body}>
            Présentez ce numéro au partenaire pour récupérer la bonne commande.
            Le chrono de ponctualité démarre uniquement après “Commande récupérée”.
          </Text>
        </FoodizCard>
      ) : null}

      <FoodizCard>
        <View style={styles.moneyGrid}>
          <View style={styles.moneyBox}>
            <Text style={styles.kicker}>GAIN MAX</Text>
            <Text style={styles.moneyValue}>{formatCurrency(earnings)}</Text>
            <Text style={styles.moneyHint}>Si livraison à l’heure</Text>
          </View>
          <View style={styles.moneyBox}>
            <Text style={styles.kicker}>GAIN MINI</Text>
            <Text style={[styles.moneyValue, styles.moneyDanger]}>
              {formatCurrency(earnings - maxDelayPenaltyCents)}
            </Text>
            <Text style={styles.moneyHint}>Si retard maximal appliqué</Text>
          </View>
        </View>
        {hasRegulatedTimer ? (
          <View style={styles.timerBox}>
            <Text style={styles.kicker}>CHRONO RÉGLEMENTÉ</Text>
            <Text style={[styles.timerValue, currentPenalty > 0 && styles.timerLate]}>
              {delaySeconds > 0
                ? `+${formatDuration(delaySeconds)}`
                : formatDuration(remainingSeconds)}
            </Text>
            <Text style={foodizText.body}>
              Arrivée prévue {expectedArrivalLabel || 'en calcul'} · {delayStatus(delaySeconds)}
              {currentPenalty > 0 ? ` · pénalité actuelle -${formatCurrency(currentPenalty)}` : ''}
            </Text>
          </View>
        ) : (
          <Text style={foodizText.body}>
            Le chrono exact et les pénalités éventuelles seront calculés au moment
            où vous confirmez la récupération avec GPS précis.
          </Text>
        )}
        <Text style={styles.moneyHint}>
          Règles Foodiz : +10 min = -0,50 €, +15 min = -1 €, +20 min = -2 € et priorité réduite.
        </Text>
      </FoodizCard>

      <FoodizCard>
        <Text style={styles.kicker}>RÉCUPÉRATION</Text>
        <Text style={foodizText.heading}>{order.restaurant?.name}</Text>
        <Text style={foodizText.body}>
          {[order.restaurant?.address, order.restaurant?.postal_code, order.restaurant?.city]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <FoodizButton
          label="Ouvrir l’itinéraire restaurant"
          onPress={() =>
            navigateTo(order.restaurant?.latitude, order.restaurant?.longitude)
          }
          secondary
        />
      </FoodizCard>

      <FoodizCard>
        <Text style={styles.kicker}>LIVRAISON</Text>
        <Text style={foodizText.heading}>Adresse client</Text>
        <Text style={foodizText.body}>{order.delivery_address}</Text>
        <FoodizButton
          label="Ouvrir l’itinéraire client"
          onPress={() =>
            navigateTo(order.client_latitude, order.client_longitude)
          }
          secondary
        />
      </FoodizCard>

      {step === 'at_customer' ? (
        <FoodizCard>
          <Text style={foodizText.heading}>Code de remise</Text>
          <Text style={foodizText.body}>
            Demandez au client son code personnel à 6 chiffres.
          </Text>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.muted}
            style={styles.code}
          />
          <FoodizButton
            label="Valider la livraison"
            onPress={() => void verifyCode()}
            loading={busy}
          />
        </FoodizCard>
      ) : step === 'delivered' ? (
        <FoodizCard>
          <Text style={foodizText.heading}>Mission accomplie</Text>
          <Text style={foodizText.body}>La remise a été confirmée avec succès.</Text>
          <FoodizButton
            label="Retour aux courses"
            onPress={() => router.replace('/courier/deliveries')}
          />
        </FoodizCard>
      ) : (
        <FoodizButton
          label={steps[index + 1]?.label || 'Continuer'}
          onPress={() => void advance()}
          loading={busy}
        />
      )}
    </FoodizScreen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  kicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  earnings: { color: colors.success, fontSize: 18, fontWeight: '900' },
  timeline: {
    flexDirection: 'row',
    gap: 6,
  },
  timelineDot: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(155,150,141,0.25)',
  },
  timelineDotActive: {
    backgroundColor: colors.gold,
  },
  code: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gold,
    color: colors.cream,
    backgroundColor: colors.black,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 12,
    textAlign: 'center',
  },
  pickupCode: {
    color: colors.cream,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 3,
  },
  moneyGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  moneyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  moneyValue: {
    color: colors.success,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  moneyDanger: {
    color: colors.gold,
  },
  moneyHint: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  timerBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(216,168,79,0.06)',
  },
  timerValue: {
    color: colors.success,
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
  },
  timerLate: {
    color: colors.danger,
  },
});
