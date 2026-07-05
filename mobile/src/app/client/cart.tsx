import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  WeelloButton,
  WeelloCard,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
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
    <WeelloScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Continuer mes achats</Text>
      </Pressable>
      <Text style={weelloText.title}>Mon panier</Text>
      <Text style={weelloText.body}>{restaurantName}</Text>

      {items.length === 0 ? (
        <WeelloCard>
          <Text style={weelloText.heading}>Votre panier est vide</Text>
          <Text style={weelloText.body}>Ajoutez des produits pour commencer.</Text>
        </WeelloCard>
      ) : (
        items.map((item) => (
          <WeelloCard key={item.productId}>
            <View style={styles.row}>
              <View style={styles.name}>
                <Text style={weelloText.heading}>{item.name}</Text>
                <Text style={weelloText.body}>
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
          </WeelloCard>
        ))
      )}

      {items.length > 0 ? (
        <>
          <WeelloCard>
            <View style={styles.row}>
              <Text style={weelloText.heading}>
                Sous-total articles ({itemCount})
              </Text>
              <Text style={styles.total}>{(subtotalCents / 100).toFixed(2)} €</Text>
            </View>
            <Text style={weelloText.body}>
              Les frais de service et de livraison seront calculés par le serveur à l’étape suivante.
            </Text>
          </WeelloCard>
          <WeelloButton
            label="Vérifier et payer"
            onPress={() => router.push('/client/checkout')}
          />
          <WeelloButton label="Vider le panier" onPress={clear} secondary />
        </>
      ) : null}
    </WeelloScreen>
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
