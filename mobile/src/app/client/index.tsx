import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FoodizActionCard,
  FoodizBrand,
  FoodizButton,
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

type Coverage = {
  status: 'available' | 'coming_soon' | 'address_required';
  city: string | null;
  postalCode: string | null;
  radiusKm: number | null;
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
  const [coverage, setCoverage] = useState<Coverage>({
    status: 'address_required',
    city: profile?.city || null,
    postalCode: null,
    radiusKm: null,
  });
  const [expansionRequested, setExpansionRequested] = useState(false);
  const [requestingExpansion, setRequestingExpansion] = useState(false);

  useEffect(() => {
    let active = true;
    void foodizApi<{
      restaurants: Restaurant[];
      coverage: Coverage;
      expansionRequest: { id: string } | null;
    }>('client-catalog')
      .then((data) => {
        if (active) {
          setRestaurants(data.restaurants);
          setCoverage(data.coverage);
          setExpansionRequested(Boolean(data.expansionRequest));
        }
      })
      .catch(() => {
        if (active) setRestaurants([]);
      });
    return () => {
      active = false;
    };
  }, []);

  async function requestExpansion() {
    setRequestingExpansion(true);
    try {
      const data = await foodizApi<{ message: string }>('city-expansion-request', {
        method: 'POST',
        headers: { 'X-Foodiz-Client': 'mobile' },
      });
      setExpansionRequested(true);
      Alert.alert('Votre ville est dans notre radar ✨', data.message);
    } catch (error) {
      Alert.alert(
        'Demande impossible',
        error instanceof Error ? error.message : 'Réessayez dans un instant.',
      );
    } finally {
      setRequestingExpansion(false);
    }
  }

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

      <FoodizCard>
        <Text style={styles.kicker}>EXPÉRIENCE FOODIZ</Text>
        <Text style={foodizText.heading}>Un suivi clair, du four à votre porte.</Text>
        <View style={styles.promiseList}>
          <Text style={styles.promise}>• Préparation statique pendant que le restaurant cuisine.</Text>
          <Text style={styles.promise}>• Suivi live dès que le livreur récupère la commande.</Text>
          <Text style={styles.promise}>• Code sécurisé à transmettre uniquement à la remise.</Text>
        </View>
      </FoodizCard>

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
          <Text style={styles.kicker}>DÉPLOIEMENT NATIONAL</Text>
          <Text style={foodizText.heading}>
            {coverage.status === 'address_required'
              ? 'Où doit-on vous régaler ?'
              : expansionRequested
                ? `${coverage.city || 'Votre ville'} est dans notre radar`
                : `Bientôt à ${coverage.city || 'votre adresse'}`}
          </Text>
          <Text style={foodizText.body}>
            {coverage.status === 'address_required'
              ? 'Ajoutez une adresse française vérifiée pour découvrir les partenaires disponibles autour de vous.'
              : expansionRequested
                ? 'Votre demande est enregistrée. Nous vous informerons dès que les premières adresses Foodiz seront prêtes.'
                : 'Aucun partenaire n’est encore disponible autour de vous. Votre demande nous aide à prioriser les prochaines ouvertures.'}
          </Text>
          {coverage.status === 'address_required' ? (
            <FoodizButton
              label="Ajouter mon adresse"
              onPress={() => router.push('/client/address')}
            />
          ) : !expansionRequested ? (
            <FoodizButton
              label="Je veux Foodiz dans ma ville"
              onPress={() => void requestExpansion()}
              loading={requestingExpansion}
            />
          ) : null}
          <Text style={styles.coverageNote}>
            Votre compte reste actif partout en France.
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
  promiseList: {
    gap: 8,
    marginTop: 12,
  },
  promise: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  discover: {
    color: colors.gold,
    fontWeight: '800',
  },
  coverageNote: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
});
