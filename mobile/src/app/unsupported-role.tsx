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
          {profile?.role === 'admin'
            ? 'L’administration Foodiz reste volontairement disponible uniquement sur le portail web sécurisé.'
            : `Le compte « ${profile?.role || 'inconnu'} » ne peut pas accéder à cet espace mobile.`}
        </Text>
      </FoodizCard>
      <FoodizButton label="Se déconnecter" onPress={() => void signOut()} secondary />
    </FoodizScreen>
  );
}
