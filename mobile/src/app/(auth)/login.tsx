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
import { colors } from '@/theme/colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!email.trim() || !password) {
      Alert.alert('Informations manquantes', 'Renseignez votre email et votre mot de passe.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Connexion impossible', error.message);
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
      <Link href="/signup" style={styles.link}>
        Créer un compte Foodiz
      </Link>
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
