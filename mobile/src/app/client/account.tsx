import { router, type Href } from 'expo-router';
import { Alert, Text } from 'react-native';

import {
  WeelloBrand,
  WeelloButton,
  WeelloCard,
  WeelloLegalLinks,
  WeelloScreen,
  weelloText,
} from '@/components/weello-ui';
import { useAuth } from '@/providers/auth-provider';
import { weelloApi } from '@/lib/api';

export default function ClientAccountScreen() {
  const { profile, signOut } = useAuth();
  const confirmDeletion = () => {
    Alert.alert(
      'Supprimer définitivement le compte',
      'Cette action est irréversible et supprimera vos données Weello.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => void weelloApi('delete-account', { method: 'POST' })
            .then(() => signOut())
            .catch((error) => Alert.alert('Suppression impossible', error instanceof Error ? error.message : 'Réessayez plus tard.')),
        },
      ],
    );
  };
  return (
    <WeelloScreen>
      <WeelloBrand subtitle="Mon compte" />
      <WeelloCard>
        <Text style={weelloText.heading}>
          {profile?.full_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
        </Text>
        <Text style={weelloText.body}>{profile?.email}</Text>
        <Text style={weelloText.body}>{profile?.city || 'Ville non renseignée'}</Text>
      </WeelloCard>
      <WeelloButton
        label="Gérer mon adresse de livraison"
        onPress={() => router.push('/client/address')}
      />
      <WeelloButton
        label="Centre d’aide Weello"
        onPress={() => router.push('/support' as Href)}
        secondary
      />
      <WeelloButton label="Se déconnecter" onPress={() => void signOut()} secondary />
      <WeelloButton label="Supprimer définitivement mon compte" onPress={confirmDeletion} secondary />
      <WeelloLegalLinks />
    </WeelloScreen>
  );
}
