import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  WeelloBrand,
  WeelloButton,
  WeelloField,
  WeelloLegalLinks,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/colors';

export default function SignupScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cguAccepted, setCguAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function signup() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !email.trim() || password.length < 8) {
      Alert.alert(
        'Inscription incomplète',
        'Renseignez vos informations et choisissez un mot de passe de 8 caractères minimum.',
      );
      return;
    }
    if (!cguAccepted) {
      Alert.alert(
        'Consentement requis',
        'Vous devez lire et accepter les CGU et la politique de confidentialité pour créer votre compte.',
      );
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: 'weello://login',
        data: {
          role: 'client',
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`,
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
    <WeelloScreen>
      <WeelloBrand subtitle="Rejoindre Weello" />
      <Text style={weelloText.title}>Créer mon compte</Text>
      <Text style={weelloText.body}>
        Cette inscription mobile est réservée aux clients. Les livreurs déposent leur dossier et leurs justificatifs sur weello.app avant de se connecter ici.
      </Text>

      <WeelloField value={firstName} onChangeText={setFirstName} placeholder="Prénom" autoCapitalize="words" />
      <WeelloField value={lastName} onChangeText={setLastName} placeholder="Nom" autoCapitalize="words" />
      <WeelloField value={city} onChangeText={setCity} placeholder="Ville" autoCapitalize="words" />
      <WeelloField value={phone} onChangeText={setPhone} placeholder="Téléphone" keyboardType="phone-pad" />
      <WeelloField value={email} onChangeText={setEmail} placeholder="Adresse email" keyboardType="email-address" />
      <WeelloField value={password} onChangeText={setPassword} placeholder="Mot de passe (8 caractères minimum)" secureTextEntry />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: cguAccepted }}
        onPress={() => setCguAccepted((current) => !current)}
        style={styles.consent}>
        <View style={[styles.checkbox, cguAccepted && styles.checkboxChecked]}>
          <Text style={styles.checkmark}>{cguAccepted ? '✓' : ''}</Text>
        </View>
        <Text style={styles.consentText}>
          J’accepte les CGU et la politique de confidentialité de Weello.
        </Text>
      </Pressable>
      <WeelloButton label="Créer mon compte" onPress={signup} loading={loading} />
      <Link href="/login" style={styles.link}>
        J’ai déjà un compte
      </Link>
      <WeelloLegalLinks />
    </WeelloScreen>
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
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: colors.gold,
    borderRadius: 6,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: colors.gold,
  },
  checkmark: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '900',
  },
  consentText: {
    color: colors.cream,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
