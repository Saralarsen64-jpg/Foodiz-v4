import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  WeelloBrand,
  WeelloButton,
  WeelloCard,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { weelloApi } from '@/lib/api';
import { useCart } from '@/providers/cart-provider';
import { colors } from '@/theme/colors';

type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  client_price_cents: number;
  original_client_price_cents: number | null;
  promotion_label: string | null;
  promotion_ends_at: string | null;
};

type Restaurant = {
  id: string;
  name: string;
  cuisine_type: string | null;
  city: string | null;
  address: string | null;
};

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem, itemCount } = useCart();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void weelloApi<{ restaurant: Restaurant; products: Product[] }>(
      `client-catalog?restaurantId=${encodeURIComponent(id)}`,
    )
      .then((data) => {
        if (!active) return;
        setRestaurant(data.restaurant);
        setProducts(data.products);
      })
      .catch((error) =>
        Alert.alert(
          'Carte indisponible',
          error instanceof Error ? error.message : 'Chargement impossible',
        ),
      );
    return () => {
      active = false;
    };
  }, [id]);

  const categories = useMemo(
    () =>
      products.reduce<Record<string, Product[]>>((groups, product) => {
        (groups[product.category || 'Menu'] ||= []).push(product);
        return groups;
      }, {}),
    [products],
  );

  function add(product: Product) {
    if (!restaurant) return;
    const added = addItem(
      {
        productId: product.id,
        name: product.name,
        clientPriceCents: product.client_price_cents,
      },
      restaurant,
    );
    if (!added) {
      Alert.alert(
        'Un seul établissement par commande',
        'Videz le panier actuel avant de commander dans un autre établissement.',
      );
    }
  }

  return (
    <WeelloScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Retour</Text>
      </Pressable>
      <WeelloBrand subtitle={restaurant?.cuisine_type || 'Carte Weello'} />
      <Text style={weelloText.title}>{restaurant?.name || 'Établissement'}</Text>
      <Text style={weelloText.body}>
        {[restaurant?.address, restaurant?.city].filter(Boolean).join(' · ')}
      </Text>

      {Object.entries(categories).map(([category, categoryProducts]) => (
        <View key={category} style={styles.category}>
          <Text style={styles.categoryTitle}>{category}</Text>
          {categoryProducts.map((product) => (
            <WeelloCard key={product.id}>
              <View style={styles.row}>
                <View style={styles.productText}>
                  <Text style={weelloText.heading}>{product.name}</Text>
                  <Text style={weelloText.body}>{product.description}</Text>
                </View>
                <Text style={styles.price}>
                  {(product.client_price_cents / 100).toFixed(2)} €
                </Text>
              </View>
              {product.original_client_price_cents ? (
                <View style={styles.offerRow}>
                  <Text style={styles.offerLabel}>
                    {product.promotion_label || 'Offre partenaire'}
                  </Text>
                  <Text style={styles.originalPrice}>
                    {(product.original_client_price_cents / 100).toFixed(2)} €
                  </Text>
                </View>
              ) : null}
              <WeelloButton label="Ajouter au panier" onPress={() => add(product)} secondary />
            </WeelloCard>
          ))}
        </View>
      ))}

      {itemCount > 0 ? (
        <WeelloButton
          label={`Voir le panier · ${itemCount} article(s)`}
          onPress={() => router.push('/client/cart')}
        />
      ) : null}
    </WeelloScreen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
  category: { gap: 12 },
  categoryTitle: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  row: { flexDirection: 'row', gap: 14 },
  productText: { flex: 1, gap: 6 },
  price: { color: colors.gold, fontSize: 18, fontWeight: '900' },
  offerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  offerLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  originalPrice: {
    color: colors.muted,
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
});
