import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import {
  WeelloCard,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { colors } from '@/theme/colors';

export default function ClientOrderWebPreviewScreen() {
  return (
    <WeelloScreen>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Mes commandes</Text>
      </Pressable>
      <Text style={weelloText.title}>Suivi de commande</Text>
      <WeelloCard>
        <Text style={weelloText.heading}>Aperçu navigateur</Text>
        <Text style={weelloText.body}>
          La carte GPS et le suivi du livreur restent disponibles dans
          l’application iOS ou Android. Aucune position fictive n’est affichée ici.
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
