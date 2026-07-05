import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

export function LoadingScreen({ label = 'Chargement…' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>WEELLO</Text>
      <ActivityIndicator color={colors.gold} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: colors.background,
  },
  brand: {
    color: colors.gold,
    fontSize: 38,
    fontFamily: 'PlayfairDisplay_600SemiBold_Italic',
    letterSpacing: 1,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
