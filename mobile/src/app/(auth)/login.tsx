import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

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

type PublicRole = 'client' | 'courier' | 'partner';

const ROLE_COPY: Record<PublicRole, {
  title: string;
  subtitle: string;
  body: string;
  wrongRole: string;
}> = {
  client: {
    title: 'Connexion client',
    subtitle: 'Votre table locale, livrée avec soin',
    body: 'Connectez-vous pour commander, suivre vos livraisons et profiter de vos avantages Foodiz.',
    wrongRole: 'Ce compte n’est pas un compte client. Choisissez le bon espace avant de vous connecter.',
  },
  courier: {
    title: 'Connexion livreur',
    subtitle: 'Espace livreur Foodiz',
    body: 'Connectez-vous pour gérer vos courses, votre GPS, vos gains et vos disponibilités.',
    wrongRole: 'Ce compte n’est pas un compte livreur. Les courses sont réservées aux livreurs validés.',
  },
  partner: {
    title: 'Connexion partenaire',
    subtitle: 'Espace partenaire Foodiz',
    body: 'Connectez-vous pour gérer vos commandes, votre carte, vos revenus et votre dossier.',
    wrongRole: 'Ce compte n’est pas un compte partenaire. Choisissez l’espace correspondant à votre compte.',
  },
};

function normalizeRole(role: unknown): PublicRole | null {
  if (role === 'client' || role === 'courier' || role === 'partner') return role;
  return null;
}

export default function LoginScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const selectedRole = normalizeRole(params.role);
  const copy = selectedRole ? ROLE_COPY[selectedRole] : null;
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
    if (selectedRole && data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      if (profile?.role !== selectedRole) {
        await supabase.auth.signOut();
        Alert.alert('Mauvais espace', copy?.wrongRole || 'Choisissez le bon espace Foodiz.');
        return;
      }
    }
    router.replace('/');
  }

  return (
    <FoodizScreen>
      <View style={styles.spacer} />
      <FoodizBrand subtitle={copy?.subtitle || 'L’application locale qui vous régale'} />
      <Text style={foodizText.title}>{copy?.title || 'Connexion'}</Text>
      <Text style={foodizText.body}>
        {copy?.body || 'Accédez à votre espace client, partenaire ou livreur Foodiz.'}
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
      <Link
        href={{
          pathname: '/signup',
          params: selectedRole ? { role: selectedRole } : {},
        }}
        style={styles.link}>
        Créer un compte Foodiz
      </Link>
      <Link href="/welcome" style={styles.secondaryLink}>
        Changer d’espace
      </Link>
      <FoodizLegalLinks />
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
  secondaryLink: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    padding: 8,
  },
});
