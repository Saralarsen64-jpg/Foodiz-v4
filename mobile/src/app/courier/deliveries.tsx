import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  WeelloBrand,
  WeelloButton,
  WeelloCard,
  WeelloHero,
  WeelloMetric,
  WeelloPill,
  weelloText,
} from '@/components/weello-ui';
import { weelloApi } from '@/lib/api';
import { colors } from '@/theme/colors';
import { updateCourierPresence } from '@/lib/courier-presence';

type Delivery = {
  id: string;
  delivery_fee_cents: number;
  courier_earnings_cents: number;
  courier_prime_fund_cents: number;
  estimated_time_mins: number | null;
  item_count: number;
  distance_km: number | null;
  pickup_distance_km: number | null;
  pickup_time_mins: number | null;
  restaurant: {
    name: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
  };
};

export default function CourierDeliveriesScreen() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      await updateCourierPresence(true);
      const data = await weelloApi<{ deliveries: Delivery[] }>('courier-deliveries');
      setDeliveries(data.deliveries);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chargement impossible';
      if (message !== 'COURIER_NOT_AVAILABLE') {
        Alert.alert('Livraisons indisponibles', message);
      }
      setDeliveries([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void updateCourierPresence(true)
      .then(() => weelloApi<{ deliveries: Delivery[] }>('courier-deliveries'))
      .then((data) => {
        if (active) setDeliveries(data.deliveries);
      })
      .catch(() => {
        if (active) setDeliveries([]);
      });
    return () => {
      active = false;
    };
  }, []);

  async function claim(orderId: string) {
    try {
      await weelloApi<{ orderId: string }>('courier-deliveries', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      });
      Alert.alert('Course acceptée', 'La livraison vous a été attribuée.');
      router.push({ pathname: '/courier/current', params: { orderId } });
    } catch (error) {
      Alert.alert(
        'Course indisponible',
        error instanceof Error ? error.message : 'Cette course a déjà été prise.',
      );
    }
  }

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.gold} />
        }>
        <WeelloBrand subtitle="Courses disponibles" />
        <WeelloHero
          eyebrow="Dispatch Weello"
          title="Choisissez votre prochaine course"
          body="Les courses sont proposées selon votre validation, votre position récente et la disponibilité réelle autour de vous.">
          <View style={styles.metrics}>
            <WeelloMetric
              label="Disponibles"
              value={deliveries.length}
              helper="à proximité"
              tone={deliveries.length > 0 ? 'success' : 'muted'}
            />
          </View>
        </WeelloHero>

        {deliveries.length === 0 ? (
          <WeelloCard>
            <Text style={weelloText.heading}>Aucune course disponible</Text>
            <Text style={weelloText.body}>
              Passez en ligne et tirez vers le bas pour actualiser.
            </Text>
          </WeelloCard>
        ) : (
          deliveries.map((delivery) => (
            <WeelloCard key={delivery.id}>
              <View style={styles.cardHeader}>
                <WeelloPill label="Nouvelle course" tone="success" />
                <Text style={styles.price}>
                  {(
                    (delivery.delivery_fee_cents +
                      delivery.courier_earnings_cents +
                      delivery.courier_prime_fund_cents) /
                    100
                  ).toFixed(2)} €
                </Text>
              </View>
              <Text style={weelloText.heading}>
                {delivery.restaurant.name || 'Établissement Weello'}
              </Text>
              <Text style={weelloText.body}>
                {[delivery.restaurant.address, delivery.restaurant.city]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={weelloText.body}>
                {delivery.item_count} article(s) ·{' '}
                {delivery.pickup_distance_km === null
                  ? 'distance de retrait à confirmer'
                  : `${delivery.pickup_distance_km.toFixed(1)} km jusqu’au restaurant`}
              </Text>
              <Text style={weelloText.body}>
                {delivery.pickup_time_mins === null
                  ? 'Temps de retrait à confirmer'
                  : `${delivery.pickup_time_mins} min jusqu’au retrait`}
                {' · '}
                {delivery.estimated_time_mins === null
                  ? 'livraison à confirmer'
                  : `${delivery.estimated_time_mins} min de livraison`}
              </Text>
              <WeelloButton
                label="Accepter la course"
                onPress={() => void claim(delivery.id)}
              />
            </WeelloCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    gap: 18,
    padding: 24,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  price: {
    color: colors.gold,
    fontSize: 21,
    fontWeight: '900',
  },
});
