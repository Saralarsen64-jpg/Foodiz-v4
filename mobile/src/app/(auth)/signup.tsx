import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import {
  FoodizBrand,
  FoodizButton,
  FoodizField,
  FoodizLegalLinks,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

type PublicRole = 'client' | 'courier' | 'partner';

function normalizeRole(value: unknown): PublicRole {
  return value === 'courier' || value === 'partner' ? value : 'client';
}

export default function SignupScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role = normalizeRole(params.role);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cguAccepted, setCguAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signup() {
    if (
      !firstName.trim()
      || !lastName.trim()
      || !address.trim()
      || !/^[0-9]{5}$/.test(postalCode)
      || !city.trim()
      || !phone.trim()
      || !email.trim()
      || !cguAccepted
      || password.length < 10
      || !/[A-Z]/.test(password)
      || !/[a-z]/.test(password)
      || !/\d/.test(password)
    ) {
      Alert.alert(
        'Inscription incomplète',
        'Complétez les informations, acceptez les CGU et choisissez un mot de passe de 10 caractères avec majuscule, minuscule et chiffre.',
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
          address: address.trim(),
          postal_code: postalCode,
          city: city.trim(),
          phone: phone.trim(),
          cgu_accepted: cguAccepted,
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
      <Text style={foodizText.title}>
        {role === 'partner'
          ? 'Créer mon compte partenaire'
          : role === 'courier'
            ? 'Créer mon compte livreur'
            : 'Créer mon compte client'}
      </Text>
      <Text style={foodizText.body}>
        {role === 'client'
          ? 'Votre compte est accessible partout en France. Si Foodiz ne dessert pas encore votre adresse, vous pourrez demander l’ouverture de votre ville.'
          : 'Créez votre accès puis complétez votre dossier professionnel. Les fonctions opérationnelles resteront protégées jusqu’à sa validation par Foodiz.'}
      </Text>

      <FoodizField value={firstName} onChangeText={setFirstName} placeholder="Prénom" autoCapitalize="words" />
      <FoodizField value={lastName} onChangeText={setLastName} placeholder="Nom" autoCapitalize="words" />
      <FoodizField value={address} onChangeText={setAddress} placeholder="Numéro et rue" autoCapitalize="words" />
      <FoodizField
        value={postalCode}
        onChangeText={(value) => setPostalCode(value.replace(/\D/g, '').slice(0, 5))}
        placeholder="Code postal français"
        keyboardType="number-pad"
      />
      <FoodizField value={city} onChangeText={setCity} placeholder="Ville" autoCapitalize="words" />
      <FoodizField value={phone} onChangeText={setPhone} placeholder="Téléphone" keyboardType="phone-pad" />
      <FoodizField value={email} onChangeText={setEmail} placeholder="Adresse email" keyboardType="email-address" />
      <FoodizField value={password} onChangeText={setPassword} placeholder="10 caractères, majuscule, minuscule, chiffre" secureTextEntry />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: cguAccepted }}
        onPress={() => setCguAccepted((current) => !current)}
        style={styles.consent}>
        <Text style={[styles.checkbox, cguAccepted && styles.checkboxChecked]}>
          {cguAccepted ? '✓' : ''}
        </Text>
        <Text style={styles.consentText}>
          J’accepte les CGU, les CGV et la politique de confidentialité Foodiz.
        </Text>
      </Pressable>
      <FoodizButton label="Créer mon compte" onPress={signup} loading={loading} />
      <Link href={{ pathname: '/login', params: { role } }} style={styles.link}>
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
  consent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.gold,
    color: colors.black,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '900',
    overflow: 'hidden',
  },
  checkboxChecked: {
    backgroundColor: colors.gold,
  },
  consentText: {
    flex: 1,
    color: colors.cream,
    fontSize: 13,
    lineHeight: 19,
  },
});
