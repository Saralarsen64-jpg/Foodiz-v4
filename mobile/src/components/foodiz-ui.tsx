import type { PropsWithChildren } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';

export function FoodizScreen({
  children,
  scroll = true,
}: PropsWithChildren<{ scroll?: boolean }>) {
  const content = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={['rgba(216,168,79,0.15)', 'rgba(11,11,11,0)', '#0B0B0B']}
        locations={[0, 0.32, 1]}
        style={StyleSheet.absoluteFill}
      />
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function FoodizBrand({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.brandBlock}>
      <Text style={styles.brand}>Foodiz</Text>
      <View style={styles.brandLine} />
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function FoodizField(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      autoCapitalize="none"
      style={styles.field}
      {...props}
    />
  );
}

export function FoodizButton({
  label,
  onPress,
  loading,
  disabled,
  secondary,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <LinearGradient
        colors={
          secondary
            ? [colors.surfaceRaised, colors.surface]
            : [colors.goldLight, colors.gold]
        }
        style={styles.buttonGradient}>
        {loading ? (
          <ActivityIndicator color={secondary ? colors.gold : colors.black} />
        ) : (
          <Text
            style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>
            {label}
          </Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function FoodizCard({ children }: PropsWithChildren) {
  return (
    <LinearGradient
      colors={['rgba(216,168,79,0.12)', 'rgba(21,21,21,0.98)', '#111111']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}>
      {children}
    </LinearGradient>
  );
}

export const foodizText = StyleSheet.create({
  title: {
    color: colors.cream,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  heading: {
    color: colors.cream,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  gold: {
    color: colors.gold,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    gap: 18,
    backgroundColor: colors.background,
  },
  brandBlock: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 24,
  },
  brand: {
    color: colors.gold,
    fontSize: 40,
    fontFamily: 'PlayfairDisplay_600SemiBold_Italic',
    letterSpacing: 1,
  },
  brandLine: {
    width: 92,
    height: 1,
    backgroundColor: colors.gold,
    opacity: 0.65,
  },
  subtitle: {
    color: colors.cream,
    fontSize: 13,
    letterSpacing: 1.2,
    fontFamily: 'Inter_500Medium',
  },
  field: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    color: colors.cream,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.gold,
    overflow: 'hidden',
  },
  buttonGradient: {
    minHeight: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
  },
  buttonTextSecondary: {
    color: colors.gold,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.8,
  },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    padding: 20,
  },
});
