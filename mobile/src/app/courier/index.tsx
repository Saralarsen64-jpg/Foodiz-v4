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

export default function CourierDashboardScreen() {
  const { profile, session } = useAuth();
  const [applicationStatus, setApplicationStatus] = useState('pending');
  const [online, setOnline] = useState(false);

  useEffect(() => {
    if (!session?.user.id) return;
    void Promise.all([
      supabase
        .from('courier_applications')
        .select('status')
        .eq('user_id', session.user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('courier_online')
        .eq('id', session.user.id)
        .single(),
    ]).then(([application, courierProfile]) => {
      setApplicationStatus(application.data?.status || 'pending');
      setOnline(Boolean(courierProfile.data?.courier_online));
    });
  }, [session?.user.id]);

  async function toggleOnline() {
    if (!session?.user.id || applicationStatus !== 'validated') {
      Alert.alert(
        'Compte en attente',
        'Votre dossier doit être validé par Foodiz avant de recevoir des livraisons.',
      );
      return;
    }

    const nextOnline = !online;
    const { error } = await supabase
      .from('profiles')
      .update({ courier_online: nextOnline })
      .eq('id', session.user.id);

    if (error) {
      Alert.alert('Mise à jour impossible', error.message);
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
          {applicationStatus === 'validated'
            ? 'Votre compte est validé. Passez en ligne pour voir les courses.'
            : 'Foodiz doit vérifier votre dossier avant votre première livraison.'}
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
