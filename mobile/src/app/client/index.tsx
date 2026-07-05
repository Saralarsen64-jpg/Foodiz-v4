import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  WeelloActionCard,
  WeelloBrand,
  WeelloButton,
  WeelloCard,
  WeelloField,
  WeelloHero,
  WeelloMetric,
  WeelloPill,
  WeelloScreen,
  WeelloSectionTitle,
  weelloText,
} from '@/components/weello-ui';
import { weelloApi } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { useCart } from '@/providers/cart-provider';
import { colors } from '@/theme/colors';

type Restaurant = {
  id: string;
  name: string;
  cuisine_type: string | null;
  city: string | null;
  address: string | null;
  cover_image: string | null;
  distance_meters?: number | null;
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
  const [coverage, setCoverage] = useState<{
    available: boolean;
    city: string | null;
    addressRequired: boolean;
  } | null>(null);
  const [requestingArea, setRequestingArea] = useState(false);
  const [search, setSearch] = useState('');

  const categories = useMemo(
    () => Array.from(new Set(
      restaurants
        .map((restaurant) => restaurant.cuisine_type?.trim())
        .filter((category): category is string => Boolean(category)),
    )).slice(0, 8),
    [restaurants],
  );
  const visibleRestaurants = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr-FR');
    if (!query) return restaurants;
    return restaurants.filter((restaurant) =>
      [restaurant.name, restaurant.cuisine_type, restaurant.city]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('fr-FR').includes(query)),
    );
  }, [restaurants, search]);

  useEffect(() => {
    let active = true;
    void weelloApi<{
      restaurants: Restaurant[];
      coverage: {
        available: boolean;
        city: string | null;
        addressRequired: boolean;
      };
    }>('client-catalog')
      .then((data) => {
        if (active) {
          setRestaurants(data.restaurants);
          setCoverage(data.coverage);
        }
      })
      .catch(() => {
        if (active) setRestaurants([]);
      });
    return () => {
      active = false;
    };
  }, []);

  async function requestArea() {
    if (coverage?.addressRequired) {
      router.push('/client/address');
      return;
    }
    setRequestingArea(true);
    try {
      await weelloApi('request-service-area', { method: 'POST' });
      Alert.alert(
        'Demande enregistrée ✨',
        `Weello étudie le déploiement à ${coverage?.city || 'votre ville'}. Vous serez informé dès l’arrivée des premiers partenaires.`,
      );
    } catch (error) {
      Alert.alert(
        'Demande impossible',
        error instanceof Error ? error.message : 'Réessayez dans quelques instants.',
      );
    } finally {
      setRequestingArea(false);
    }
  }

  return (
    <WeelloScreen>
      <WeelloBrand subtitle="Votre table locale, livrée avec soin" />
      <WeelloHero
        eyebrow="Weello sélection locale"
        title={`${getGreeting()} ${profile?.first_name || 'Foodie'} 👋`}
        body="Commandez auprès des établissements de votre ville, suivez votre livraison en direct et cumulez vos avantages Weello.">
        <View style={styles.metrics}>
          <WeelloMetric
            label="Établissements"
            value={restaurants.length}
            helper="actifs autour de vous"
          />
          <WeelloMetric
            label="Panier"
            value={itemCount}
            helper={`${(subtotalCents / 100).toFixed(2)} € en cours`}
            tone={itemCount > 0 ? 'success' : 'muted'}
          />
        </View>
      </WeelloHero>

      <View style={styles.searchBlock}>
        <Text style={styles.appetiteTitle}>
          Envie de quelque chose <Text style={styles.appetiteAccent}>de bon ?</Text>
        </Text>
        <WeelloField
          value={search}
          onChangeText={setSearch}
          placeholder="Restaurant, cuisine, ville…"
          accessibilityLabel="Rechercher un établissement"
        />
        {categories.length > 0 ? (
          <View style={styles.categoryRow}>
            {categories.map((category) => (
              <Pressable key={category} onPress={() => setSearch(category)}>
                <WeelloPill label={category} tone={search === category ? 'gold' : 'muted'} />
              </Pressable>
            ))}
            {search ? (
              <Pressable onPress={() => setSearch('')}>
                <WeelloPill label="Tout voir" />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {itemCount > 0 ? (
        <Pressable onPress={() => router.push('/client/cart')}>
          <WeelloCard>
            <Text style={styles.kicker}>VOTRE PANIER</Text>
            <Text style={styles.points}>{itemCount} article(s)</Text>
            <Text style={weelloText.body}>
              Sous-total articles {(subtotalCents / 100).toFixed(2)} €
            </Text>
          </WeelloCard>
        </Pressable>
      ) : null}

      <WeelloCard>
        <Text style={styles.kicker}>EXPÉRIENCE WEELLO</Text>
        <Text style={weelloText.heading}>Un suivi clair, du four à votre porte.</Text>
        <View style={styles.promiseList}>
          <Text style={styles.promise}>• Préparation statique pendant que le restaurant cuisine.</Text>
          <Text style={styles.promise}>• Suivi live dès que le livreur récupère la commande.</Text>
          <Text style={styles.promise}>• Code sécurisé à transmettre uniquement à la remise.</Text>
        </View>
      </WeelloCard>

      <View style={styles.actions}>
        <WeelloActionCard
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
        <WeelloActionCard
          icon="📍"
          title="Suivre ma commande"
          description="Retrouvez le suivi live dès qu’une commande est en cours."
          onPress={() => router.push('/client/orders')}
        />
        <WeelloActionCard
          icon="✦"
          title="Weello Club"
          description="Consultez vos points, récompenses et avantages fidélité."
          onPress={() => router.push('/client/benefits')}
        />
      </View>

      <WeelloSectionTitle
        title={search ? 'Résultats' : 'Établissements'}
        action={<WeelloPill label={`${visibleRestaurants.length} ouverts`} />}
      />
      {restaurants.length === 0 ? (
        <WeelloCard>
          <Text style={weelloText.heading}>Ça mijote encore par ici</Text>
          <Text style={weelloText.body}>
            {coverage?.addressRequired
              ? 'Enregistrez votre adresse pour découvrir les établissements disponibles autour de vous.'
              : `Nous préparons l’arrivée de Weello à ${coverage?.city || 'votre ville'}. Votre demande nous aide à prioriser les prochains partenaires.`}
          </Text>
          <WeelloButton
            label={coverage?.addressRequired
              ? 'Ajouter mon adresse'
              : 'Demander Weello dans ma ville'}
            onPress={() => void requestArea()}
            loading={requestingArea}
          />
        </WeelloCard>
      ) : visibleRestaurants.length === 0 ? (
        <WeelloCard>
          <Text style={weelloText.heading}>Aucun résultat</Text>
          <Text style={weelloText.body}>
            Essayez une autre cuisine ou affichez tous les établissements.
          </Text>
          <WeelloButton label="Tout afficher" onPress={() => setSearch('')} secondary />
        </WeelloCard>
      ) : (
        visibleRestaurants.map((restaurant) => (
          <Pressable
            key={restaurant.id}
            onPress={() =>
              router.push({
                pathname: '/client/restaurant/[id]',
                params: { id: restaurant.id },
              })
            }>
            {restaurant.cover_image ? (
              <ImageBackground
                source={{ uri: restaurant.cover_image }}
                imageStyle={styles.restaurantImage}
                style={styles.restaurantVisual}>
                <View style={styles.restaurantOverlay}>
                  <View style={styles.restaurantHeader}>
                    <WeelloPill
                      label={restaurant.cuisine_type || 'Sélection Weello'}
                      tone="muted"
                    />
                    {restaurant.city ? <WeelloPill label={restaurant.city} /> : null}
                  </View>
                  <View>
                    <Text style={styles.restaurantVisualTitle}>{restaurant.name}</Text>
                    <Text style={styles.restaurantVisualMeta}>
                      {restaurant.distance_meters
                        ? `${(restaurant.distance_meters / 1000).toFixed(1)} km · `
                        : ''}
                      Découvrir la carte →
                    </Text>
                  </View>
                </View>
              </ImageBackground>
            ) : (
              <WeelloCard>
                <View style={styles.restaurantHeader}>
                  <WeelloPill
                    label={restaurant.cuisine_type || 'Sélection Weello'}
                    tone="muted"
                  />
                  {restaurant.city ? <WeelloPill label={restaurant.city} /> : null}
                </View>
                <Text style={weelloText.heading}>{restaurant.name}</Text>
                <Text style={weelloText.body}>
                  {[restaurant.address, restaurant.city]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text style={styles.discover}>Découvrir la carte →</Text>
              </WeelloCard>
            )}
          </Pressable>
        ))
      )}
    </WeelloScreen>
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
  searchBlock: {
    gap: 12,
  },
  appetiteTitle: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 27,
    lineHeight: 33,
  },
  appetiteAccent: {
    color: colors.goldLight,
    fontFamily: 'PlayfairDisplay_600SemiBold_Italic',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  restaurantVisual: {
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
    height: 230,
    overflow: 'hidden',
  },
  restaurantImage: {
    borderRadius: 26,
  },
  restaurantOverlay: {
    backgroundColor: 'rgba(5,5,5,0.48)',
    flex: 1,
    justifyContent: 'space-between',
    padding: 18,
  },
  restaurantVisualTitle: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 27,
  },
  restaurantVisualMeta: {
    color: colors.goldLight,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginTop: 6,
  },
});
