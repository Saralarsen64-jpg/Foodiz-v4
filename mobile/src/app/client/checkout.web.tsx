import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import {
  WeelloCard,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { colors } from '@/theme/colors';

export default function CheckoutWebPreviewScreen() {
  return (
    <WeelloScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Retour au panier</Text>
      </Pressable>
      <Text style={weelloText.title}>Paiement sécurisé</Text>
      <WeelloCard>
        <Text style={weelloText.heading}>Aperçu navigateur</Text>
        <Text style={weelloText.body}>
          Le paiement Stripe natif reste volontairement désactivé dans cet aperçu.
          Testez cette étape dans le build iOS ou Android.
        </Text>
      </WeelloCard>
    </WeelloScreen>
  );
}

const styles = StyleSheet.create({
  back: {
    color: colors.gold,
    fontWeight: '800',
    paddingVertical: 8,
  },
});
