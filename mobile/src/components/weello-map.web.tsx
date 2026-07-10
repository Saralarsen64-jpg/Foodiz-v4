import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export function WeelloMap({
  children,
  style,
}: PropsWithChildren<{ style?: object }>) {
  return (
    <View style={[styles.preview, style]}>
      <Text style={styles.title}>Carte disponible sur iOS et Android</Text>
      <Text style={styles.body}>
        Aucune position de démonstration n’est affichée dans l’aperçu web.
      </Text>
      {children}
    </View>
  );
}

export function WeelloMarker() {
  return null;
}

export function WeelloPolyline() {
  return null;
}

const styles = StyleSheet.create({
  preview: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 180,
    padding: 20,
  },
  title: {
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 17,
    textAlign: 'center',
  },
  body: {
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 7,
    textAlign: 'center',
  },
});
