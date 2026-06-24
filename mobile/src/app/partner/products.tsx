import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  FoodizBrand,
  FoodizButton,
  FoodizCard,
  FoodizHero,
  FoodizMetric,
  FoodizPill,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

type Product = {
  id: string;
  name: string;
  category: string;
  partner_price_cents: number;
  is_active: boolean;
};

async function fetchPartnerProducts(userId: string) {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle();
  if (!restaurant) return [] as Product[];
  const { data } = await supabase
    .from('products')
    .select('id,name,category,partner_price_cents,is_active')
    .eq('restaurant_id', restaurant.id)
    .order('category')
    .order('name');
  return (data || []) as Product[];
}

export default function PartnerProductsScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!userId) return;
    setRefreshing(true);
    setProducts(await fetchPartnerProducts(userId));
    setRefreshing(false);
  }

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchPartnerProducts(userId).then((data) => {
      if (active) setProducts(data);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  async function toggle(product: Product) {
    const { error } = await supabase
      .from('products')
      .update({
        is_active: !product.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id);
    if (error) {
      Alert.alert('Modification impossible', error.message);
      return;
    }
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? { ...item, is_active: !item.is_active }
          : item,
      ),
    );
  }

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={load}
            tintColor={colors.gold}
          />
        }>
        <FoodizBrand subtitle="Carte partenaire" />
        <FoodizHero
          eyebrow="Votre carte Foodiz"
          title="Une carte claire vend mieux"
          body="Ajoutez vos produits, gardez les prix propres et masquez temporairement ce qui n’est plus disponible.">
          <View style={styles.metrics}>
            <FoodizMetric
              label="Produits"
              value={products.length}
              helper="dans votre carte"
            />
            <FoodizMetric
              label="Actifs"
              value={products.filter((product) => product.is_active).length}
              helper="visibles client"
              tone="success"
            />
          </View>
          <FoodizButton
            label="Ajouter un produit"
            onPress={() => router.push('/partner/product')}
          />
        </FoodizHero>

        {products.length === 0 ? (
          <FoodizCard>
            <Text style={foodizText.heading}>Votre carte est vide</Text>
            <Text style={foodizText.body}>
              Ajoutez votre premier produit et son prix partenaire.
            </Text>
          </FoodizCard>
        ) : (
          products.map((product) => (
              <FoodizCard key={product.id}>
                <View style={styles.row}>
                  <View style={styles.productText}>
                    <Text style={styles.category}>{product.category}</Text>
                    <Text style={foodizText.heading}>{product.name}</Text>
                    <Text style={foodizText.body}>
                      Prix partenaire :{' '}
                      {(product.partner_price_cents / 100).toFixed(2)} €
                    </Text>
                  </View>
                  <FoodizPill
                    label={product.is_active ? 'Actif' : 'Masqué'}
                    tone={product.is_active ? 'success' : 'muted'}
                  />
                </View>
                <FoodizButton
                  label="Modifier le produit"
                  onPress={() =>
                    router.push({
                      pathname: '/partner/product',
                      params: { id: product.id },
                    })
                  }
                />
                <FoodizButton
                  label={product.is_active ? 'Masquer temporairement' : 'Réactiver'}
                  onPress={() => void toggle(product)}
                  secondary
                />
              </FoodizCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, gap: 18, padding: 24 },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  productText: { flex: 1, gap: 4 },
  category: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
});
