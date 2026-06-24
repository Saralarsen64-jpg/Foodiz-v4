import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  FoodizBrand,
  FoodizButton,
  FoodizCard,
  FoodizHero,
  FoodizMetric,
  FoodizPill,
  foodizText,
} from '@/components/foodiz-ui';
import { foodizApi } from '@/lib/api';
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
      const data = await foodizApi<{ deliveries: Delivery[] }>('courier-deliveries');
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
      .then(() => foodizApi<{ deliveries: Delivery[] }>('courier-deliveries'))
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
      await foodizApi<{ orderId: string }>('courier-deliveries', {
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
        <FoodizBrand subtitle="Courses disponibles" />
        <FoodizHero
          eyebrow="Dispatch Foodiz"
          title="Choisissez votre prochaine course"
          body="Les courses sont proposées selon votre validation, votre position récente et la disponibilité réelle autour de vous.">
          <View style={styles.metrics}>
            <FoodizMetric
              label="Disponibles"
              value={deliveries.length}
              helper="à proximité"
              tone={deliveries.length > 0 ? 'success' : 'muted'}
            />
          </View>
        </FoodizHero>

        {deliveries.length === 0 ? (
          <FoodizCard>
            <Text style={foodizText.heading}>Aucune course disponible</Text>
            <Text style={foodizText.body}>
              Passez en ligne et tirez vers le bas pour actualiser.
            </Text>
          </FoodizCard>
        ) : (
          deliveries.map((delivery) => (
            <FoodizCard key={delivery.id}>
              <View style={styles.cardHeader}>
                <FoodizPill label="Nouvelle course" tone="success" />
                <Text style={styles.price}>
                  {(
                    (delivery.delivery_fee_cents +
                      delivery.courier_earnings_cents +
                      delivery.courier_prime_fund_cents) /
                    100
                  ).toFixed(2)} €
                </Text>
              </View>
              <Text style={foodizText.heading}>
                {delivery.restaurant.name || 'Établissement Foodiz'}
              </Text>
              <Text style={foodizText.body}>
                {[delivery.restaurant.address, delivery.restaurant.city]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={foodizText.body}>
                {delivery.item_count} article(s) ·{' '}
                {delivery.pickup_distance_km === null
                  ? 'distance de retrait à confirmer'
                  : `${delivery.pickup_distance_km.toFixed(1)} km jusqu’au restaurant`}
              </Text>
              <Text style={foodizText.body}>
                {delivery.pickup_time_mins === null
                  ? 'Temps de retrait à confirmer'
                  : `${delivery.pickup_time_mins} min jusqu’au retrait`}
                {' · '}
                {delivery.estimated_time_mins === null
                  ? 'livraison à confirmer'
                  : `${delivery.estimated_time_mins} min de livraison`}
              </Text>
              <FoodizButton
                label="Accepter la course"
                onPress={() => void claim(delivery.id)}
              />
            </FoodizCard>
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
