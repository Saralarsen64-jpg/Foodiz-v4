import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FoodizButton,
  FoodizCard,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { useCart } from '@/providers/cart-provider';
import { colors } from '@/theme/colors';

export default function CartScreen() {
  const {
    restaurantName,
    items,
    itemCount,
    subtotalCents,
    updateQuantity,
    clear,
  } = useCart();

  return (
    <FoodizScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Continuer mes achats</Text>
      </Pressable>
      <Text style={foodizText.title}>Mon panier</Text>
      <Text style={foodizText.body}>{restaurantName}</Text>

      {items.length === 0 ? (
        <FoodizCard>
          <Text style={foodizText.heading}>Votre panier est vide</Text>
          <Text style={foodizText.body}>Ajoutez des produits pour commencer.</Text>
        </FoodizCard>
      ) : (
        items.map((item) => (
          <FoodizCard key={item.productId}>
            <View style={styles.row}>
              <View style={styles.name}>
                <Text style={foodizText.heading}>{item.name}</Text>
                <Text style={foodizText.body}>
                  {(item.clientPriceCents / 100).toFixed(2)} € l’unité
                </Text>
              </View>
              <Text style={styles.total}>
                {((item.clientPriceCents * item.quantity) / 100).toFixed(2)} €
              </Text>
            </View>
            <View style={styles.quantity}>
              <Pressable
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.productId, -1)}>
                <Text style={styles.quantityLabel}>−</Text>
              </Pressable>
              <Text style={styles.quantityValue}>{item.quantity}</Text>
              <Pressable
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.productId, 1)}>
                <Text style={styles.quantityLabel}>+</Text>
              </Pressable>
            </View>
          </FoodizCard>
        ))
      )}

      {items.length > 0 ? (
        <>
          <FoodizCard>
            <View style={styles.row}>
              <Text style={foodizText.heading}>
                Sous-total articles ({itemCount})
              </Text>
              <Text style={styles.total}>{(subtotalCents / 100).toFixed(2)} €</Text>
            </View>
            <Text style={foodizText.body}>
              Les frais de service et de livraison seront calculés par le serveur à l’étape suivante.
            </Text>
          </FoodizCard>
          <FoodizButton
            label="Vérifier et payer"
            onPress={() => router.push('/client/checkout')}
          />
          <FoodizButton label="Vider le panier" onPress={clear} secondary />
        </>
      ) : null}
    </FoodizScreen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.gold, fontWeight: '800', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { flex: 1, gap: 4 },
  total: { color: colors.gold, fontSize: 18, fontWeight: '900' },
  quantity: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  quantityButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityLabel: { color: colors.gold, fontSize: 22, fontWeight: '900' },
  quantityValue: { color: colors.cream, fontSize: 18, fontWeight: '800' },
});
