import { Text } from 'react-native';

import {
  WeelloBrand,
  WeelloButton,
  WeelloCard,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { useAuth } from '@/providers/auth-provider';

export default function UnsupportedRoleScreen() {
  const { profile, signOut } = useAuth();
  return (
    <WeelloScreen>
      <WeelloBrand subtitle="Application mobile" />
      <WeelloCard>
        <Text style={weelloText.heading}>Interface web requise</Text>
        <Text style={weelloText.body}>
          {profile?.role === 'admin'
            ? 'L’administration Weello reste volontairement disponible uniquement sur le portail web sécurisé.'
            : `Le compte « ${profile?.role || 'inconnu'} » ne peut pas accéder à cet espace mobile.`}
        </Text>
      </WeelloCard>
      <WeelloButton label="Se déconnecter" onPress={() => void signOut()} secondary />
    </WeelloScreen>
  );
}
