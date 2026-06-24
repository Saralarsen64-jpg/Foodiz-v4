import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';

export default function MobilePrelaunchScreen() {
  return (
    <LinearGradient colors={['#17130D', '#070707', '#0B0B0B']} style={styles.container}>
      <View style={styles.goldGlow} />
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/images/Logo-Foodiz.PNG')}
            resizeMode="contain"
            style={styles.logoImage}
          />
        </View>
        <Text style={styles.eyebrow}>OUVERTURE PROCHAINE</Text>
        <Text style={styles.title}>Foodiz arrive bientôt</Text>
        <Text style={styles.subtitle}>Votre ville mijote quelque chose de très bon.</Text>
        <Text style={styles.body}>
          L’application mobile n’accepte pas de pré-inscription. Les clients seront informés du lancement dans leur ville.
          Les partenaires et livreurs déjà validés peuvent utiliser leur accès pilote.
        </Text>
        <View style={styles.promiseRow}>
          <Text style={styles.promise}>Accès pilote sécurisé</Text>
          <Text style={styles.promise}>Support Foodiz</Text>
          <Text style={styles.promise}>Lancement par ville</Text>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>J’ai un accès Foodiz</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.instagramButton}
          onPress={() => void Linking.openURL('https://www.instagram.com/foodiz_off/')}>
          <Text style={styles.instagramText}>Suivre @foodiz_off</Text>
        </TouchableOpacity>
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => void Linking.openURL('https://www.foodiz.co/cgu')}>
            <Text style={styles.legalText}>CGU</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void Linking.openURL('https://www.foodiz.co/confidentialite')}>
            <Text style={styles.legalText}>Confidentialité</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 22 },
  goldGlow: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(216,168,79,0.17)',
  },
  card: {
    borderRadius: 30,
    backgroundColor: 'rgba(10,10,10,0.94)',
    borderWidth: 1.2,
    borderColor: 'rgba(216,168,79,0.24)',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 20 },
  },
  logoWrap: {
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(216,168,79,0.26)',
    backgroundColor: '#D8B98F',
  },
  logoImage: {
    width: '100%',
    height: 150,
  },
  eyebrow: {
    marginTop: 26,
    color: colors.gold,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.5,
    textAlign: 'center',
  },
  title: {
    marginTop: 12,
    color: colors.cream,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 44,
    lineHeight: 47,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 20,
    color: colors.cream,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
  },
  body: {
    marginTop: 14,
    color: colors.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  promiseRow: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  promise: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(216,168,79,0.22)',
    color: colors.gold,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 7,
    overflow: 'hidden',
  },
  button: {
    marginTop: 30,
    borderRadius: 16,
    backgroundColor: colors.gold,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: colors.black,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  instagramButton: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(216,168,79,0.26)',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  instagramText: {
    color: colors.gold,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
  legalRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  legalText: {
    color: colors.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
});
