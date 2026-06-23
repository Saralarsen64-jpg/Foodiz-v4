import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import {
  FoodizBrand,
  FoodizButton,
  FoodizCard,
  FoodizScreen,
  foodizText,
} from '@/components/foodiz-ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/colors';
import { updateCourierPresence } from '@/lib/courier-presence';

export default function CourierDashboardScreen() {
  const { profile, session } = useAuth();
  const [applicationStatus, setApplicationStatus] = useState('pending');
  const [documentStatus, setDocumentStatus] = useState('documents_required');
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    void Promise.all([
      supabase
        .from('courier_applications')
        .select('status,document_review_status')
        .eq('user_id', session.user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('courier_online')
        .eq('id', session.user.id)
        .single(),
    ]).then(([application, courierProfile]) => {
      setApplicationStatus(application.data?.status || 'pending');
      setDocumentStatus(application.data?.document_review_status || 'documents_required');
      setOnline(Boolean(courierProfile.data?.courier_online));
    });
  }, [session?.user.id]);

  async function toggleOnline() {
    if (
      !session?.user.id
      || applicationStatus !== 'validated'
      || documentStatus !== 'approved'
    ) {
      Alert.alert(
        'Compte en attente',
        'Votre dossier doit être validé par Foodiz avant de recevoir des livraisons.',
      );
      return;
    }

    const nextOnline = !online;
    try {
      await updateCourierPresence(nextOnline);
    } catch (error) {
      Alert.alert(
        'Mise à jour impossible',
        error instanceof Error ? error.message : 'Position indisponible.',
      );
      return;
    }
    setOnline(nextOnline);
  }

  return (
    <FoodizScreen>
      <FoodizBrand subtitle="Espace livreur" />
      <Text style={foodizText.title}>
        Bonjour {profile?.first_name || 'Livreur'}
      </Text>
      <FoodizCard>
        <Text style={styles.kicker}>STATUT DU DOSSIER</Text>
        <Text style={foodizText.heading}>{applicationStatus}</Text>
        <Text style={foodizText.body}>
          {applicationStatus === 'validated' && documentStatus === 'approved'
            ? 'Votre compte est validé. Passez en ligne pour voir les courses.'
            : 'Foodiz doit vérifier votre dossier et vos documents avant votre première livraison.'}
        </Text>
      </FoodizCard>
      <FoodizButton
        label={online ? 'Passer hors ligne' : 'Passer en ligne'}
        onPress={toggleOnline}
        secondary={online}
      />
    </FoodizScreen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
});
