import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FoodizActionCard,
  FoodizBrand,
  FoodizCard,
  FoodizHero,
  FoodizMetric,
  FoodizPill,
  FoodizScreen,
  FoodizSectionTitle,
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bel après-midi';
  return 'Bonsoir';
}

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
      <FoodizBrand subtitle="Votre table locale, livrée avec soin" />
      <FoodizHero
        eyebrow="Foodiz sélection locale"
        title={`${getGreeting()} ${profile?.first_name || 'Foodie'} 👋`}
        body="Commandez auprès des établissements de votre ville, suivez votre livraison en direct et cumulez vos avantages Foodiz.">
        <View style={styles.metrics}>
          <FoodizMetric
            label="Établissements"
            value={restaurants.length}
            helper="actifs autour de vous"
          />
          <FoodizMetric
            label="Panier"
            value={itemCount}
            helper={`${(subtotalCents / 100).toFixed(2)} € en cours`}
            tone={itemCount > 0 ? 'success' : 'muted'}
          />
        </View>
      </FoodizHero>

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

      <View style={styles.actions}>
        <FoodizActionCard
          icon="🍽️"
          title="Commander"
          description="Explorez les cartes disponibles et composez votre envie du moment."
          onPress={() => {
            if (!restaurants[0]) return;
            router.push({
              pathname: '/client/restaurant/[id]',
              params: { id: restaurants[0].id },
            });
          }}
        />
        <FoodizActionCard
          icon="📍"
          title="Suivre ma commande"
          description="Retrouvez le suivi live dès qu’une commande est en cours."
          onPress={() => router.push('/client/orders')}
        />
        <FoodizActionCard
          icon="✦"
          title="Foodiz Club"
          description="Consultez vos points, récompenses et avantages fidélité."
          onPress={() => router.push('/client/benefits')}
        />
      </View>

      <FoodizSectionTitle
        title="Établissements"
        action={<FoodizPill label={`${restaurants.length} ouverts`} />}
      />
      {restaurants.length === 0 ? (
        <FoodizCard>
          <Text style={foodizText.heading}>Ça mijote encore par ici</Text>
          <Text style={foodizText.body}>
            Aucun établissement actif pour le moment. Dès l’ouverture de votre
            ville, les premières adresses apparaîtront ici.
          </Text>
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
              <View style={styles.restaurantHeader}>
                <FoodizPill
                  label={restaurant.cuisine_type || 'Sélection Foodiz'}
                  tone="muted"
                />
                {restaurant.city ? <FoodizPill label={restaurant.city} /> : null}
              </View>
              <Text style={foodizText.heading}>{restaurant.name}</Text>
              <Text style={foodizText.body}>
                {[restaurant.address, restaurant.city]
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
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actions: {
    gap: 10,
  },
  restaurantHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
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
