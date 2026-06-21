import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FoodizBrand,
  FoodizCard,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { foodizApi } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';
import { colors } from '@/theme/colors';

type Restaurant = {
  id: string;
  name: string;
  cuisine_type: string | null;
  city: string | null;
  address: string | null;
};

export default function ClientHomeScreen() {
  const { profile } = useAuth();
  const { itemCount, subtotalCents } = useCart();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    let active = true;
    void foodizApi<{ restaurants: Restaurant[] }>('client-catalog')
      .then((data) => {
        if (active) setRestaurants(data.restaurants);
      })
      .catch(() => {
        if (active) setRestaurants([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <FoodizScreen>
      <FoodizBrand />
      <View>
        <Text style={foodizText.title}>
          Bonjour {profile?.first_name || 'Foodie'} 👋
        </Text>
        <Text style={foodizText.body}>
          Une sélection locale, livrée avec l’exigence Foodiz.
        </Text>
      </View>

      {itemCount > 0 ? (
        <Pressable onPress={() => router.push('/client/cart')}>
          <FoodizCard>
            <Text style={styles.kicker}>VOTRE PANIER</Text>
            <Text style={styles.points}>{itemCount} article(s)</Text>
            <Text style={foodizText.body}>
              Sous-total articles {(subtotalCents / 100).toFixed(2)} €
            </Text>
          </FoodizCard>
        </Pressable>
      ) : null}

      <Text style={foodizText.heading}>Établissements</Text>
      {restaurants.length === 0 ? (
        <FoodizCard>
          <Text style={foodizText.body}>Aucun établissement actif pour le moment.</Text>
        </FoodizCard>
      ) : (
        restaurants.map((restaurant) => (
          <Pressable
            key={restaurant.id}
            onPress={() =>
              router.push({
                pathname: '/client/restaurant/[id]',
                params: { id: restaurant.id },
              })
            }>
            <FoodizCard>
              <Text style={foodizText.heading}>{restaurant.name}</Text>
              <Text style={foodizText.body}>
                {[restaurant.cuisine_type, restaurant.city]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={styles.discover}>Découvrir la carte →</Text>
            </FoodizCard>
          </Pressable>
        ))
      )}
    </FoodizScreen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  points: {
    color: colors.cream,
    fontSize: 28,
    fontWeight: '900',
  },
  discover: {
    color: colors.gold,
    fontWeight: '800',
  },
});
