import { router } from 'expo-router';
import { Alert, Text } from 'react-native';

import {
  FoodizBrand,
  FoodizButton,
  FoodizCard,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { useAuth } from '@/providers/auth-provider';
import { foodizApi } from '@/lib/api';

export default function ClientAccountScreen() {
  const { profile, signOut } = useAuth();
  const confirmDeletion = () => {
    Alert.alert(
      'Supprimer définitivement le compte',
      'Cette action est irréversible et supprimera vos données Foodiz.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => void foodizApi('delete-account', { method: 'POST' })
            .then(() => signOut())
            .catch((error) => Alert.alert('Suppression impossible', error instanceof Error ? error.message : 'Réessayez plus tard.')),
        },
      ],
    );
  };
  return (
    <FoodizScreen>
      <FoodizBrand subtitle="Mon compte" />
      <FoodizCard>
        <Text style={foodizText.heading}>
          {profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
        </Text>
        <Text style={foodizText.body}>{profile?.email}</Text>
        <Text style={foodizText.body}>{profile?.city || 'Ville non renseignée'}</Text>
      </FoodizCard>
      <FoodizButton
        label="Gérer mon adresse de livraison"
        onPress={() => router.push('/client/address')}
      />
      <FoodizButton label="Se déconnecter" onPress={() => void signOut()} secondary />
      <FoodizButton label="Supprimer définitivement mon compte" onPress={confirmDeletion} secondary />
    </FoodizScreen>
  );
}
