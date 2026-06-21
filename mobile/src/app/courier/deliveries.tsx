import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import {
  FoodizBrand,
  FoodizButton,
  FoodizCard,
  foodizText,
} from '@/components/foodiz-ui';
import { foodizApi } from '@/lib/api';
import { colors } from '@/theme/colors';

type Delivery = {
  id: string;
  delivery_fee_cents: number;
  courier_earnings_cents: number;
  courier_prime_fund_cents: number;
  estimated_time_mins: number | null;
  item_count: number;
  distance_km: number | null;
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
    void foodizApi<{ deliveries: Delivery[] }>('courier-deliveries')
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
                {delivery.distance_km === null
                  ? 'distance à confirmer'
                  : `${delivery.distance_km.toFixed(1)} km`}
              </Text>
              <Text style={[foodizText.heading, foodizText.gold]}>
                {(
                  (delivery.delivery_fee_cents +
                    delivery.courier_earnings_cents +
                    delivery.courier_prime_fund_cents) /
                  100
                ).toFixed(2)}{' '}
                €
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
});
