import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!email.trim()) {
      Alert.alert('Adresse requise', 'Saisissez votre adresse email.');
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: 'weello://reset-password' },
    );
    setSending(false);
    if (error) {
      Alert.alert('Envoi impossible', error.message);
      return;
    }
    Alert.alert(
      'Email envoyé',
      'Si cette adresse correspond à un compte Weello, vous recevrez un lien sécurisé.',
    );
  }

  return (
    <WeelloScreen>
      <WeelloBrand subtitle="Accès sécurisé" />
      <Text style={weelloText.title}>Mot de passe oublié</Text>
      <Text style={weelloText.body}>
        Recevez un lien sécurisé pour choisir un nouveau mot de passe.
      </Text>
      <WeelloField
        value={email}
        onChangeText={setEmail}
        placeholder="Adresse email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <WeelloButton
        label="Recevoir le lien"
        onPress={() => void send()}
        loading={sending}
      />
      <Link href="/login" style={styles.link}>
        Retour à la connexion
      </Link>
      <WeelloLegalLinks />
    </WeelloScreen>
  );
}

const styles = StyleSheet.create({
  link: {
    color: colors.gold,
    fontWeight: '800',
    padding: 12,
    textAlign: 'center',
  },
});
