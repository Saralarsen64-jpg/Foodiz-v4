import type { PropsWithChildren, ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Linking,
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

export function WeelloBlackMasthead({ compact = false }: { compact?: boolean }) {
  return (
    <ImageBackground
      accessibilityIgnoresInvertColors
      source={require('../../assets/images/weello-wordmark.png')}
      resizeMode="cover"
      imageStyle={styles.mastheadImage}
      style={[styles.masthead, compact && styles.mastheadCompact]}
    />
  );
}

export function WeelloScreen({
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

export function WeelloBrand({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.brandBlock}>
      <Image
        source={require('../../assets/images/weello-wordmark.png')}
        style={styles.brandImage}
        resizeMode="contain"
      />
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function WeelloHero({
  eyebrow,
  title,
  body,
  children,
}: PropsWithChildren<{
  eyebrow?: string;
  title: string;
  body?: string;
}>) {
  return (
    <LinearGradient
      colors={['rgba(216,168,79,0.24)', 'rgba(21,21,21,0.98)', '#0B0B0B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}>
      <View style={styles.heroGlow} />
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.heroTitle}>{title}</Text>
      {body ? <Text style={styles.heroBody}>{body}</Text> : null}
      {children ? <View style={styles.heroChildren}>{children}</View> : null}
    </LinearGradient>
  );
}

export function WeelloField(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      autoCapitalize="none"
      style={styles.field}
      {...props}
    />
  );
}

export function WeelloButton({
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
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      android_ripple={{ color: secondary ? 'rgba(216,168,79,0.12)' : 'rgba(255,255,255,0.2)' }}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <LinearGradient
        colors={
          secondary
            ? ['rgba(216,168,79,0.12)', colors.surfaceRaised, colors.surface]
            : ['#F4D487', colors.goldLight, colors.gold, '#B98535']
        }
        locations={secondary ? [0, 0.38, 1] : [0, 0.28, 0.68, 1]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={styles.buttonGradient}>
        <View
          pointerEvents="none"
          style={[styles.buttonAmbient, secondary && styles.buttonAmbientSecondary]}
        />
        <View pointerEvents="none" style={styles.buttonTopLine} />
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

export function WeelloCard({ children }: PropsWithChildren) {
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

export function WeelloPill({
  label,
  tone = 'gold',
}: {
  label: string;
  tone?: 'gold' | 'success' | 'danger' | 'muted';
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === 'success' && styles.pillSuccess,
        tone === 'danger' && styles.pillDanger,
        tone === 'muted' && styles.pillMuted,
      ]}>
      <Text
        style={[
          styles.pillText,
          tone === 'success' && styles.pillTextSuccess,
          tone === 'danger' && styles.pillTextDanger,
          tone === 'muted' && styles.pillTextMuted,
        ]}>
        {label}
      </Text>
    </View>
  );
}

export function WeelloMetric({
  label,
  value,
  helper,
  tone = 'gold',
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'gold' | 'success' | 'muted';
}) {
  return (
    <LinearGradient
      colors={['rgba(216,168,79,0.16)', 'rgba(21,21,21,0.98)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          tone === 'success' && styles.metricValueSuccess,
          tone === 'muted' && styles.metricValueMuted,
        ]}>
        {value}
      </Text>
      {helper ? <Text style={styles.metricHelper}>{helper}</Text> : null}
    </LinearGradient>
  );
}

export function WeelloActionCard({
  title,
  description,
  icon,
  badge,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  badge?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCardPressable,
        pressed && styles.pressed,
      ]}>
      <LinearGradient
        colors={['rgba(246,238,220,0.06)', 'rgba(216,168,79,0.08)', '#111111']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.actionCard}>
        <View style={styles.actionIcon}>
          <Text style={styles.actionIconText}>{icon}</Text>
        </View>
        <View style={styles.actionTextBlock}>
          <View style={styles.actionTitleRow}>
            <Text style={styles.actionTitle}>{title}</Text>
            {badge ? <WeelloPill label={badge} /> : null}
          </View>
          <Text style={styles.actionDescription}>{description}</Text>
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function WeelloSectionTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={weelloText.heading}>{title}</Text>
      {action}
    </View>
  );
}

export function WeelloLegalLinks() {
  const open = (path: string) => {
    void Linking.openURL(`https://weello.app${path}`);
  };

  return (
    <View style={styles.legalLinks}>
      <Pressable onPress={() => open('/cgu')}>
        <Text style={styles.legalText}>CGU</Text>
      </Pressable>
      <Pressable onPress={() => open('/cgv')}>
        <Text style={styles.legalText}>CGV</Text>
      </Pressable>
      <Pressable onPress={() => open('/confidentialite')}>
        <Text style={styles.legalText}>Confidentialité</Text>
      </Pressable>
    </View>
  );
}

export const weelloText = StyleSheet.create({
  title: {
    color: colors.cream,
    fontSize: 32,
    lineHeight: 38,
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
    backgroundColor: 'transparent',
  },
  masthead: {
    backgroundColor: colors.black,
    height: 205,
    marginHorizontal: -24,
    marginTop: -24,
    overflow: 'hidden',
  },
  mastheadCompact: {
    height: 178,
  },
  mastheadImage: {
    transform: [{ scale: 1.08 }],
  },
  brandBlock: {
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  brandImage: {
    width: 220,
    height: 112,
  },
  subtitle: {
    color: colors.cream,
    fontSize: 13,
    letterSpacing: 1.2,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
  },
  hero: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 30,
    overflow: 'hidden',
    padding: 22,
    gap: 10,
    shadowColor: colors.gold,
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  heroGlow: {
    position: 'absolute',
    right: -54,
    top: -54,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(216,168,79,0.22)',
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
  },
  heroTitle: {
    color: colors.cream,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '800',
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  heroBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  heroChildren: {
    gap: 10,
    marginTop: 8,
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
    borderWidth: 1,
    borderColor: 'rgba(255,239,198,0.76)',
    shadowColor: colors.gold,
    shadowOpacity: 0.27,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 8,
  },
  buttonGradient: {
    minHeight: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(216,168,79,0.5)',
    backgroundColor: colors.surface,
    shadowColor: colors.black,
    shadowOpacity: 0.34,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  buttonAmbient: {
    position: 'absolute',
    width: 140,
    height: 88,
    left: -34,
    top: -52,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  buttonAmbientSecondary: {
    backgroundColor: 'rgba(216,168,79,0.08)',
  },
  buttonTopLine: {
    position: 'absolute',
    top: 1,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255,251,231,0.58)',
  },
  buttonText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.15,
  },
  buttonTextSecondary: {
    color: colors.gold,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ translateY: 1 }, { scale: 0.985 }],
  },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    padding: 20,
    shadowColor: colors.black,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(216,168,79,0.45)',
    backgroundColor: 'rgba(216,168,79,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillSuccess: {
    borderColor: 'rgba(79,180,119,0.45)',
    backgroundColor: 'rgba(79,180,119,0.12)',
  },
  pillDanger: {
    borderColor: 'rgba(228,108,108,0.45)',
    backgroundColor: 'rgba(228,108,108,0.12)',
  },
  pillMuted: {
    borderColor: 'rgba(155,150,141,0.28)',
    backgroundColor: 'rgba(155,150,141,0.08)',
  },
  pillText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
  },
  pillTextSuccess: {
    color: colors.success,
  },
  pillTextDanger: {
    color: colors.danger,
  },
  pillTextMuted: {
    color: colors.muted,
  },
  metricCard: {
    flex: 1,
    minWidth: 145,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 5,
  },
  metricLabel: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
  },
  metricValue: {
    color: colors.cream,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: '900',
    fontFamily: 'Inter_700Bold',
  },
  metricValueSuccess: {
    color: colors.success,
  },
  metricValueMuted: {
    color: colors.muted,
  },
  metricHelper: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Inter_400Regular',
  },
  actionCard: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  actionCardPressable: {
    borderRadius: 24,
    shadowColor: colors.black,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(216,168,79,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(216,168,79,0.38)',
  },
  actionIconText: {
    color: colors.gold,
    fontSize: 20,
  },
  actionTextBlock: {
    flex: 1,
    gap: 4,
  },
  actionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionTitle: {
    color: colors.cream,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'Inter_700Bold',
  },
  actionDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Inter_400Regular',
  },
  actionArrow: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: '900',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  legalText: {
    color: colors.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
});
