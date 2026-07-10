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
  WeelloButton,
  WeelloCard,
  WeelloField,
  WeelloBlackMasthead,
  WeelloPill,
  WeelloScreen,
  WeelloSectionTitle,
  weelloText,
} from '@/components/weello-ui';
import { weelloApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
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

type RecentOrder = {
  id: string;
  status: string;
  final_client_total_cents: number;
  created_at: string;
  restaurant: { name: string | null } | null;
};

export default function ClientHomeScreen() {
  const { profile, session } = useAuth();
  const { itemCount, subtotalCents } = useCart();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [coverage, setCoverage] = useState<{
    available: boolean;
    city: string | null;
    addressRequired: boolean;
  } | null>(null);
  const [requestingArea, setRequestingArea] = useState(false);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({
    points: 0,
    referrals: 0,
    rewards: 0,
    unread: 0,
  });
  const [recentOrder, setRecentOrder] = useState<RecentOrder | null>(null);

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

  useEffect(() => {
    if (!session?.user.id) return;
    let active = true;
    void Promise.all([
      supabase
        .from('client_wallets')
        .select('points_balance')
        .eq('user_id', session.user.id)
        .maybeSingle(),
      supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('parrain_id', session.user.id)
        .eq('status', 'completed'),
      supabase
        .from('client_rewards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'active'),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false),
      supabase
        .from('orders')
        .select('id,status,final_client_total_cents,created_at,restaurant:restaurants(name)')
        .eq('client_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([wallet, referrals, rewards, notifications, order]) => {
      if (!active) return;
      setSummary({
        points: Number(wallet.data?.points_balance || 0),
        referrals: referrals.count || 0,
        rewards: rewards.count || 0,
        unread: notifications.count || 0,
      });
      setRecentOrder((order.data || null) as unknown as RecentOrder | null);
    });
    return () => {
      active = false;
    };
  }, [session?.user.id]);

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
      <WeelloBlackMasthead />

      <View style={styles.utilityRow}>
        <Pressable onPress={() => router.push('/client/address')} style={styles.locationBlock}>
          <Text style={styles.utilityIcon}>⌖</Text>
          <View>
            <Text style={styles.utilityLabel}>Ma position</Text>
            <Text style={styles.locationValue}>{profile?.city || 'Ajouter mon adresse'}⌄</Text>
          </View>
        </Pressable>
        <View style={styles.utilityActions}>
          <Pressable onPress={() => router.push('/client/account')} style={styles.roundAction}>
            <Text style={styles.utilityIcon}>♢</Text>
            {summary.unread > 0 ? <Text style={styles.actionBadge}>{summary.unread}</Text> : null}
          </Pressable>
          <Pressable onPress={() => router.push('/client/cart')} style={styles.roundAction}>
            <Text style={styles.utilityIcon}>⌑</Text>
            {itemCount > 0 ? <Text style={styles.actionBadge}>{itemCount}</Text> : null}
          </Pressable>
        </View>
      </View>

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
      </View>

      <View style={styles.exploreRow}>
        <Pressable onPress={() => setSearch('')} style={styles.exploreCard}>
          <ImageBackground
            source={require('../../../assets/images/restaurant-bistrot.jpg')}
            imageStyle={styles.exploreImage}
            style={styles.exploreBackground}>
            <View style={styles.exploreOverlay}>
              <Text style={styles.exploreTitle}>RESTAURANTS</Text>
              <Text style={styles.exploreBody}>Plats préparés{'\n'}avec amour</Text>
              <Text style={styles.exploreArrow}>→</Text>
            </View>
          </ImageBackground>
        </Pressable>
        <Pressable onPress={() => setSearch('market')} style={styles.exploreCard}>
          <ImageBackground
            source={require('../../../assets/images/market-bio.jpg')}
            imageStyle={styles.exploreImage}
            style={styles.exploreBackground}>
            <View style={styles.exploreOverlay}>
              <Text style={styles.exploreTitle}>MARKET</Text>
              <Text style={styles.exploreBody}>Courses, snacks{'\n'}et essentiels</Text>
              <Text style={styles.exploreArrow}>→</Text>
            </View>
          </ImageBackground>
        </Pressable>
      </View>

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

      <Pressable onPress={() => router.push('/client/benefits')}>
        <WeelloCard>
          <Text style={styles.clubTitle}>Des avantages{'\n'}rien que pour vous</Text>
          <Text style={styles.clubBody}>Fidélité, parrainage, offres exclusives…</Text>
          <Text style={styles.clubCta}>Découvrir →</Text>
        </WeelloCard>
      </Pressable>

      <WeelloSectionTitle title="Vos avantages" />
      <View style={styles.benefitGrid}>
        {[
          ['☆', 'Fidélité', `${summary.points.toLocaleString('fr-FR')} points`],
          ['♢', 'Parrainage', `${summary.referrals} validé(s)`],
          ['%', 'Offres exclusives', `${summary.rewards} disponible(s)`],
        ].map(([icon, label, value]) => (
          <Pressable key={label} onPress={() => router.push('/client/benefits')} style={styles.benefitCard}>
            <Text style={styles.benefitIcon}>{icon}</Text>
            <Text style={styles.benefitLabel}>{label}</Text>
            <Text style={styles.benefitValue}>{value}</Text>
          </Pressable>
        ))}
      </View>

      {recentOrder ? (
        <>
          <WeelloSectionTitle title="Votre dernière commande" />
          <Pressable
            onPress={() => router.push({
              pathname: '/client/order/[id]',
              params: { id: recentOrder.id },
            })}>
            <WeelloCard>
              <View style={styles.recentOrder}>
                <View style={styles.recentOrderText}>
                  <Text style={weelloText.heading}>
                    {recentOrder.restaurant?.name || 'Commande Weello'}
                  </Text>
                  <Text style={weelloText.body}>
                    {new Date(recentOrder.created_at).toLocaleDateString('fr-FR')} · {recentOrder.status}
                  </Text>
                </View>
                <Text style={styles.recentAmount}>
                  {(recentOrder.final_client_total_cents / 100).toFixed(2)} €
                </Text>
              </View>
            </WeelloCard>
          </Pressable>
        </>
      ) : null}

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
  utilityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationBlock: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  utilityActions: {
    flexDirection: 'row',
    gap: 10,
  },
  roundAction: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    position: 'relative',
    width: 46,
  },
  utilityIcon: {
    color: colors.gold,
    fontSize: 24,
  },
  utilityLabel: {
    color: colors.gold,
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  locationValue: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 18,
  },
  actionBadge: {
    backgroundColor: colors.gold,
    borderRadius: 99,
    color: colors.black,
    fontSize: 10,
    fontWeight: '900',
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    right: -3,
    textAlign: 'center',
    top: -4,
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
  exploreRow: {
    flexDirection: 'row',
    gap: 10,
  },
  exploreCard: {
    flex: 1,
  },
  exploreBackground: {
    height: 205,
  },
  exploreImage: {
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
  },
  exploreOverlay: {
    backgroundColor: 'rgba(5,5,5,.36)',
    borderRadius: 22,
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
  },
  exploreTitle: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
  },
  exploreBody: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 13,
    lineHeight: 19,
  },
  exploreArrow: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: 99,
    color: colors.black,
    fontSize: 24,
    height: 42,
    lineHeight: 39,
    textAlign: 'center',
    width: 42,
  },
  clubTitle: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 29,
    lineHeight: 34,
  },
  clubBody: {
    color: colors.goldLight,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  clubCta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    borderRadius: 12,
    color: colors.black,
    fontFamily: 'Inter_700Bold',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  benefitGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  benefitCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 130,
    padding: 12,
  },
  benefitIcon: {
    color: colors.gold,
    fontSize: 26,
  },
  benefitLabel: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 14,
    marginTop: 10,
  },
  benefitValue: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    marginTop: 5,
  },
  recentOrder: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  recentOrderText: {
    flex: 1,
  },
  recentAmount: {
    color: colors.goldLight,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
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
