import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';

import {
  WeelloBrand,
  WeelloButton,
  WeelloField,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { supabase } from '@/lib/supabase';

function recoveryTokens(url: string | null) {
  if (!url) return null;
  const parameters = new URLSearchParams(
    url
      .split(/[?#]/)
      .slice(1)
      .join('&'),
  );
  const accessToken = parameters.get('access_token');
  const refreshToken = parameters.get('refresh_token');
  return accessToken && refreshToken
    ? { access_token: accessToken, refresh_token: refreshToken }
    : null;
}

export default function ResetPasswordScreen() {
  const url = Linking.useURL();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const tokens = recoveryTokens(url);
    if (!tokens) return;
    void supabase.auth.setSession(tokens).then(({ error }) => {
      if (error) {
        Alert.alert('Lien invalide', 'Demandez un nouveau lien de réinitialisation.');
        return;
      }
      setReady(true);
    });
  }, [url]);

  async function updatePassword() {
    if (password.length < 10 || password !== confirmation) {
      Alert.alert(
        'Mot de passe invalide',
        'Utilisez au moins 10 caractères et saisissez deux fois le même mot de passe.',
      );
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      Alert.alert('Modification impossible', error.message);
      return;
    }
    Alert.alert('Mot de passe modifié', 'Vous pouvez maintenant vous connecter.');
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <WeelloScreen>
      <WeelloBrand subtitle="Sécurité du compte" />
      <Text style={weelloText.title}>Nouveau mot de passe</Text>
      {!ready ? (
        <Text style={weelloText.body}>
          Ouvrez cette page depuis le lien reçu par email. Si le lien a expiré,
          demandez-en un nouveau.
        </Text>
      ) : (
        <>
          <WeelloField
            value={password}
            onChangeText={setPassword}
            placeholder="Nouveau mot de passe"
            secureTextEntry
            textContentType="newPassword"
          />
          <WeelloField
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="Confirmer le mot de passe"
            secureTextEntry
            textContentType="newPassword"
          />
          <WeelloButton
            label="Enregistrer le mot de passe"
            onPress={() => void updatePassword()}
            loading={saving}
          />
        </>
      )}
    </WeelloScreen>
  );
}
