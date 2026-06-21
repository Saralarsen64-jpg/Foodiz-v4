import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  FoodizBrand,
  FoodizButton,
  FoodizField,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

type SignupRole = 'client' | 'courier';

export default function SignupScreen() {
  const [role, setRole] = useState<SignupRole>('client');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signup() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || password.length < 8) {
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
          role,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          city: city.trim(),
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
        Les comptes partenaires et administrateurs utilisent l’interface web dédiée.
      </Text>

      <View style={styles.roles}>
        {(['client', 'courier'] as const).map((candidate) => (
          <Pressable
            key={candidate}
            onPress={() => setRole(candidate)}
            style={[
              styles.role,
              role === candidate && styles.roleSelected,
            ]}>
            <Text
              style={[
                styles.roleText,
                role === candidate && styles.roleTextSelected,
              ]}>
              {candidate === 'client' ? 'Client' : 'Livreur'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FoodizField value={firstName} onChangeText={setFirstName} placeholder="Prénom" autoCapitalize="words" />
      <FoodizField value={lastName} onChangeText={setLastName} placeholder="Nom" autoCapitalize="words" />
      <FoodizField value={city} onChangeText={setCity} placeholder="Ville" autoCapitalize="words" />
      <FoodizField value={email} onChangeText={setEmail} placeholder="Adresse email" keyboardType="email-address" />
      <FoodizField value={password} onChangeText={setPassword} placeholder="Mot de passe (8 caractères minimum)" secureTextEntry />
      <FoodizButton label="Créer mon compte" onPress={signup} loading={loading} />
      <Link href="/login" style={styles.link}>
        J’ai déjà un compte
      </Link>
    </FoodizScreen>
  );
}

const styles = StyleSheet.create({
  roles: {
    flexDirection: 'row',
    gap: 12,
  },
  role: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    backgroundColor: colors.surface,
  },
  roleSelected: {
    backgroundColor: colors.gold,
  },
  roleText: {
    color: colors.cream,
    fontWeight: '800',
  },
  roleTextSelected: {
    color: colors.black,
  },
  link: {
    color: colors.gold,
    textAlign: 'center',
    fontWeight: '700',
    padding: 12,
  },
});
