import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/theme/colors';

export default function MobilePrelaunchScreen() {
  return (
    <LinearGradient colors={['#D8B98F', '#C6A06A']} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logo}>Foodiz</Text>
        <Text style={styles.eyebrow}>OUVERTURE PROCHAINE</Text>
        <Text style={styles.title}>Foodiz arrive bientôt</Text>
        <Text style={styles.subtitle}>L’app qui régale clients, livreurs et partenaires.</Text>
        <Text style={styles.body}>
          L’application mobile n’accepte pas de pré-inscription. Les clients seront informés du lancement dans leur ville. Les partenaires et livreurs déjà validés peuvent utiliser leur accès pilote.
        </Text>
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
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 22 },
  card: {
    borderRadius: 30,
    backgroundColor: 'rgba(248,234,210,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    padding: 30,
  },
  logo: {
    color: colors.black,
    fontFamily: 'PlayfairDisplay_600SemiBold_Italic',
    fontSize: 30,
  },
  eyebrow: {
    marginTop: 34,
    color: 'rgba(0,0,0,0.52)',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 2.5,
  },
  title: {
    marginTop: 12,
    color: colors.black,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 47,
    lineHeight: 49,
  },
  subtitle: {
    marginTop: 20,
    color: colors.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 19,
    lineHeight: 27,
  },
  body: {
    marginTop: 14,
    color: 'rgba(0,0,0,0.58)',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  button: {
    marginTop: 30,
    borderRadius: 16,
    backgroundColor: colors.black,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  buttonText: {
    color: colors.cream,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  instagramButton: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  instagramText: {
    color: colors.black,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
  },
});
