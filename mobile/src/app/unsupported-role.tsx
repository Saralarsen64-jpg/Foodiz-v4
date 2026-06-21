import { Text } from 'react-native';

import {
  FoodizBrand,
  FoodizButton,
  FoodizCard,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { useAuth } from '@/providers/auth-provider';

export default function UnsupportedRoleScreen() {
  const { profile, signOut } = useAuth();
  return (
    <FoodizScreen>
      <FoodizBrand subtitle="Application mobile" />
      <FoodizCard>
        <Text style={foodizText.heading}>Interface web requise</Text>
        <Text style={foodizText.body}>
          Le rôle « {profile?.role || 'inconnu'} » utilise actuellement le portail web
          Foodiz. L’application mobile est réservée aux clients et aux livreurs.
        </Text>
      </FoodizCard>
      <FoodizButton label="Se déconnecter" onPress={() => void signOut()} secondary />
    </FoodizScreen>
  );
}
