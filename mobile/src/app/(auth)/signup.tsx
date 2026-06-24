import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import {
  FoodizBrand,
  FoodizButton,
  FoodizField,
  FoodizLegalLinks,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';

export default function SignupScreen() {
  const { loading: authLoading, launched } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!authLoading && !launched) return <Redirect href="/prelaunch" />;

  async function signup() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim() || password.length < 8) {
      Alert.alert(
        'Inscription incomplète',
        'Renseignez vos informations et choisissez un mot de passe de 8 caractères minimum.',
      );
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          role: 'client',
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          city: city.trim(),
          phone: phone.trim(),
          cgu_accepted: true,
        },
      },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Inscription impossible', error.message);
      return;
    }

    if (!data.session) {
      Alert.alert(
        'Vérifiez votre email',
        'Votre compte a été créé. Confirmez votre adresse email avant de vous connecter.',
      );
      router.replace('/login');
      return;
    }

    router.replace('/');
  }

  return (
    <FoodizScreen>
      <FoodizBrand subtitle="Rejoindre Foodiz" />
      <Text style={foodizText.title}>Créer mon compte</Text>
      <Text style={foodizText.body}>
        Cette inscription mobile est réservée aux clients. Les livreurs déposent leur dossier et leurs justificatifs sur foodiz.co avant de se connecter ici.
      </Text>

      <FoodizField value={firstName} onChangeText={setFirstName} placeholder="Prénom" autoCapitalize="words" />
      <FoodizField value={lastName} onChangeText={setLastName} placeholder="Nom" autoCapitalize="words" />
      <FoodizField value={city} onChangeText={setCity} placeholder="Ville" autoCapitalize="words" />
      <FoodizField value={phone} onChangeText={setPhone} placeholder="Téléphone" keyboardType="phone-pad" />
      <FoodizField value={email} onChangeText={setEmail} placeholder="Adresse email" keyboardType="email-address" />
      <FoodizField value={password} onChangeText={setPassword} placeholder="Mot de passe (8 caractères minimum)" secureTextEntry />
      <FoodizButton label="Créer mon compte" onPress={signup} loading={loading} />
      <Link href="/login" style={styles.link}>
        J’ai déjà un compte
      </Link>
      <FoodizLegalLinks />
    </FoodizScreen>
  );
}

const styles = StyleSheet.create({
  link: {
    color: colors.gold,
    textAlign: 'center',
    fontWeight: '700',
    padding: 12,
  },
});
