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
import { weelloApi } from '@/lib/api';
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
            void weelloApi('delete-account', { method: 'POST' })
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
    <WeelloScreen>
      <WeelloBrand subtitle="Compte partenaire" />
      <WeelloCard>
        <Text style={weelloText.heading}>
          {profile?.full_name
          || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()}
        </Text>
        <Text style={weelloText.body}>{profile?.email}</Text>
        <Text style={weelloText.body}>
          {profile?.city || 'Ville non renseignée'}
        </Text>
      </WeelloCard>
      <WeelloButton
        label="Voir le statut de l’établissement"
        onPress={() => router.push('/partner-status')}
      />
      <WeelloButton
        label="Modifier le dossier partenaire"
        onPress={() => router.push('/partner-onboarding')}
        secondary
      />
      <WeelloButton
        label="Centre d’aide Weello"
        onPress={() => router.push('/support' as Href)}
        secondary
      />
      <WeelloButton
        label="Se déconnecter"
        onPress={() => void signOut()}
        secondary
      />
      <WeelloButton
        label="Supprimer définitivement mon compte"
        onPress={confirmDeletion}
        secondary
      />
      <WeelloLegalLinks />
    </WeelloScreen>
  );
}
