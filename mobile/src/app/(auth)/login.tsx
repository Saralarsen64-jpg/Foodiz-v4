import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  FoodizBrand,
  FoodizButton,
  FoodizField,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

export default function LoginScreen() {
  const { launched } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email.trim() || !password) {
      Alert.alert('Informations manquantes', 'Renseignez votre email et votre mot de passe.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Connexion impossible', error.message);
      return;
    }
    try {
      const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
      const response = await fetch(`${apiUrl}/api/launch-status`, {
        headers: data.session?.access_token
          ? { Authorization: `Bearer ${data.session.access_token}` }
          : undefined,
      });
      const status = await response.json();
      if (!status.launched && status.accessAllowed !== true) {
        await supabase.auth.signOut();
        Alert.alert(
          status.role === 'client' ? 'Encore un peu de patience 🍽️' : 'Accès en cours de validation',
          status.role === 'client'
            ? 'Foodiz mijote son arrivée dans votre ville. Vous serez informé par e-mail lors du lancement. Suivez aussi @foodiz_off sur Instagram.'
            : 'Votre dossier professionnel ou votre ville pilote doit encore être validé par Foodiz avant l’accès à l’application.',
        );
        return;
      }
    } catch {
      await supabase.auth.signOut();
      Alert.alert('Connexion temporairement indisponible', 'Foodiz n’a pas pu vérifier votre autorisation. Réessayez dans quelques instants.');
      return;
    }
    router.replace('/');
  }

  return (
    <FoodizScreen>
      <View style={styles.spacer} />
      <FoodizBrand subtitle="L’application locale qui vous régale" />
      <Text style={foodizText.title}>Connexion</Text>
      <Text style={foodizText.body}>
        Accédez à votre espace client, partenaire ou livreur Foodiz.
      </Text>
      <FoodizField
        value={email}
        onChangeText={setEmail}
        placeholder="Adresse email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <FoodizField
        value={password}
        onChangeText={setPassword}
        placeholder="Mot de passe"
        secureTextEntry
        textContentType="password"
      />
      <FoodizButton label="Se connecter" onPress={login} loading={loading} />
      {launched && (
        <Link href="/signup" style={styles.link}>
          Créer un compte Foodiz
        </Link>
      )}
    </FoodizScreen>
  );
}

const styles = StyleSheet.create({
  spacer: { flex: 0.4 },
  link: {
    color: colors.gold,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    padding: 12,
  },
});
