import { router } from 'expo-router';
import { Text } from 'react-native';

import {
  FoodizBrand,
  FoodizButton,
  FoodizCard,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { useAuth } from '@/providers/auth-provider';

export default function ClientAccountScreen() {
  const { profile, signOut } = useAuth();
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
    </FoodizScreen>
  );
}
