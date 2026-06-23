import { router } from 'expo-router';
import { Alert, Text } from 'react-native';

import {
  FoodizBrand,
  FoodizButton,
  FoodizCard,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { foodizApi } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

export default function PartnerAccountScreen() {
  const { profile, signOut } = useAuth();

  const confirmDeletion = () => {
    Alert.alert(
      'Supprimer définitivement le compte partenaire',
      'Cette action est irréversible et peut supprimer les données de votre établissement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () =>
            void foodizApi('delete-account', { method: 'POST' })
              .then(() => signOut())
              .catch((error) =>
                Alert.alert(
                  'Suppression impossible',
                  error instanceof Error ? error.message : 'Réessayez plus tard.',
                ),
              ),
        },
      ],
    );
  };

  return (
    <FoodizScreen>
      <FoodizBrand subtitle="Compte partenaire" />
      <FoodizCard>
        <Text style={foodizText.heading}>
          {profile?.full_name
          || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
        </Text>
        <Text style={foodizText.body}>{profile?.email}</Text>
        <Text style={foodizText.body}>
          {profile?.city || 'Ville non renseignée'}
        </Text>
      </FoodizCard>
      <FoodizButton
        label="Voir le statut de l’établissement"
        onPress={() => router.push('/partner-status')}
      />
      <FoodizButton
        label="Modifier le dossier partenaire"
        onPress={() => router.push('/partner-onboarding')}
        secondary
      />
      <FoodizButton
        label="Se déconnecter"
        onPress={() => void signOut()}
        secondary
      />
      <FoodizButton
        label="Supprimer définitivement mon compte"
        onPress={confirmDeletion}
        secondary
      />
    </FoodizScreen>
  );
}
