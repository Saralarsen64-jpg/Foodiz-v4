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
} from 'react-native';

import {
  FoodizButton,
  FoodizCard,
  FoodizScreen,
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

export default function CurrentDeliveryScreen() {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const { session } = useAuth();
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const [step, setStep] = useState<DeliveryStep>('accepted');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);

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
      const { data: tracking } = await supabase
        .from('delivery_tracking')
        .select('status')
        .eq('order_id', normalized.id)
        .maybeSingle();
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
          void supabase
            .from('delivery_tracking')
            .update({
              current_latitude: position.coords.latitude,
              current_longitude: position.coords.longitude,
              current_location_name: 'Position GPS du livreur',
              updated_at: new Date().toISOString(),
            })
            .eq('order_id', order.id);
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
      const orderStatus =
        next === 'picked_up'
          ? 'picked_up'
          : next === 'in_transit' || next === 'at_customer'
            ? 'delivering'
            : null;

      if (orderStatus && orderStatus !== order.status) {
        const { error } = await supabase
          .from('orders')
          .update({ status: orderStatus })
          .eq('id', order.id);
        if (error) throw error;
        setOrder({ ...order, status: orderStatus });
      }

      const { error } = await supabase
        .from('delivery_tracking')
        .update({
          status: next,
          ...(next === 'picked_up'
            ? { pickup_at: new Date().toISOString() }
            : {}),
        })
        .eq('order_id', order.id);
      if (error) throw error;
      setStep(next);
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

  return (
    <FoodizScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Tableau de bord</Text>
      </Pressable>
      <Text style={styles.kicker}>COURSE #{order.id.slice(0, 8)}</Text>
      <Text style={foodizText.title}>{steps[index]?.label}</Text>
      <Text style={styles.earnings}>Gain prévu : {(earnings / 100).toFixed(2)} €</Text>

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
  kicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  earnings: { color: colors.success, fontSize: 18, fontWeight: '900' },
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
});
